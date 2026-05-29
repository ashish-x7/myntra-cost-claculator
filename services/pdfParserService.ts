import { FeeRule } from '../types';

/**
 * Parses the raw text extracted from the PDF and converts it into FeeRule objects.
 * This is tailored specifically for the standard Myntra Annexure format.
 */
export const parseMyntraAnnexureText = (
  textItems: string[], 
  brandName: string,
  mode: 'commission' | 'fixed_fee'
): FeeRule[] => {
  const rules: FeeRule[] = [];
  const fullText = textItems.join(' ');

  if (mode === 'commission') {
    // 1. Extract Commission Rates
    const commRegex = /(Apparel|Free Items|Accessories)\s+([\w\s-/]+?)\s+(Men|Women|Unisex|Boys|Girls)\s+(\d+)\s+(\d+|100000000|10000000)\s+[\w\s&]+?\s+([\d.]+)\s*%/gi;
    
    let commMatch;
    while ((commMatch = commRegex.exec(fullText)) !== null) {
      const category = commMatch[1].trim();
      const articleType = commMatch[2].trim();
      const gender = commMatch[3].trim();
      const lowerLimit = parseFloat(commMatch[4]);
      const upperLimit = parseFloat(commMatch[5]);
      const rate = parseFloat(commMatch[6]);

      rules.push({
        brand: brandName,
        category,
        articleType,
        gender,
        lowerLimit,
        upperLimit: (upperLimit === 100000000 || upperLimit === 10000000) ? Infinity : upperLimit,
        commissionPercent: rate,
        fixedFee: 0
      });
    }
  } else {
    // 2. Extract Fixed Fees
    const fixedFeeStartIndex = fullText.indexOf('Fixed Fee');
    if (fixedFeeStartIndex !== -1) {
      const fixedFeeText = fullText.substring(fixedFeeStartIndex);
      const fixedRegex = /(Apparel|Free Items|Accessories)\s+([\w\s-/]+?)\s+(Men|Women|Unisex|Boys|Girls)\s+(\d+)\s+(\d+|100000000|10000000)\s+([\d.]+)/gi;
      
      let fixedMatch;
      while ((fixedMatch = fixedRegex.exec(fixedFeeText)) !== null) {
        const category = fixedMatch[1].trim();
        const articleType = fixedMatch[2].trim();
        const gender = fixedMatch[3].trim();
        const lowerLimit = parseFloat(fixedMatch[4]);
        const upperLimit = parseFloat(fixedMatch[5]);
        const fee = parseFloat(fixedMatch[6]);

        rules.push({
          brand: brandName,
          category,
          articleType,
          gender,
          lowerLimit,
          upperLimit: (upperLimit === 100000000 || upperLimit === 10000000) ? Infinity : upperLimit,
          commissionPercent: 0,
          fixedFee: fee
        });
      }
    }
  }

  return rules;
};

/**
 * Parses the raw text using Google's Gemini API to extract commission and fixed fee rules structured as FeeRule objects.
 */
export const parseMyntraAnnexureWithGemini = async (
  textItems: string[],
  brandName: string,
  apiKey: string,
  mode: 'commission' | 'fixed_fee'
): Promise<FeeRule[]> => {
  const fullText = textItems.join(' ');

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
  let lastError: any = null;

  for (const model of modelsToTry) {
    console.log(`Gemini API: Trying request with model: ${model}...`);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
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

      console.log(`Gemini API: Model ${model} response status:`, response.status);

      if (response.status === 404) {
        console.warn(`Gemini API: Model ${model} returned 404. Trying next model...`);
        lastError = new Error(`Model ${model} returned 404 (Not Found)`);
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Gemini API: Model ${model} error response details:`, errorText);
        lastError = new Error(`Gemini API Error (${model}): ${response.status} - ${errorText}`);
        continue;
      }

      const data = await response.json();
      console.log(`Gemini API: Model ${model} successfully returned data.`);
      
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error(`No text returned from Gemini API using model ${model}`);
      }

      console.log(`Gemini API: Extracted Text Content from ${model}:`, text);
      const rules = JSON.parse(text) as FeeRule[];
      console.log(`Gemini API: Parsed rules array length: ${rules.length}`);

      // Post-process rules (ensure limits and types are correct)
      return rules.map(r => ({
        ...r,
        brand: brandName,
        lowerLimit: Number(r.lowerLimit) || 0,
        upperLimit: r.upperLimit === null || String(r.upperLimit) === 'Infinity' || Number(r.upperLimit) >= 10000000 ? Infinity : Number(r.upperLimit),
        commissionPercent: Number(r.commissionPercent) || 0,
        fixedFee: Number(r.fixedFee) || 0
      }));
    } catch (err: any) {
      console.error(`Gemini API: Exception using model ${model}:`, err);
      lastError = err;
    }
  }

  throw lastError || new Error("All Gemini models failed to parse the PDF");
};

