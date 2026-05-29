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
 * Parses the raw text by calling the secure backend /api/parse-annexure endpoint,
 * which proxies the request to the Gemini API. The API key is kept server-side only.
 */
export const parseMyntraAnnexureWithGemini = async (
  textItems: string[],
  brandName: string,
  mode: 'commission' | 'fixed_fee'
): Promise<FeeRule[]> => {
  console.log('Calling backend /api/parse-annexure proxy...');

  const response = await fetch('/api/parse-annexure', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ textItems, brandName, mode }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Backend parse error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const rules: FeeRule[] = data.rules || [];

  console.log(`Backend returned ${rules.length} rules.`);
  return rules;
};

