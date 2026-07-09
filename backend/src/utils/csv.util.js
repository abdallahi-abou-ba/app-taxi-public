// Minimal RFC 4180-ish CSV writer - no dependency needed for the app's
// export use case (a handful of flat, admin-defined column sets). Quotes a
// field only when it contains a comma, quote, or newline, doubling any
// embedded quotes - the standard escaping rule.
function escapeCsvField(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

// columns: [{ label, value: (row) => cell }]
function toCsv(rows, columns) {
  const header = columns.map((c) => escapeCsvField(c.label)).join(',');
  const lines = rows.map((row) => columns.map((c) => escapeCsvField(c.value(row))).join(','));
  return [header, ...lines].join('\r\n');
}

module.exports = { toCsv };
