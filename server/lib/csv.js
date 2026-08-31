function escapeCsv(value) {
  if (value == null) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function csvRow(cells) {
  return cells.map(escapeCsv).join(',');
}

function csvTable(headers, rows) {
  const lines = [csvRow(headers)];
  for (const row of rows) {
    lines.push(csvRow(headers.map((h) => row[h] ?? '')));
  }
  return lines.join('\n');
}

function csvSection(title, headers, rows) {
  return `SECTION,${title}\n${csvTable(headers, rows)}`;
}

module.exports = { escapeCsv, csvRow, csvTable, csvSection };
