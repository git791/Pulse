import { useState, useCallback, useRef, useEffect, type FC } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Loader2,
  Check,
  Pencil,
  Trash2,
  AlertCircle,
  Volume2,
} from 'lucide-react';
import type { ActivityEvent, Category } from '../../engine/types';
import { generateId } from '../../engine/simulation';
import { extractFromVoice } from '../../services/extraction';

// ─── Web Speech API Types ────────────────────────────────────────────────────

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

type SpeechRecognitionType = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};

function getSpeechRecognition(): SpeechRecognitionType | null {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as SpeechRecognitionType | null;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface ExtractedItem extends Partial<ActivityEvent> {
  _editing?: boolean;
  _editQty?: number;
}

interface VoiceCaptureProps {
  onLog: (event: ActivityEvent) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

const VoiceCapture: FC<VoiceCaptureProps> = ({ onLog }) => {
  const [isSupported] = useState(() => getSpeechRecognition() !== null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ExtractedItem[]>([]);

  const recognitionRef = useRef<InstanceType<SpeechRecognitionType> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  const startRecording = useCallback(() => {
    const SpeechRec = getSpeechRecognition();
    if (!SpeechRec) return;

    setError(null);
    setTranscript('');
    setInterimText('');
    setResults([]);

    const recognition = new SpeechRec();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsRecording(true);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let final = '';
      let interim = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }

      if (final) setTranscript((prev) => prev + final);
      setInterimText(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('[VoiceCapture] Speech error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone permissions and try again.');
      } else if (event.error !== 'aborted') {
        setError(`Speech recognition error: ${event.error}`);
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      setInterimText('');
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
    setInterimText('');
  }, []);

  const handleExtract = useCallback(async () => {
    const text = transcript.trim();
    if (!text) {
      setError('No transcript to analyze. Please record something first.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const events = await extractFromVoice(text);
      if (events.length === 0) {
        setError('No carbon activities detected. Try describing specific activities like "I drove 30 km" or "I had a beef steak".');
      }
      setResults(events);
    } catch {
      setError('Extraction failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [transcript]);

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
        source: 'voice',
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
    recognitionRef.current?.abort();
    setIsRecording(false);
    setTranscript('');
    setInterimText('');
    setResults([]);
    setError(null);
    setLoading(false);
  }, []);

  if (!isSupported) {
    return (
      <div className="bg-base-100 border border-base-300 p-8 rounded-xl flex flex-col items-center gap-4 text-center shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-base-200 flex items-center justify-center">
          <MicOff size={28} className="text-base-content/50" />
        </div>
        <div>
          <h3 className="text-base font-medium text-base-content">
            Voice Capture Unavailable
          </h3>
          <p className="text-sm text-base-content/60 mt-1 max-w-sm">
            Your browser doesn't support the Web Speech API. Try Chrome, Edge, or Safari
            for voice capture, or use the manual log instead.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Microphone Button ── */}
      <div className="bg-base-100 border border-base-300 p-8 rounded-xl flex flex-col items-center gap-6 shadow-sm">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={loading}
          className={`
            relative w-24 h-24 rounded-full flex items-center justify-center
            transition-all duration-300 cursor-pointer border-none
            ${
              isRecording
                ? 'bg-error shadow-[0_0_40px_rgba(239,68,68,0.4)]'
                : 'bg-primary shadow-[0_0_24px_rgba(34,197,94,0.3)] hover:shadow-[0_0_40px_rgba(34,197,94,0.4)]'
            }
          `}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {isRecording && (
            <>
              <span className="absolute inset-0 rounded-full bg-error/30 animate-ping" />
              <span className="absolute inset-[-8px] rounded-full border-2 border-error/40 animate-pulse" />
            </>
          )}

          {isRecording ? (
            <Square size={28} className="text-error-content relative z-10" fill="currentColor" />
          ) : (
            <Mic size={32} className="text-primary-content relative z-10" />
          )}
        </button>

        <div className="text-center">
          <p className="text-sm font-medium text-base-content">
            {isRecording ? 'Listening… tap to stop' : 'Tap to start recording'}
          </p>
          <p className="text-xs text-base-content/60 mt-1">
            {isRecording
              ? 'Describe your activities naturally'
              : '"I drove 30 km to work and had a beef burger for lunch"'}
          </p>
        </div>
      </div>

      {/* ── Live Transcript ── */}
      {(transcript || interimText) && (
        <div className="bg-base-100 border border-base-300 p-4 rounded-xl animate-fade-in shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Volume2
              size={14}
              className={`${isRecording ? 'text-primary animate-pulse' : 'text-base-content/50'}`}
            />
            <span className="text-xs font-medium text-base-content/70">
              Transcript
            </span>
            {transcript && !isRecording && (
              <button onClick={reset} className="btn btn-ghost btn-sm ml-auto text-xs">
                Clear
              </button>
            )}
          </div>
          <p className="text-sm text-base-content leading-relaxed">
            {transcript}
            {interimText && (
              <span className="text-base-content/50 italic">
                {interimText}
              </span>
            )}
            {isRecording && (
              <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse align-middle" />
            )}
          </p>
        </div>
      )}

      {/* ── Extract Button ── */}
      {transcript.trim() && !isRecording && !loading && results.length === 0 && (
        <button onClick={handleExtract} className="btn btn-primary gap-2 animate-fade-in">
          <Check size={16} />
          Extract Activities
        </button>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="bg-base-100 border border-base-300 p-5 rounded-xl space-y-3 shadow-sm">
          <div className="flex items-center gap-3 text-base-content/70">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm font-medium">Analyzing transcript with Gemini…</span>
          </div>
          {[1, 2].map((i) => (
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
            {transcript.trim() && (
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
              <Check size={14} />
              Log All
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
                  <button onClick={() => toggleEdit(item.id)} className="btn btn-ghost btn-circle btn-sm">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => confirmEvent(item)} className="btn btn-ghost btn-circle btn-sm text-primary">
                    <Check size={14} />
                  </button>
                  <button onClick={() => discardEvent(item.id)} className="btn btn-ghost btn-circle btn-sm text-error">
                    <Trash2 size={14} />
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

export default VoiceCapture;
