// Helper to build a YYYY-MM key in UTC
const toMonthKeyUTC = (date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

// Helper to build a continuous list of month keys (UTC)
const buildMonthKeysUTC = (months) => {
  const now = new Date();
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  cursor.setUTCMonth(cursor.getUTCMonth() - (months - 1));

  const keys = [];
  for (let i = 0; i < months; i++) {
    keys.push(toMonthKeyUTC(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return keys;
};

module.exports = {
  toMonthKeyUTC,
  buildMonthKeysUTC
};
