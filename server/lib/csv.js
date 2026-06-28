export function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];

  for (const row of rows) {
    lines.push(
      headers
        .map((header) => {
          const value = row[header];
          const text = value === null || value === undefined ? '' : String(value);
          return `"${text.replaceAll('"', '""')}"`;
        })
        .join(','),
    );
  }

  return lines.join('\n');
}
