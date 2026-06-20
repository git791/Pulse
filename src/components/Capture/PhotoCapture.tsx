import { useState, useCallback, useRef, type FC, type DragEvent } from 'react';
import {
  Camera,
  Upload,
  Image as ImageIcon,
  Loader2,
  Check,
  X,
  Pencil,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import type { ActivityEvent, Category } from '../../engine/types';
import { generateId } from '../../engine/simulation';
import { extractFromPhoto } from '../../services/extraction';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ExtractedItem extends Partial<ActivityEvent> {
  _editing?: boolean;
  _editQty?: number;
}

interface PhotoCaptureProps {
  onLog: (event: ActivityEvent) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] ?? result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'text-success bg-success/10',
  medium: 'text-warning bg-warning/10',
  low: 'text-error bg-error/10',
};

function confidenceLevel(c: number): 'high' | 'medium' | 'low' {
  if (c >= 0.8) return 'high';
  if (c >= 0.5) return 'medium';
  return 'low';
}

const CATEGORY_BADGE: Record<Category, string> = {
  transport: 'badge badge-info badge-outline',
  food: 'badge badge-warning badge-outline',
  energy: 'badge badge-secondary badge-outline',
  consumption: 'badge badge-accent badge-outline',
};

// ─── Component ───────────────────────────────────────────────────────────────

