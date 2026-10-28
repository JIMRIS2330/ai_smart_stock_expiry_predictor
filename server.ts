import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Server-side Gemini AI route for stock expiry copilot & root-cause analysis
app.post('/api/ai-chat', async (req, res) => {
  try {
    const { prompt, inventorySummary } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(200).json({ reply: null, note: 'No GEMINI_API_KEY configured' });
    }

    const ai = new GoogleGenAI({});
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `You are an AI Smart Stock Expiry Predictor, biochemist, and supply-chain logistics engineer.
Warehouse Live Inventory Telemetry:
${JSON.stringify(inventorySummary, null, 2)}

User Query: "${prompt}"

Provide a concise, direct, professional response with:
1. Exact batches at imminent risk.
2. Biochemical root cause (e.g. Q10 thermal acceleration, ethylene ripening, bacterial proliferation, lipid peroxidation).
3. Recommended resolution (dynamic markdown discount %, expedited FIFO dispatch, or temperature correction).
Keep your answer scannable, under 160 words, using bold markers and clean bullets.`,
    });

    const reply = response.text || '';
    res.json({ reply });
  } catch (err: any) {
    console.error('Gemini API Error in /api/ai-chat:', err);
    res.status(200).json({ reply: null, error: err.message });
  }
});

// Single batch deep-dive prediction endpoint
app.post('/api/predict-spoilage', async (req, res) => {
  try {
    const { batch } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(200).json({ prediction: null });
    }

    const ai = new GoogleGenAI({});
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Analyze this perishable stock batch:
Product: ${batch.name} (${batch.category})
Current Temp: ${batch.telemetry?.currentTemp}°C (Target: ${batch.telemetry?.targetTemp}°C)
Humidity: ${batch.telemetry?.humidity}%
Cold Chain Breach: ${batch.telemetry?.coldChainBreachMinutes} minutes
Remaining Nominal Days: ${batch.remainingDaysOriginal}

Output JSON with keys:
- "predictedRemainingDays": number
- "biochemicalPathway": string (short 1-sentence scientific reason)
- "recommendedDiscountPct": number (0 to 60)
- "reasoning": string`,
    });

    res.json({ text: response.text });
  } catch (err: any) {
    res.status(200).json({ error: err.message });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Smart Stock Expiry server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
