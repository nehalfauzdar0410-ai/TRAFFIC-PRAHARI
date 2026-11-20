import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  requireAuth,
  type AuthenticatedRequest,
} from './src/server/authMiddleware.ts';
import { lookupVehicleChallans } from './src/server/challanService.ts';
import { extractVehiclePlateFromImage } from './src/server/ocrService.ts';
import {
  findNearbyTrafficPoliceStations,
  reverseGeocodeCoordinates,
  searchLocationsByQuery,
} from './src/server/stationsService.ts';

const PORT = Number(process.env.PORT) || 3000;
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const SIGNING_SECRET =
  process.env.EVIDENCE_SIGNING_SECRET &&
  process.env.EVIDENCE_SIGNING_SECRET !== 'CHANGE_ME_IN_PRODUCTION'
    ? process.env.EVIDENCE_SIGNING_SECRET
    : crypto.createHash('sha256').update(process.env.APP_URL || 'taffic-prahari-local-key').digest('hex');

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// Sliding window rate limiter per user UID
const rateBuckets = new Map<string, number[]>();
function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = (rateBuckets.get(key) || []).filter((t) => now - t < windowMs);
  if (timestamps.length >= maxRequests) {
    rateBuckets.set(key, timestamps);
    return false;
  }
  timestamps.push(now);
  rateBuckets.set(key, timestamps);
  return true;
}

