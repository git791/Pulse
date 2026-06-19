/**
 * @module services/extraction
 * @description Unified extraction service for the multimodal capture pipeline.
 *
 * Calls the server proxy at `/api/extract` which holds the Gemini API key.
 * Both photo and voice paths normalise responses into ActivityEvent-compatible
 * partial objects that the UI can confirm/edit before final persistence.
 */

import type { ActivityEvent, Category, CaptureSource } from '../engine/types';
import { computeCo2ForActivity, generateId } from '../engine/simulation';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Raw shape returned by the Gemini extraction prompt. */
interface GeminiExtractedItem {
  category: Category;
  subtype: string;
  quantity: number;
  unit: string;
  confidence: number;
}

/** Server response envelope. */
interface ExtractionResponse {
  events?: GeminiExtractedItem[];
  error?: string;
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

/**
 * POST to the server extraction proxy and return the raw items.
 */
async function callExtractionProxy(
  type: 'photo' | 'voice',
  data: string,
): Promise<GeminiExtractedItem[]> {
  const res = await fetch('/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, data }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[extraction] Proxy returned ${res.status}:`, body);
    throw new Error(`Extraction failed (${res.status})`);
  }

  const json: ExtractionResponse = await res.json();

  if (json.error) {
    throw new Error(json.error);
  }

  return json.events ?? [];
}

/**
 * Transform raw Gemini items into fully-hydrated partial ActivityEvents.
 */
function hydrateEvents(
  items: GeminiExtractedItem[],
  source: CaptureSource,
): Partial<ActivityEvent>[] {
  return items.map((item) => ({
    id: generateId(),
    timestamp: new Date().toISOString(),
    category: item.category,
    subtype: item.subtype,
    quantity: item.quantity,
    unit: item.unit,
    co2_kg: computeCo2ForActivity(item.subtype, item.quantity),
    source,
    confidence: Math.max(0, Math.min(1, item.confidence)),
  }));
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Extract carbon activities from a receipt / photo.
 *
 * @param base64Data - Base64-encoded image data (no `data:` prefix needed;
 *                     the server handles the MIME type).
 * @returns Partial ActivityEvents — the UI should let the user confirm before logging.
 */
export async function extractFromPhoto(
  base64Data: string,
): Promise<Partial<ActivityEvent>[]> {
  try {
    const items = await callExtractionProxy('photo', base64Data);
    return hydrateEvents(items, 'photo');
  } catch (err) {
    console.error('[extraction] Photo extraction failed:', err);
    return [];
  }
}

/**
 * Extract carbon activities from a voice transcript.
 *
 * @param transcript - Plain-text transcript from the Web Speech API.
 * @returns Partial ActivityEvents — the UI should let the user confirm before logging.
 */
export async function extractFromVoice(
  transcript: string,
): Promise<Partial<ActivityEvent>[]> {
  try {
    const items = await callExtractionProxy('voice', transcript);
    return hydrateEvents(items, 'voice');
  } catch (err) {
    console.error('[extraction] Voice extraction failed:', err);
    return [];
  }
}