const PhotoCapture: FC<PhotoCaptureProps> = ({ onLog }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [base64, setBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ExtractedItem[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10 MB.');
      return;
    }

    setError(null);
    setResults([]);
    setPreview(URL.createObjectURL(file));

    try {
      const b64 = await fileToBase64(file);
      setBase64(b64);
    } catch {
      setError('Failed to read image file.');
    }
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleExtract = useCallback(async () => {
    if (!base64) return;
    setLoading(true);
    setError(null);

    try {
      const events = await extractFromPhoto(base64);
      if (events.length === 0) {
        setError('No carbon activities detected in this image. Try a receipt or grocery photo.');
      }
      setResults(events);
    } catch {
      setError('Extraction failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [base64]);

  const confirmEvent = useCallback(
    (item: ExtractedItem) => {
      const event: ActivityEvent = {
        id: item.id ?? generateId(),
        timestamp: item.timestamp ?? new Date().toISOString(),
        category: item.category ?? 'consumption',
        subtype: item.subtype ?? 'unknown',
        quantity: item._editing ? (item._editQty ?? item.quantity ?? 0) : (item.quantity ?? 0),
        unit: item.unit ?? 'units',
        co2_kg: item.co2_kg ?? 0,
        source: 'photo',
        confidence: item.confidence ?? 0.5,
      };
      onLog(event);
      setResults((prev) => prev.filter((r) => r.id !== item.id));
    },
    [onLog],
  );

  const discardEvent = useCallback((id: string | undefined) => {
    if (!id) return;
    setResults((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const toggleEdit = useCallback((id: string | undefined) => {
    if (!id) return;
    setResults((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, _editing: !r._editing, _editQty: r.quantity } : r,
      ),
    );
  }, []);

  const updateEditQty = useCallback((id: string | undefined, qty: number) => {
    if (!id) return;
    setResults((prev) =>
      prev.map((r) => (r.id === id ? { ...r, _editQty: qty } : r)),
    );
  }, []);

  const reset = useCallback(() => {
    setPreview(null);
    setBase64(null);
    setResults([]);
    setError(null);
    setLoading(false);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {/* ── Upload Area ── */}
      {!preview && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            bg-base-100 flex flex-col items-center justify-center gap-4
            p-10 rounded-xl cursor-pointer transition-all duration-200
            border-dashed border-2
            ${
              dragOver
                ? 'border-primary bg-primary/10'
                : 'border-base-300 hover:border-base-content/50 hover:bg-base-200/50'
            }
          `}
        >
          <div className="w-16 h-16 rounded-2xl bg-base-200 flex items-center justify-center">
            <Upload size={28} className="text-base-content/50" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-base-content">
              Drop a receipt or photo here
            </p>
            <p className="text-xs text-base-content/60 mt-1">
              or click to browse · JPEG, PNG up to 10 MB
            </p>
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

          <div className="flex gap-2 mt-2">
            <button
              onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }}
              className="btn btn-outline btn-sm gap-1.5"
            >
              <Camera size={14} /> Take Photo
            </button>
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
          </div>
        </div>
      )}

      {/* ── Image Preview ── */}
      {preview && (
        <div className="bg-base-100 border border-base-300 rounded-xl overflow-hidden animate-fade-in shadow-sm">
          <div className="relative">
            <img src={preview} alt="Receipt preview" className="w-full max-h-64 object-cover" />
            <button
              onClick={reset}
              className="absolute top-3 right-3 btn btn-ghost btn-sm btn-circle bg-base-300/50 backdrop-blur-sm hover:bg-base-300"
              aria-label="Remove image"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-4 flex gap-2">
            {!loading && results.length === 0 && (
              <button onClick={handleExtract} className="btn btn-primary flex-1 gap-2" disabled={!base64}>
                <ImageIcon size={16} /> Extract Activities
              </button>
            )}
            <button onClick={reset} className="btn btn-ghost btn-sm">
              Choose Different
            </button>
          </div>
        </div>
      )}

      {/* ── Loading Shimmer ── */}
      {loading && (
        <div className="bg-base-100 border border-base-300 p-5 rounded-xl space-y-3 shadow-sm">
          <div className="flex items-center gap-3 text-base-content/70">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm font-medium">Analyzing with Gemini…</span>
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-base-300 h-14 rounded-lg" />
          ))}
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="bg-error/10 border border-error/30 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
          <AlertCircle size={18} className="text-error shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-base-content">{error}</p>
            {base64 && (
              <button onClick={handleExtract} className="btn btn-ghost btn-sm mt-2 text-error">
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Extracted Results ── */}
      {results.length > 0 && (
        <div className="space-y-2 animate-slide-up">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-medium text-base-content/70">
              Extracted Activities ({results.length})
            </h3>
            <button
              onClick={() => results.forEach((r) => confirmEvent(r))}
              className="btn btn-primary btn-sm gap-1.5"
            >
              <Check size={14} /> Log All
            </button>
          </div>

          {results.map((item) => {
            const level = confidenceLevel(item.confidence ?? 0);
            return (
              <div key={item.id} className="bg-base-100 border border-base-300 p-4 rounded-xl flex items-center gap-3 animate-fade-in shadow-sm">
                <span className={CATEGORY_BADGE[item.category as Category] ?? 'badge'}>
                  {item.category}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-base-content truncate">
                    {item.subtype?.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-base-content/60 mt-0.5">
                    {item._editing ? (
                      <input
                        type="number"
                        value={item._editQty ?? item.quantity}
                        onChange={(e) => updateEditQty(item.id, parseFloat(e.target.value) || 0)}
                        className="input input-sm input-bordered !w-20 !h-6 !p-1 !text-xs inline"
                        step="any"
                      />
                    ) : (
                      <>{item.quantity}</>
                    )}{' '}
                    {item.unit} · {item.co2_kg} kg CO₂
                  </p>
                </div>

                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CONFIDENCE_COLORS[level]}`}>
                  {Math.round((item.confidence ?? 0) * 100)}%
                </span>

                <div className="flex gap-1">
                  <button onClick={() => toggleEdit(item.id)} className="btn btn-ghost btn-circle btn-sm" aria-label="Edit event">
                    <Pencil size={14} aria-hidden="true" />
                  </button>
                  <button onClick={() => confirmEvent(item)} className="btn btn-ghost btn-circle btn-sm text-primary" aria-label="Confirm event">
                    <Check size={14} aria-hidden="true" />
                  </button>
                  <button onClick={() => discardEvent(item.id)} className="btn btn-ghost btn-circle btn-sm text-error" aria-label="Discard event">
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PhotoCapture;
