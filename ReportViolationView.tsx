import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Car,
  Check,
  CheckCircle2,
  Crosshair,
  FilePlus2,
  ImagePlus,
  Loader2,
  MapPin,
  ScanText,
  Search,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  createTrafficReport,
  normalizePlateNumber,
  type UploadedEvidenceInput,
} from '../lib/firestoreData';
import {
  VIOLATION_CATEGORIES,
  type OcrConfidence,
  type ViolationCategory,
} from '../types/domain';
import { LeafletMapPicker } from './LeafletMapPicker';

interface LocalImageItem {
  id: string;
  file: File;
  previewUrl: string;
  ocrStatus: 'idle' | 'scanning' | 'done' | 'error';
  ocrMessage?: string;
}

interface ReportViolationViewProps {
  onSubmitted: (reportId: string, complaintCode: string) => void;
  onCancel: () => void;
}

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 4;

const STEPS = [
  { id: 1, title: 'Violation Details' },
  { id: 2, title: 'Vehicle Information' },
  { id: 3, title: 'Incident Location' },
  { id: 4, title: 'Upload Evidence' },
  { id: 5, title: 'AI Plate Recognition' },
  { id: 6, title: 'Review and Submit' },
] as const;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Unable to read image file.'));
    reader.readAsDataURL(file);
  });
}