function hasValidImageSignature(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 12) return false;
  if (mimeType === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === 'image/png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }
  if (mimeType === 'image/webp') {
    return (
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
  return false;
}

function signEvidenceAccess(fileId: string, ownerUid: string): string {
  return crypto
    .createHmac('sha256', SIGNING_SECRET)
    .update(`${fileId}:${ownerUid}`)
    .digest('hex');
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 4,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new Error('Unsupported file type. Only JPEG, PNG, and WEBP images are allowed.'));
      return;
    }
    cb(null, true);
  },
});

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'taffic-prahari' });
  });

  // Protected: Rate limit check before creating a complaint
  app.post('/api/reports/rate-check', requireAuth, (req: AuthenticatedRequest, res) => {
    const uid = req.user?.uid;
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const allowed = checkRateLimit(`report:${uid}`, 5, 10 * 60 * 1000);
    if (!allowed) {
      res.status(429).json({
        error: 'Rate limit exceeded: Maximum 5 violation reports allowed every 10 minutes. Please wait before submitting again.',
      });
      return;
    }
    res.json({ allowed: true });
  });

  // Protected: Secure evidence image upload
  app.post(
    '/api/evidence/upload',
    requireAuth,
    (req, res, next) => {
      upload.array('files', 4)(req, res, (err) => {
        if (err) {
          res.status(400).json({ error: err.message || 'Invalid file upload.' });
          return;
        }
        next();
      });
    },
    (req: AuthenticatedRequest, res) => {
      const uid = req.user?.uid;
      if (!uid) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!checkRateLimit(`upload:${uid}`, 12, 10 * 60 * 1000)) {
        res.status(429).json({
          error: 'Upload rate limit reached. Please wait a few minutes before uploading more evidence.',
        });
        return;
      }

      const files = req.files as Express.Multer.File[] | undefined;
      if (!files || files.length === 0) {
        res.status(400).json({ error: 'No evidence image files provided.' });
        return;
      }

      const uploadedRecords = [];

      for (const file of files) {
        if (!hasValidImageSignature(file.buffer, file.mimetype)) {
          res.status(400).json({
            error: `File "${file.originalname}" failed image signature verification. Please upload a genuine JPEG, PNG, or WEBP photograph.`,
          });
          return;
        }

        const ext =
          file.mimetype === 'image/png'
            ? '.png'
            : file.mimetype === 'image/webp'
              ? '.webp'
              : '.jpg';
        const fileId = `${Date.now()}-${crypto.randomUUID()}${ext}`;
        const destPath = path.join(UPLOAD_DIR, fileId);
        fs.writeFileSync(destPath, file.buffer);

        const sig = signEvidenceAccess(fileId, uid);
        uploadedRecords.push({
          fileId,
          fileName: file.originalname.slice(0, 180),
          mimeType: file.mimetype,
          fileSize: file.size,
          evidenceUrl: `/api/evidence/${encodeURIComponent(fileId)}?owner=${encodeURIComponent(uid)}&sig=${sig}`,
        });
      }

      res.status(201).json({ files: uploadedRecords });
    }
  );

  // Protected: Serve uploaded evidence image only to owner or authorized admin
  app.get('/api/evidence/:fileId', requireAuth, (req: AuthenticatedRequest, res) => {
    const fileId = path.basename(req.params.fileId || '');
    const owner = String(req.query.owner || '');
    const sig = String(req.query.sig || '');

    if (!fileId || !owner || !sig) {
      res.status(400).json({ error: 'Missing evidence access parameters.' });
      return;
    }

    const expectedSig = signEvidenceAccess(fileId, owner);
    const sigBuffer = Buffer.from(sig);
    const expectedBuffer = Buffer.from(expectedSig);
    if (
      sigBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      res.status(403).json({ error: 'Invalid evidence access signature.' });
      return;
    }

    const isOwner = req.user?.uid === owner;
    const isAdmin =
      req.user?.email === BOOTSTRAPPED_ADMIN_EMAIL &&
      req.user?.email_verified === true;

    if (!isOwner && !isAdmin) {
      res.status(403).json({ error: 'Access denied to this complaint evidence.' });
      return;
    }

    const targetPath = path.join(UPLOAD_DIR, fileId);
    if (!fs.existsSync(targetPath)) {
      res.status(404).json({ error: 'Evidence file not found on storage.' });
      return;
    }

    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.sendFile(targetPath);
  });

  // Protected: AI Vehicle Number Plate Extraction (OCR via Gemini)
  app.post('/api/ocr/extract-plate', requireAuth, async (req: AuthenticatedRequest, res) => {
    const uid = req.user?.uid;
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!checkRateLimit(`ocr:${uid}`, 15, 10 * 60 * 1000)) {
      res.status(429).json({ error: 'OCR rate limit reached. Please wait a few minutes or enter the plate manually.' });
      return;
    }

    const { imageBase64, mimeType } = req.body as {
      imageBase64?: string;
      mimeType?: string;
    };

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      res.status(400).json({ error: 'Missing imageBase64 payload.' });
      return;
    }

    const safeMime = ALLOWED_MIME_TYPES.has(mimeType || '') ? String(mimeType) : 'image/jpeg';

    try {
      const result = await extractVehiclePlateFromImage(imageBase64, safeMime);
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'OCR processing failed.';
      console.error('OCR extraction error:', err);
      res.status(502).json({ error: message });
    }
  });

  // Protected: Modular Challan Lookup (Authorized API hook or clearly labelled Demo mode)
  app.get('/api/challans/lookup', requireAuth, async (req, res) => {
    const plate = String(req.query.plate || '').trim().toUpperCase();
    if (!plate || !/^[A-Z0-9-]{4,20}$/.test(plate)) {
      res.status(400).json({ error: 'Invalid vehicle registration number format.' });
      return;
    }

    try {
      const result = await lookupVehicleChallans(plate);
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Challan lookup failed.';
      res.status(502).json({ error: message });
    }
  });

  // Location Search (Nominatim proxy)
  app.get('/api/location/search', async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) {
      res.status(400).json({ error: 'Please enter at least 2 characters to search.' });
      return;
    }

    try {
      const results = await searchLocationsByQuery(q);
      res.json({ results });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Location search failed.';
      res.status(502).json({ error: message });
    }
  });

  // Reverse Geocode (Nominatim proxy)
  app.get('/api/location/reverse', async (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      res.status(400).json({ error: 'Valid numeric lat and lng are required.' });
      return;
    }

    try {
      const address = await reverseGeocodeCoordinates(lat, lng);
      res.json({ address });
    } catch {
      res.json({ address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
    }
  });

  // Nearby Traffic Police Assistance (OpenStreetMap Overpass proxy)
  app.get('/api/stations/nearby', async (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      res.status(400).json({ error: 'Valid GPS latitude and longitude are required.' });
      return;
    }

    try {
      const data = await findNearbyTrafficPoliceStations(lat, lng);
      res.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to query nearby police stations.';
      res.status(502).json({ error: message });
    }
  });

  // Vite / Static SPA Middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TAFFIC-PRAHARI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
