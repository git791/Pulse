import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Large limit for base64 images

const extractLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================
// API Routes — Gemini Multimodal Extraction
// ============================================

/**
 * POST /api/extract
 * Extracts activity events from receipt photos or voice transcripts
 * using the Gemini 3.5 Flash multimodal API.
 * 
 * Body: { type: 'photo' | 'voice', data: string }
 *   - photo: base64-encoded image data
 *   - voice: transcribed text from speech
 * 
 * Returns: { events: ActivityEvent[] }
 */
app.post('/api/extract', extractLimiter, async (req, res) => {
  try {
    const { type, data } = req.body;

    if (!type || !data) {
      return res.status(400).json({ error: 'Missing type or data in request body' });
    }

    if (type !== 'photo' && type !== 'voice') {
      return res.status(400).json({ error: 'Invalid type. Must be "photo" or "voice"' });
    }

    if (typeof data !== 'string' || data.length === 0) {
      return res.status(400).json({ error: 'Invalid data. Must be a non-empty string' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'GEMINI_API_KEY not configured. See .env.example for setup instructions.' 
      });
    }

    const systemPrompt = `You convert receipts or spoken activity descriptions into structured activity events for a carbon footprint tracker. Output ONLY a valid JSON array of objects matching this schema:
[{
  "category": "transport" | "food" | "energy" | "consumption",
  "subtype": string,  // e.g. "flight", "beef", "grid_electricity", "clothing"
  "quantity": number, // e.g. miles, kg, kWh
  "unit": string,     // e.g. "miles", "kg", "kWh", "items"
  "confidence": number // 0-1, how confident you are in this extraction
}]

Common subtypes by category:
- transport: car_drive, flight, bus, train, bike, walk
- food: beef, poultry, pork, fish, dairy, vegetables, grains, processed_food
- energy: grid_electricity, natural_gas, heating_oil
- consumption: clothing, electronics, furniture, packaging

If uncertain about quantities, make a reasonable estimate and lower the confidence score. If you cannot extract any activities, return an empty array [].
Do not include any text outside the JSON array.`;

    // Build the Gemini API request
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

    let parts;
    if (type === 'photo') {
      // Multimodal: image + text
      parts = [
        { text: systemPrompt },
        { text: 'Extract all carbon-relevant activities from this receipt/image:' },
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: data, // base64 string
          },
        },
      ];
    } else {
      // Text only: voice transcript
      parts = [
        { text: systemPrompt },
        { text: `Extract all carbon-relevant activities from this spoken description: "${data}"` },
      ];
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      return res.status(502).json({ error: 'Gemini API call failed', details: errorText });
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    
    // Parse the JSON response
    let events;
    try {
      events = JSON.parse(text);
      if (!Array.isArray(events)) events = [events];
    } catch {
      console.error('Failed to parse Gemini response:', text);
      events = [];
    }

    res.json({ events });
  } catch (error) {
    console.error('Extraction error:', error);
    res.status(500).json({ error: 'Internal server error during extraction' });
  }
});

/**
 * Health check endpoint for Cloud Run
 */
app.get('/api/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// ============================================
// Static File Serving (SPA)
// ============================================

// Serve static files from the Vite build output
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback: all non-API GET requests serve index.html
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  } else {
    next();
  }
});

// ============================================
// Start Server
// ============================================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌱 Pulse server running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`   Gemini API: ${process.env.GEMINI_API_KEY ? '✅ configured' : '❌ not configured'}`);
});
