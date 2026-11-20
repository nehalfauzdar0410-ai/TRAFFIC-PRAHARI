import { useEffect, useState } from 'react';
import { FileImage, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ProtectedImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function ProtectedImage({ src, alt, className = '' }: ProtectedImageProps) {
  const { getIdToken } = useAuth();
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const token = await getIdToken();
        const res = await fetch(src, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const blob = await res.blob();
        createdUrl = URL.createObjectURL(blob);
        if (active) {
          setObjectUrl(createdUrl);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to load evidence');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [src, getIdToken]);

  if (loading) {
    return (
      <div className={`bg-[#F3F1EC] border border-[#E2DFD7] flex items-center justify-center text-xs text-[#6B7280] ${className}`}>
        <FileImage className="w-4 h-4 mr-2 opacity-60" />
        Loading protected evidence...
      </div>
    );
  }

  if (error || !objectUrl) {
    return (
      <div className={`bg-[#F3F1EC] border border-[#E2DFD7] flex flex-col items-center justify-center p-4 text-center text-xs text-[#6B7280] ${className}`}>
        <ShieldAlert className="w-5 h-5 mb-1.5 text-[#D9531E]" />
        <span>Protected evidence unavailable ({error || 'Access restricted'})</span>
      </div>
    );
  }

  return (
    <img
      src={objectUrl}
      alt={alt}
      referrerPolicy="no-referrer"
      className={className}
    />
  );
}
