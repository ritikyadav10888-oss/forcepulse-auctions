// Amounts are stored in crore (1 = 1 Cr, 0.02 = 2 lakh). They are shown the Indian way, without a currency sign:
// below a crore in lakh ("2 Lakh", "82.5 Lakh"), from a crore up in crore ("1 Cr", "1.25 Cr").

const trim = (n) => String(Math.round(n * 10000) / 10000);

// { value: '82.5', unit: 'Lakh' } for displays that style the number and the unit separately
export const moneyParts = (cr) => {
  const n = Number(cr) || 0;
  // Zero reads "0 Cr" so it matches the crore amounts it usually sits beside
  return Math.abs(n) >= 1 || n === 0 ? { value: trim(n), unit: 'Cr' } : { value: trim(n * 100), unit: 'Lakh' };
};

export const formatMoney = (cr) => {
  const { value, unit } = moneyParts(cr);
  return `${value} ${unit}`;
};
