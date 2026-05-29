import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Gemini API parser endpoint
app.post('/api/parse-annexure', async (req, res) => {
  const { textItems, brandName, mode, apiKey } = req.body;
  const geminiKey = apiKey || process.env.GEMINI_API_KEY;

  if (!geminiKey) {
    return res.status(400).send('Gemini API Key is not configured on the server.');
  }

  const fullText = (textItems || []).join(' ');

  let targetInstruction = '';
  if (mode === 'commission') {
    targetInstruction = `Your task is to extract all Platform Commission slabs from the text for the brand: "${brandName}".
Do NOT extract Fixed Fee slabs. Only extract from the Platform Commission / Commission rates grid or section.
If there are general default rules (e.g. Article Type is "ALL" or "Default"), extract them.
All returned rules should have fixedFee set to 0.`;
  } else {
    targetInstruction = `Your task is to extract all Fixed Fee slabs from the text for the brand: "${brandName}".
Do NOT extract Platform Commission slabs. Only extract from the Fixed Fee grid or section.
Do NOT include general default rules (like Article Type "ALL" with 0 commission) that belong to the commission table.
All returned rules should have commissionPercent set to 0.`;
  }

  const prompt = `You are an expert data parser. You are given the raw extracted text from a Myntra Commercial Terms Agreement (CTA) PDF annexure.
${targetInstruction}

Return a JSON array of objects conforming to the following TypeScript interface:
interface FeeRule {
  brand: string; // The brand/party name, i.e., "${brandName}"
  category: string; // e.g. "Apparel", "Accessories", etc.
  articleType: string; // e.g. "ALL", "Shirts", "Dresses", "Tshirts", etc. (Must match the article type name from the relevant grid. For Fixed Fee, do NOT include "ALL" unless it is explicitly in the Fixed Fee table)
  gender: string; // "Men", "Women", "Unisex", "Boys", "Girls"
  lowerLimit: number; // The lower price limit of the slab (minimum 0)
  upperLimit: number; // The upper price limit of the slab. Use Infinity (or a large number like 100000000) for no upper limit (e.g. >2000 or 2000+)
  commissionPercent: number; // The commission percentage for this slab (e.g. 1.5 for 1.5%, 0 for 0%)
  fixedFee: number; // The fixed fee amount in Rs. for this slab (e.g. 27 for Rs. 27, 0 if 0 or not specified)
}

Notes:
1. Extract only the slabs relevant to the requested mode as instructed above.
2. Keep the matching exact and complete. Extract all slabs mentioned in the relevant grid of the text.
3. Return ONLY a valid JSON array. Do not wrap in markdown or any other text. Just the raw JSON.

Raw PDF Text:
${fullText}`;

  const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  let lastError = null;

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        })
      });

      if (response.status === 404) {
        lastError = new Error(`Model ${model} returned 404`);
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        lastError = new Error(`Gemini API Error (${model}): ${response.status} - ${errorText}`);
        continue;
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error(`No text returned from Gemini API using model ${model}`);
      }

      const rules = JSON.parse(text);
      
      // Post-process rules (ensure limits and types are correct)
      const formattedRules = rules.map(r => ({
        ...r,
        brand: brandName,
        lowerLimit: Number(r.lowerLimit) || 0,
        upperLimit: r.upperLimit === null || String(r.upperLimit) === 'Infinity' || Number(r.upperLimit) >= 10000000 ? Infinity : Number(r.upperLimit),
        commissionPercent: Number(r.commissionPercent) || 0,
        fixedFee: Number(r.fixedFee) || 0
      }));

      return res.json({ rules: formattedRules });
    } catch (err) {
      lastError = err;
    }
  }

  return res.status(500).send(lastError ? lastError.message : 'All Gemini models failed to parse the PDF.');
});

// Serve static files from React build directory
app.use(express.static(path.join(__dirname, 'dist')));

// Serve index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
