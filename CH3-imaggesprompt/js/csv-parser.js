/* CSV Parser (純前端、無外部依賴) */
(function (global) {
  'use strict';
  function parseCSV(text) {
    if (!text) return [];
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    const rows = tokenize(text);
    if (rows.length === 0) return [];
    const headers = rows[0].map(h => h.trim());
    const out = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length === 0 || row.every(cell => cell === '' || cell == null)) continue;
      const obj = {};
      for (let j = 0; j < headers.length; j++) {
        const key = headers[j];
        if (!key) continue;
        const val = row[j] == null ? '' : String(row[j]);
        obj[key] = val.trim();
      }
      out.push(obj);
    }
    return out;
  }
  function tokenize(text) {
    const rows = [];
    let row = [], field = '', inQuotes = false, i = 0;
    const len = text.length;
    while (i < len) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          inQuotes = false; i++; continue;
        }
        field += c; i++; continue;
      }
      if (c === '"') { inQuotes = true; i++; continue; }
      if (c === ',') { row.push(field); field = ''; i++; continue; }
      if (c === '\r') { i++; continue; }
      if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
      field += c; i++;
    }
    if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
    return rows;
  }
  global.CSVParser = { parse: parseCSV };
})(window);