export function ReportViolationView({
  onSubmitted,
  onCancel,
}: ReportViolationViewProps) {
  const { firebaseUser, getIdToken } = useAuth();

  const today = new Date().toISOString().slice(0, 10);
  const nowTime = new Date().toTimeString().slice(0, 5);

  const [step, setStep] = useState<number>(1);

  const [violationType, setViolationType] = useState<ViolationCategory>(
    VIOLATION_CATEGORIES[0]
  );
  const [incidentDate, setIncidentDate] = useState(today);
  const [incidentTime, setIncidentTime] = useState(nowTime);
  const [description, setDescription] = useState('');

  const [vehicleRegNumber, setVehicleRegNumber] = useState('');
  const [plateUnknown, setPlateUnknown] = useState(false);

  const [locationText, setLocationText] = useState('');
  const [latitude, setLatitude] = useState<number>(23.0225);
  const [longitude, setLongitude] = useState<number>(72.5714);
  const [gpsCaptured, setGpsCaptured] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [searchResults, setSearchResults] = useState<
    Array<{ displayName: string; latitude: number; longitude: number }>
  >([]);
  const [searchingLoc, setSearchingLoc] = useState(false);
  const [capturingGps, setCapturingGps] = useState(false);
  const [gpsNotice, setGpsNotice] = useState<string | null>(null);

  const [images, setImages] = useState<LocalImageItem[]>([]);
  const [ocrExtractedPlate, setOcrExtractedPlate] = useState('');
  const [ocrConfidence, setOcrConfidence] = useState<OcrConfidence>('none');
  const [ocrAssessment, setOcrAssessment] = useState<string | null>(null);
  const [ocrConfirmed, setOcrConfirmed] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [submittedConfirmation, setSubmittedConfirmation] = useState<{
    reportId: string;
    complaintCode: string;
  } | null>(null);

  function handleAddImages(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (images.length + files.length > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} photographs allowed per complaint.`);
      e.target.value = '';
      return;
    }

    const next: LocalImageItem[] = [];
    for (const file of files) {
      if (!ALLOWED_TYPES.has(file.type)) {
        setError(`"${file.name}" is not supported. Upload JPEG, PNG, or WEBP images only.`);
        e.target.value = '';
        return;
      }
      if (file.size > MAX_SIZE_BYTES) {
        setError(`"${file.name}" exceeds the 5 MB file size limit.`);
        e.target.value = '';
        return;
      }
      next.push({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        ocrStatus: 'idle',
      });
    }

    setImages((prev) => [...prev, ...next]);
    e.target.value = '';
  }

  function handleRemoveImage(id: string) {
    setImages((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  }

  async function handleRunOcr(imageId: string) {
    const target = images.find((img) => img.id === imageId);
    if (!target) return;

    setError(null);
    setImages((prev) =>
      prev.map((img) =>
        img.id === imageId
          ? { ...img, ocrStatus: 'scanning', ocrMessage: 'Scanning number plate...' }
          : img
      )
    );

    try {
      const token = await getIdToken();
      const base64 = await fileToBase64(target.file);
      const res = await fetch('/api/ocr/extract-plate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: target.file.type,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Number plate OCR failed.');
      }

      const detectedPlate = normalizePlateNumber(data.plateNumber || '');
      const confidence = (data.confidence || 'unreadable') as OcrConfidence;

      setOcrExtractedPlate(detectedPlate);
      setOcrConfidence(confidence);
      setOcrAssessment(
        `${data.qualityIssues ? `${data.qualityIssues} — ` : ''}${data.notes || ''}`
      );
      if (detectedPlate) {
        setVehicleRegNumber(detectedPlate);
        setPlateUnknown(false);
      }
      setOcrConfirmed(false);

      setImages((prev) =>
        prev.map((img) =>
          img.id === imageId
            ? {
                ...img,
                ocrStatus: 'done',
                ocrMessage: detectedPlate
                  ? `Extracted: ${detectedPlate} (${confidence})`
                  : `Unreadable (${data.qualityIssues || 'No plate visible'})`,
              }
            : img
        )
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'OCR extraction failed.';
      setImages((prev) =>
        prev.map((img) =>
          img.id === imageId ? { ...img, ocrStatus: 'error', ocrMessage: msg } : img
        )
      );
      setOcrAssessment(
        `${msg} You may enter the vehicle registration number manually if visible.`
      );
    }
  }

  function handleUseCurrentLocation() {
    setError(null);
    setGpsNotice(null);

    if (!navigator.geolocation) {
      setGpsNotice('Browser geolocation is unavailable. Use location search or click on the map.');
      return;
    }

    setCapturingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Math.round(pos.coords.latitude * 1000000) / 1000000;
        const lng = Math.round(pos.coords.longitude * 1000000) / 1000000;
        setLatitude(lat);
        setLongitude(lng);
        setGpsCaptured(true);
        setGpsNotice(`GPS coordinates locked (${lat.toFixed(5)}, ${lng.toFixed(5)}).`);

        try {
          const res = await fetch(`/api/location/reverse?lat=${lat}&lng=${lng}`);
          const data = await res.json();
          if (data.address) {
            setLocationText(data.address);
          }
        } catch {
          if (!locationText) {
            setLocationText(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          }
        } finally {
          setCapturingGps(false);
        }
      },
      (geoErr) => {
        setCapturingGps(false);
        setGpsNotice(
          geoErr.code === geoErr.PERMISSION_DENIED
            ? 'Location permission denied. Search for the street below or click directly on the map.'
            : 'Unable to acquire GPS fix. Search for the street or click the map to pin the location.'
        );
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  async function handleSearchLocation() {
    if (locationQuery.trim().length < 2) return;
    setSearchingLoc(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/location/search?q=${encodeURIComponent(locationQuery.trim())}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Location search failed.');
      setSearchResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to search location.');
    } finally {
      setSearchingLoc(false);
    }
  }

  async function handleMapPinSelect(lat: number, lng: number) {
    setLatitude(lat);
    setLongitude(lng);
    setGpsCaptured(true);
    setGpsNotice(`Pinned coordinates updated (${lat.toFixed(5)}, ${lng.toFixed(5)}).`);
    try {
      const res = await fetch(`/api/location/reverse?lat=${lat}&lng=${lng}`);
      const data = await res.json();
      if (data.address) {
        setLocationText(data.address);
      }
    } catch {
      // keep existing location text
    }
  }

  function validateStep(targetStep: number): boolean {
    setError(null);
    if (step === 3 && targetStep > 3 && locationText.trim().length < 3) {
      setError('Please enter or select the incident location before continuing.');
      return false;
    }
    if (step === 4 && targetStep > 4 && images.length === 0) {
      setError('Please upload at least one photograph as violation evidence.');
      return false;
    }
    if (
      step === 5 &&
      targetStep > 5 &&
      normalizePlateNumber(vehicleRegNumber).length > 0 &&
      !ocrConfirmed
    ) {
      setError('Please confirm the vehicle registration number using the checkbox.');
      return false;
    }
    return true;
  }

  function goToStep(nextStep: number) {
    if (nextStep < 1 || nextStep > 6) return;
    if (validateStep(nextStep)) {
      setStep(nextStep);
    }
  }

  async function handleSubmit() {
    if (!firebaseUser) return;
    setError(null);

    if (locationText.trim().length < 3) {
      setError('Please provide the incident location in Step 3.');
      setStep(3);
      return;
    }

    if (images.length === 0) {
      setError('Please upload at least one photograph in Step 4.');
      setStep(4);
      return;
    }

    const cleanPlate = plateUnknown ? '' : normalizePlateNumber(vehicleRegNumber);
    if (cleanPlate.length > 0 && !ocrConfirmed) {
      setError('Please confirm the vehicle registration number in Step 5.');
      setStep(5);
      return;
    }

    setSubmitting(true);
    try {
      const token = await getIdToken();

      const rateRes = await fetch('/api/reports/rate-check', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!rateRes.ok) {
        const rateData = await rateRes.json();
        throw new Error(rateData.error || 'Submission rate limit exceeded.');
      }

      const formData = new FormData();
      for (const item of images) {
        formData.append('files', item.file);
      }

      const uploadRes = await fetch('/api/evidence/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadData.error || 'Evidence upload failed.');
      }

      const uploadedFiles = (uploadData.files || []) as UploadedEvidenceInput[];

      const created = await createTrafficReport({
        reporterId: firebaseUser.uid,
        violationType,
        incidentDate,
        incidentTime,
        locationText,
        latitude,
        longitude,
        vehicleRegNumber: cleanPlate,
        ocrExtractedPlate,
        ocrConfidence:
          ocrConfidence !== 'none'
            ? ocrConfidence
            : cleanPlate
              ? 'manual'
              : 'none',
        ocrConfirmed: cleanPlate.length > 0 ? ocrConfirmed : true,
        description,
        evidenceFiles: uploadedFiles,
      });

      images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      setSubmittedConfirmation(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit complaint.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submittedConfirmation) {
    return (
      <div className="max-w-2xl mx-auto bg-white border border-[#E2DFD7] p-8 animate-page-enter">
        <div className="flex items-center gap-3 text-[#166534] mb-4">
          <CheckCircle2 className="w-6 h-6 shrink-0" />
          <h1 className="font-display text-2xl font-bold text-[#171A1D]">
            Violation Report Registered
          </h1>
        </div>
        <p className="text-sm text-[#4B5563] mb-6 leading-relaxed">
          Your complaint, GPS coordinates, and photographic evidence have been securely recorded. Track official review updates in My Reports.
        </p>

        <div className="bg-[#171A1D] text-white p-6 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#92969A]">
              Assigned Complaint ID
            </div>
            <div className="font-mono text-2xl font-bold text-white mt-1">
              {submittedConfirmation.complaintCode}
            </div>
          </div>
          <div className="text-xs font-mono text-[#F15A24]">
            STATUS: SUBMITTED
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() =>
              onSubmitted(
                submittedConfirmation.reportId,
                submittedConfirmation.complaintCode
              )
            }
            className="px-5 py-2.5 bg-[#F15A24] hover:bg-[#D94A17] text-white text-sm font-medium transition-colors cursor-pointer"
          >
            Open Submitted Complaint
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 border border-[#D4D0C8] bg-white hover:bg-[#F5F3EF] text-sm font-medium text-[#171A1D] transition-colors cursor-pointer"
          >
            Return to Overview
          </button>
        </div>
      </div>
    );
  }

  const cleanPlatePreview = plateUnknown ? '' : normalizePlateNumber(vehicleRegNumber);

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.14em] text-[#F15A24] font-semibold">
            Violation Filing Workflow
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#171A1D] mt-1">
            Report a Traffic Violation
          </h1>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-medium text-[#4B5563] hover:text-[#171A1D] underline self-start sm:self-auto cursor-pointer"
        >
          Cancel & Return
        </button>
      </div>

      {/* 6-Section Visual Progression Stepper */}
      <nav aria-label="Report progress" className="bg-white border border-[#E2DFD7] p-2">
        <ol className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1">
          {STEPS.map((s) => {
            const isCurrent = step === s.id;
            const isCompleted = step > s.id;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => goToStep(s.id)}
                  className={`w-full text-left px-3 py-2.5 border transition-colors cursor-pointer ${
                    isCurrent
                      ? 'bg-[#171A1D] text-white border-[#171A1D]'
                      : isCompleted
                        ? 'bg-[#F5F3EF] text-[#171A1D] border-[#D4D0C8] hover:border-[#92969A]'
                        : 'bg-white text-[#6B7280] border-transparent hover:bg-[#F5F3EF]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 text-[10px] font-mono uppercase">
                    <span className={isCurrent ? 'text-[#F15A24]' : ''}>
                      Step 0{s.id}
                    </span>
                    {isCompleted && <Check className="w-3 h-3 text-[#16A34A]" />}
                  </div>
                  <div className="text-xs font-medium truncate mt-0.5">{s.title}</div>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {error && (
        <div className="p-4 bg-[#FEE2E2] border border-[#FCA5A5] text-sm text-[#991B1B] flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Active Step Workspace */}
      <div className="bg-white border border-[#E2DFD7] p-6 sm:p-8">
        {step === 1 && (
          <div className="space-y-6">
            <div className="border-b border-[#E2DFD7] pb-3">
              <h2 className="font-display text-lg font-semibold text-[#171A1D]">
                1. Violation Details
              </h2>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Specify the traffic offense observed, date, time, and context.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-medium text-[#24282C] mb-1">
                  Violation Category *
                </label>
                <select
                  value={violationType}
                  onChange={(e) => setViolationType(e.target.value as ViolationCategory)}
                  className="w-full px-3 py-2.5 text-sm border border-[#D4D0C8] bg-white focus:outline-none focus:border-[#F15A24]"
                >
                  {VIOLATION_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#24282C] mb-1">
                  Date of Incident *
                </label>
                <input
                  type="date"
                  required
                  max={today}
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-[#D4D0C8] bg-white focus:outline-none focus:border-[#F15A24]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#24282C] mb-1">
                  Approximate Time *
                </label>
                <input
                  type="time"
                  required
                  value={incidentTime}
                  onChange={(e) => setIncidentTime(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-[#D4D0C8] bg-white focus:outline-none focus:border-[#F15A24]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#24282C] mb-1">
                Incident Description (Optional)
              </label>
              <textarea
                rows={4}
                maxLength={2000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe lane direction, traffic signal state, or hazard caused."
                className="w-full px-3 py-2.5 text-sm border border-[#D4D0C8] bg-white focus:outline-none focus:border-[#F15A24]"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="border-b border-[#E2DFD7] pb-3">
              <h2 className="font-display text-lg font-semibold text-[#171A1D]">
                2. Vehicle Information
              </h2>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Enter the registration number if already noted, or proceed to upload evidence and extract it using AI OCR in Step 5.
              </p>
            </div>

            <div className="max-w-md space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#24282C] mb-1">
                  Vehicle Registration Number
                </label>
                <div className="relative">
                  <Car className="w-4 h-4 text-[#92969A] absolute left-3 top-3" />
                  <input
                    type="text"
                    disabled={plateUnknown}
                    maxLength={20}
                    value={plateUnknown ? '' : vehicleRegNumber}
                    onChange={(e) => {
                      setVehicleRegNumber(e.target.value.toUpperCase());
                      setOcrConfirmed(false);
                    }}
                    placeholder="e.g. GJ01AB1234"
                    className="w-full pl-9 pr-3 py-2.5 text-sm font-mono uppercase border border-[#D4D0C8] bg-white focus:outline-none focus:border-[#F15A24] disabled:bg-[#F5F3EF]"
                  />
                </div>
              </div>

              <label className="flex items-start gap-2.5 text-xs text-[#4B5563] cursor-pointer">
                <input
                  type="checkbox"
                  checked={plateUnknown}
                  onChange={(e) => {
                    setPlateUnknown(e.target.checked);
                    if (e.target.checked) {
                      setVehicleRegNumber('');
                      setOcrConfirmed(false);
                    }
                  }}
                  className="mt-0.5 accent-[#F15A24]"
                />
                <span>
                  I will extract the plate via AI OCR in Step 5, or the number plate is not visible/readable.
                </span>
              </label>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="border-b border-[#E2DFD7] pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-[#171A1D]">
                  3. Incident Location
                </h2>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Use browser GPS, search by street/junction, or click/drag the orange marker on the map.
                </p>
              </div>
              <button
                type="button"
                disabled={capturingGps}
                onClick={handleUseCurrentLocation}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#171A1D] hover:bg-[#24282C] text-white text-xs font-medium transition-colors disabled:opacity-50 self-start cursor-pointer"
              >
                {capturingGps ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Crosshair className="w-4 h-4 text-[#F15A24]" />
                )}
                <span>{capturingGps ? 'Capturing GPS...' : 'Use Current Location'}</span>
              </button>
            </div>

            {gpsNotice && (
              <div className="p-3 bg-[#F5F3EF] border border-[#E2DFD7] text-xs text-[#24282C]">
                {gpsNotice}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#92969A] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleSearchLocation();
                    }
                  }}
                  placeholder="Search intersection, road, or neighborhood..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-[#D4D0C8] bg-white focus:outline-none focus:border-[#F15A24]"
                />
              </div>
              <button
                type="button"
                disabled={searchingLoc}
                onClick={handleSearchLocation}
                className="px-4 py-2 border border-[#171A1D] bg-white hover:bg-[#F5F3EF] text-xs font-medium text-[#171A1D] transition-colors whitespace-nowrap cursor-pointer"
              >
                {searchingLoc ? 'Searching...' : 'Search Location'}
              </button>
            </div>

            {searchResults.length > 0 && (
              <ul className="border border-[#E2DFD7] divide-y divide-[#E2DFD7] bg-[#F5F3EF]">
                {searchResults.map((res, idx) => (
                  <li key={idx}>
                    <button
                      type="button"
                      onClick={() => {
                        setLatitude(res.latitude);
                        setLongitude(res.longitude);
                        setLocationText(res.displayName);
                        setGpsCaptured(true);
                        setSearchResults([]);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-[#171A1D] hover:bg-white flex items-start gap-2 cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 text-[#F15A24] mt-0.5 shrink-0" />
                      <span>{res.displayName}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <LeafletMapPicker
              latitude={latitude}
              longitude={longitude}
              interactiveSelect
              onSelectCoordinates={handleMapPinSelect}
              heightClassName="h-72"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-[#24282C] mb-1">
                  Location Address / Landmark *
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={300}
                  value={locationText}
                  onChange={(e) => setLocationText(e.target.value)}
                  placeholder="e.g. Pakwan Cross Road, SG Highway"
                  className="w-full px-3 py-2 text-sm border border-[#D4D0C8] bg-white focus:outline-none focus:border-[#F15A24]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#24282C] mb-1">
                  GPS Coordinates {gpsCaptured ? '(Locked)' : '(Map Pin)'}
                </label>
                <div className="px-3 py-2 text-xs font-mono bg-[#F5F3EF] border border-[#E2DFD7] text-[#24282C] tabular-nums">
                  {latitude.toFixed(5)}, {longitude.toFixed(5)}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div className="border-b border-[#E2DFD7] pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-[#171A1D]">
                  4. Upload Evidence
                </h2>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Attach up to 4 JPEG, PNG, or WEBP photographs (max 5 MB each).
                </p>
              </div>
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#F15A24] hover:bg-[#D94A17] text-white text-xs font-medium cursor-pointer transition-colors self-start">
                <ImagePlus className="w-4 h-4" />
                <span>Select Photographs</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleAddImages}
                  className="hidden"
                />
              </label>
            </div>

            {images.length === 0 ? (
              <div className="border border-dashed border-[#D4D0C8] bg-[#F5F3EF] p-10 text-center text-sm text-[#6B7280]">
                No evidence photographs attached yet. Click &ldquo;Select Photographs&rdquo; to upload violation images.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {images.map((item) => (
                  <div
                    key={item.id}
                    className="border border-[#E2DFD7] bg-[#F5F3EF] p-3 space-y-2.5"
                  >
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      className="w-full h-48 object-cover border border-[#E2DFD7]"
                    />
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-medium text-[#171A1D]">
                        {item.file.name}
                      </span>
                      <span className="font-mono text-[#6B7280] shrink-0">
                        {(item.file.size / 1024).toFixed(0)} KB
                      </span>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(item.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 border border-[#D4D0C8] bg-white hover:bg-[#FEE2E2] hover:text-[#991B1B] text-xs text-[#4B5563] transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <div className="border-b border-[#E2DFD7] pb-3">
              <h2 className="font-display text-lg font-semibold text-[#171A1D]">
                5. AI Number Plate Recognition
              </h2>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Run AI OCR on any uploaded photograph to extract the vehicle registration number, then inspect and confirm the text.
              </p>
            </div>

            {images.length === 0 ? (
              <div className="p-6 bg-[#F5F3EF] border border-[#E2DFD7] text-sm text-[#4B5563]">
                No evidence images uploaded yet. Return to Step 4 to add photographs first.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {images.map((item) => (
                  <div
                    key={item.id}
                    className="border border-[#E2DFD7] bg-[#F5F3EF] p-3 space-y-3"
                  >
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      className="w-full h-40 object-cover border border-[#E2DFD7]"
                    />
                    {item.ocrMessage && (
                      <div className="text-xs bg-white border border-[#E2DFD7] p-2.5 text-[#171A1D]">
                        {item.ocrMessage}
                      </div>
                    )}
                    <button
                      type="button"
                      disabled={item.ocrStatus === 'scanning'}
                      onClick={() => handleRunOcr(item.id)}
                      className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-[#171A1D] hover:bg-[#24282C] text-white text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {item.ocrStatus === 'scanning' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F15A24]" />
                      ) : (
                        <ScanText className="w-3.5 h-3.5 text-[#F15A24]" />
                      )}
                      <span>
                        {item.ocrStatus === 'scanning'
                          ? 'Analyzing Image...'
                          : 'Extract Number Plate (AI OCR)'}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {ocrAssessment && (
              <div className="p-3.5 bg-[#F5F3EF] border border-[#E2DFD7] text-xs text-[#171A1D] leading-relaxed">
                <strong className="font-mono uppercase text-[#F15A24]">
                  OCR Assessment ({ocrConfidence}):
                </strong>{' '}
                {ocrAssessment}
              </div>
            )}

            <div className="border-t border-[#E2DFD7] pt-5 grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
              <div>
                <label className="block text-xs font-medium text-[#24282C] mb-1">
                  Vehicle Registration Number (Verify or Edit)
                </label>
                <input
                  type="text"
                  maxLength={20}
                  value={plateUnknown ? '' : vehicleRegNumber}
                  onChange={(e) => {
                    setPlateUnknown(false);
                    setVehicleRegNumber(e.target.value.toUpperCase());
                    setOcrConfirmed(false);
                  }}
                  placeholder="Leave blank if unreadable"
                  className="w-full px-3 py-2.5 text-sm font-mono uppercase border border-[#D4D0C8] bg-white focus:outline-none focus:border-[#F15A24]"
                />
              </div>

              <div className="md:pt-6">
                {cleanPlatePreview.length > 0 ? (
                  <label className="flex items-start gap-2.5 text-xs text-[#24282C] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ocrConfirmed}
                      onChange={(e) => setOcrConfirmed(e.target.checked)}
                      className="mt-0.5 accent-[#F15A24]"
                    />
                    <span>
                      I confirm registration number{' '}
                      <strong className="font-mono text-[#171A1D]">
                        {cleanPlatePreview}
                      </strong>{' '}
                      is accurate based on the photographic evidence.
                    </span>
                  </label>
                ) : (
                  <p className="text-xs text-[#6B7280]">
                    If the plate is blurry or obscured, leave blank and proceed to Review & Submit.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-6">
            <div className="border-b border-[#E2DFD7] pb-3">
              <h2 className="font-display text-lg font-semibold text-[#171A1D]">
                6. Review and Submit
              </h2>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Verify all details before creating the official complaint record.
              </p>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm bg-[#F5F3EF] border border-[#E2DFD7] p-5">
              <div>
                <dt className="text-xs text-[#6B7280]">Violation Category</dt>
                <dd className="font-semibold text-[#171A1D] mt-0.5">{violationType}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#6B7280]">Date & Time</dt>
                <dd className="font-mono text-xs text-[#171A1D] mt-1 tabular-nums">
                  {incidentDate} · {incidentTime}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#6B7280]">Vehicle Registration</dt>
                <dd className="font-mono text-xs font-semibold text-[#171A1D] mt-1">
                  {cleanPlatePreview || 'Not identified / Unreadable'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#6B7280]">Evidence Photographs</dt>
                <dd className="font-mono text-xs text-[#171A1D] mt-1">
                  {images.length} file(s) attached
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-[#6B7280]">Incident Location & GPS</dt>
                <dd className="text-sm text-[#171A1D] mt-0.5">{locationText}</dd>
                <dd className="font-mono text-xs text-[#6B7280] mt-0.5 tabular-nums">
                  {latitude.toFixed(5)}, {longitude.toFixed(5)}
                </dd>
              </div>
              {description && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-[#6B7280]">Additional Description</dt>
                  <dd className="text-xs text-[#24282C] mt-1 leading-relaxed">{description}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* Step Navigation Footer */}
        <div className="mt-8 pt-5 border-t border-[#E2DFD7] flex items-center justify-between gap-4">
          <button
            type="button"
            disabled={step === 1 || submitting}
            onClick={() => goToStep(step - 1)}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-[#D4D0C8] bg-white hover:bg-[#F5F3EF] text-xs font-medium text-[#171A1D] transition-colors disabled:opacity-40 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          {step < 6 ? (
            <button
              type="button"
              onClick={() => goToStep(step + 1)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#171A1D] hover:bg-[#24282C] text-white text-xs font-medium transition-colors cursor-pointer"
            >
              <span>Continue to {STEPS[step].title}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleSubmit()}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#F15A24] hover:bg-[#D94A17] text-white text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FilePlus2 className="w-4 h-4" />
              )}
              <span>{submitting ? 'Submitting Complaint...' : 'Submit Violation Report'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
