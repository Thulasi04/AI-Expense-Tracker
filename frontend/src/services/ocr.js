import { createWorker } from 'tesseract.js';

/**
 * Scan receipt image using Tesseract.js and parse financial entities
 */
export async function scanReceipt(imageFile, onProgress = () => {}) {
  const worker = await createWorker('eng');
  
  try {
    const ret = await worker.recognize(imageFile);
    const text = ret.data.text;
    
    const parsedData = parseReceiptText(text);
    return {
      rawText: text,
      ...parsedData
    };
  } finally {
    await worker.terminate();
  }
}

/**
 * Heuristics to extract amount, merchant, and date from raw receipt text
 */
export function parseReceiptText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let amount = null;
  let merchant = null;
  let date = null;
  let category = 'Shopping';

  // 1. Merchant Detection: usually in the first 3 lines of a receipt
  for (let i = 0; i < Math.min(lines.length, 4); i++) {
    const line = lines[i];
    // Exclude generic header lines
    if (!/tax invoice|bill|receipt|cash memo|welcome|gstin|phone|tel|fssai/i.test(line) && line.length > 2) {
      merchant = line.replace(/[#*~`]/g, '').trim();
      break;
    }
  }

  // 2. Amount Detection: search for Total, Grand Total, Net Amount, Paid
  const totalRegexes = [
    /(?:total|grand total|net amount|amount payable|amount due|final amount|subtotal|balance due|paid)[\s:]*(?:₹|rs\.?|inr)?[\s]*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:₹|rs\.?|inr)[\s]*([\d,]+(?:\.\d{1,2})?)/i,
  ];

  for (const line of lines) {
    for (const reg of totalRegexes) {
      const match = line.match(reg);
      if (match) {
        const val = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(val) && val > 0 && (!amount || val > amount)) {
          amount = val;
        }
      }
    }
  }

  // If no explicit total found, search all numbers and take largest plausible price
  if (!amount) {
    for (const line of lines) {
      const numberMatches = line.match(/\b\d+(?:\.\d{2})\b/g);
      if (numberMatches) {
        for (const nm of numberMatches) {
          const val = parseFloat(nm);
          if (val > 10 && val < 500000 && (!amount || val > amount)) {
            amount = val;
          }
        }
      }
    }
  }

  // 3. Date Detection: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YY, etc.
  const dateRegex = /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/;
  for (const line of lines) {
    const dMatch = line.match(dateRegex);
    if (dMatch) {
      try {
        const parts = dMatch[1].split(/[/-]/);
        if (parts[0].length === 4) {
          // YYYY-MM-DD
          date = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        } else if (parts[2].length === 4) {
          // DD/MM/YYYY or MM/DD/YYYY
          date = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        break;
      } catch {
        // ignore date parse error
      }
    }
  }

  // Fallback date to today if none detected
  if (!date) {
    const today = new Date();
    date = today.toISOString().split('T')[0];
  }

  // 4. Infer Category
  const lowerText = text.toLowerCase();
  if (/grocery|supermarket|vegetable|fruit|milk|bread|mart|ration/i.test(lowerText)) {
    category = 'Groceries';
  } else if (/restaurant|cafe|coffee|food|pizza|burger|dining|dhaba/i.test(lowerText)) {
    category = 'Food';
  } else if (/petrol|fuel|diesel|uber|ola|toll|auto/i.test(lowerText)) {
    category = 'Transport';
  } else if (/electricity|water|wifi|broadband|bill|recharge/i.test(lowerText)) {
    category = 'Bills & Utilities';
  } else if (/pharmacy|medical|medicine|hospital|clinic|doctor/i.test(lowerText)) {
    category = 'Healthcare';
  }

  return {
    amount: amount || 0,
    merchant: merchant || 'Scanned Merchant',
    date,
    category,
    description: merchant ? `Purchase at ${merchant}` : 'Receipt expense'
  };
}
