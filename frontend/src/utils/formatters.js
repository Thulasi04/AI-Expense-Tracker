/**
 * Formats a number to Indian Rupee format (en-IN)
 * Example: 125000 -> ₹1,25,000.00
 */
export function formatINR(amount, includeSymbol = true) {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return includeSymbol ? '₹0.00' : '0.00';
  }

  const num = Number(amount);
  const isNegative = num < 0;
  const absNum = Math.abs(num);

  const formatted = absNum.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const prefix = isNegative ? '-' : '';
  const symbol = includeSymbol ? '₹' : '';

  return `${prefix}${symbol}${formatted}`;
}

/**
 * Formats date string (YYYY-MM-DD) to friendly format (e.g. 23 Oct 2026)
 */
export function formatDate(dateString) {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

/**
 * Return current month string YYYY-MM
 */
export function getCurrentMonthStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}
