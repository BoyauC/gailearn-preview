/* =========================================================
   CSV Parser  (與 CH6 共用設計)
   - 純前端，不依賴第三方
   - 支援：雙引號包住的欄位、欄位內的逗號與換行、雙引號跳脫("")
   - 回傳：以表頭為 key 的物件陣列
   ========================================================= */
(function (global) {
  'use strict';

  function parseCSV(text) {
    if (!text) return [];
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1); // remove BOM

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
    let row = [];
    let field = '';
    let inQuotes = false;
    let i = 0;
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
