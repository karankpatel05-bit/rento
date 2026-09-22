import { ExtractedLedgerRow, PaymentMode } from '../types';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SHORT_MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};

/**
 * Normalizes dates from various formats:
 * - DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
 * - DD/MM/YY, DD-MM-YY, DD.MM.YY
 * - YYYY-MM-DD
 * - DD Mon YYYY (e.g., 15 Jul 2025)
 */
function parseDatePattern(text: string): { dateStr: string; monthYear: string; matchedText: string } | null {
  // 1. Check for Named Month: "15 Jul 2025" or "5 August 2024"
  const namedMonthRegex = /\b(\d{1,2})[\s\-\/]+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\-\/]+(\d{2,4})\b/i;
  const namedMatch = text.match(namedMonthRegex);
  if (namedMatch) {
    const day = parseInt(namedMatch[1], 10);
    const monthKey = namedMatch[2].toLowerCase().substring(0, 3);
    const monthIndex = SHORT_MONTHS[monthKey] ?? 0;
    let year = parseInt(namedMatch[3], 10);
    if (year < 100) year += 2000;

    const formattedDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const monthYear = `${MONTH_NAMES[monthIndex]} ${year}`;
    return { dateStr: formattedDate, monthYear, matchedText: namedMatch[0] };
  }

  // 2. Check for ISO: "2025-05-12"
  const isoRegex = /\b(20\d{2})[-/\.](0?[1-9]|1[0-2])[-/\.](0?[1-9]|[12]\d|3[01])\b/;
  const isoMatch = text.match(isoRegex);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const monthIndex = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const formattedDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const monthYear = `${MONTH_NAMES[monthIndex]} ${year}`;
    return { dateStr: formattedDate, monthYear, matchedText: isoMatch[0] };
  }

  // 3. Check for standard numeric: "05/04/2025", "5-4-25", "12.06.2024"
  const numericRegex = /\b(0?[1-9]|[12]\d|3[01])[-/\.](0?[1-9]|1[0-2])[-/\.](\d{2,4})\b/;
  const numMatch = text.match(numericRegex);
  if (numMatch) {
    const day = parseInt(numMatch[1], 10);
    const monthIndex = parseInt(numMatch[2], 10) - 1;
    let year = parseInt(numMatch[3], 10);
    if (year < 100) year += 2000;

    const formattedDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const monthYear = `${MONTH_NAMES[monthIndex]} ${year}`;
    return { dateStr: formattedDate, monthYear, matchedText: numMatch[0] };
  }

  return null;
}

/**
 * Extracts Payment Mode strictly: UPI, NEFT, or Cash
 */
function parsePaymentModePattern(text: string): { mode: PaymentMode; matchedText: string } | null {
  const modeRegex = /\b(UPI|NEFT|CASH)\b/i;
  const match = text.match(modeRegex);
  if (match) {
    const upper = match[1].toUpperCase();
    let mode: PaymentMode = 'Cash';
    if (upper === 'UPI') mode = 'UPI';
    else if (upper === 'NEFT') mode = 'NEFT';
    else if (upper === 'CASH') mode = 'Cash';

    return { mode, matchedText: match[0] };
  }
  return null;
}

/**
 * Extracts rent Amount while avoiding false positives like years (2024, 2025)
 */
