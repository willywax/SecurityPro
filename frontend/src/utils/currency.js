export const formatTZS = (amount) =>
  `TZS ${Number(amount || 0).toLocaleString('en-TZ', {
    maximumFractionDigits: 0,
  })}`;