function parseAmountPattern(text: string, excludeMatchedStrings: string[]): { amount: number; matchedText: string } | null {
  // Strip out already identified date or mode substrings to avoid regex collisions
  let workingText = text;
  excludeMatchedStrings.forEach((s) => {
    if (s) {
      workingText = workingText.replace(s, ' ');
    }
  });

  // 1. Look for explicit currency prefix: "Rs. 25,000", "₹25000", "Rs 30000/-"
  const currencyPrefixRegex = /(?:Rs\.?|₹|INR)\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{2})?|[0-9]{3,7})/i;
  const currMatch = workingText.match(currencyPrefixRegex);
  if (currMatch) {
    const rawNum = currMatch[1].replace(/,/g, '');
    const num = parseFloat(rawNum);
    if (!isNaN(num) && num > 0) {
      return { amount: num, matchedText: currMatch[0] };
    }
  }

  // 2. Look for standalone numbers typically representing rent (>= 1000)
  const standaloneRegex = /\b([1-9][0-9]{0,2}(?:,[0-9]{2,3})+|[1-9][0-9]{3,6})(?:\.[0-9]{2})?\b/;
  const match = workingText.match(standaloneRegex);
  if (match) {
    const rawNum = match[1].replace(/,/g, '');
    const num = parseFloat(rawNum);
    // Ignore standalone 4-digit numbers that look like years (2020-2035) unless prefixed with currency
    if (num >= 2020 && num <= 2035 && !workingText.includes('Rs') && !workingText.includes('₹')) {
      // Look for another number on the line
      const secondMatch = workingText.slice(match.index! + match[0].length).match(standaloneRegex);
      if (secondMatch) {
        const secondNum = parseFloat(secondMatch[1].replace(/,/g, ''));
        if (!isNaN(secondNum) && secondNum > 0) {
          return { amount: secondNum, matchedText: secondMatch[0] };
        }
      }
    } else if (!isNaN(num) && num > 0) {
      return { amount: num, matchedText: match[0] };
    }
  }

  return null;
}

/**
 * Core Headerless Pattern Recognition Parser:
 * Analyzes physical notebook lines with NO headers.
 */
export function parseHeaderlessNotebookLine(
  line: string,
  index: number
): ExtractedLedgerRow | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 5) return null;

  // 1. Date match
  const dateResult = parseDatePattern(trimmed);
  if (!dateResult) return null; // A valid ledger row in a notebook always has a transaction date

  // 2. Payment mode match (UPI, NEFT, Cash)
  const modeResult = parsePaymentModePattern(trimmed);
  const paymentMode: PaymentMode = modeResult ? modeResult.mode : 'Cash';

  // 3. Amount match
  const excludeStrings = [dateResult.matchedText];
  if (modeResult) excludeStrings.push(modeResult.matchedText);

  const amountResult = parseAmountPattern(trimmed, excludeStrings);
  if (!amountResult) return null;

  // 4. Remarks (any remaining text on the row)
  let cleanRemarks = trimmed;
  cleanRemarks = cleanRemarks.replace(dateResult.matchedText, '');
  cleanRemarks = cleanRemarks.replace(amountResult.matchedText, '');
  if (modeResult) {
    cleanRemarks = cleanRemarks.replace(modeResult.matchedText, '');
  }
  // Remove dangling punctuation and extra whitespace
  cleanRemarks = cleanRemarks.replace(/^[\s,\-–:;/]+|[\s,\-–:;/]+$/g, '').trim();

  // Confidence calculation
  let confidence = 0.7;
  if (modeResult) confidence += 0.2;
  if (amountResult.matchedText.includes('Rs') || amountResult.matchedText.includes('₹') || amountResult.amount >= 2000) {
    confidence += 0.1;
  }

  return {
    id: `ocr-row-${Date.now()}-${index}`,
    date: dateResult.dateStr,
    monthYear: dateResult.monthYear,
    amount: amountResult.amount,
    paymentMode,
    remarks: cleanRemarks,
    rawText: trimmed,
    confidence: Math.min(1.0, confidence),
  };
}

/**
 * Parses full multiline text extracted from a notebook image
 */
export function parseHeaderlessNotebookText(fullText: string): ExtractedLedgerRow[] {
  const lines = fullText.split(/\r?\n/);
  const rows: ExtractedLedgerRow[] = [];

  lines.forEach((line, idx) => {
    const parsed = parseHeaderlessNotebookLine(line, idx);
    if (parsed) {
      rows.push(parsed);
    }
  });

  // Sort chronologically (oldest to newest)
  return rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
