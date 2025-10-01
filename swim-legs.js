// ================= CONFIG =================
const SHEET_CSV_URL = 'https://raw.githubusercontent.com/rose2023va/Ross-Edgley-Swim-Map/refs/heads/main/consolidated_gpx%20-%20consolidated_gpx.csv'; // raw GitHub URL or Sheets output=csv

// =============== UTILITIES ================
function normalizeHeader(h){
  return String(h || '')
    .replace(/^\uFEFF/, '')   // strip BOM
    .trim()
    .toLowerCase()
    .replace(/\s+/g,'_')
    .replace(/[^a-z0-9_]/g,'');
}

function isLatLonString(s){
  if (!s) return false;
  return /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/.test(String(s));
}

// =============== MAIN LOADER ==============
function loadSwimLegs(){
  return fetch(SHEET_CSV_URL, { cache: 'no-cache' })
    .then(async resp => {
      const text = await resp.text();

      // Guard: if we got HTML (wrong URL), fail early with helpful log
      const looksHtml = /^\s*<!doctype html/i.test(text) || /\<html[\s>]/i.test(text);
      if (looksHtml) {
        console.error('[CSV] Fetched HTML instead of CSV. Check the URL. First 300 chars:\n',
          text.slice(0, 300));
        throw new Error('Not a CSV (looks like HTML). Use a raw CSV link or Sheets output=csv.');
      }

      return new Promise((resolve, reject) => {
        Papa.parse(text, {
          header: true,
          skipEmptyLines: 'greedy',
          dynamicTyping: false,
          transformHeader: normalizeHeader,
          complete: results => {
            if (results.errors && results.errors.length) {
              console.warn('CSV parse warnings:', results.errors);
            }

            const rows = (results.data || []).map(obj => {
              const o = {};
              for (const k in obj) {
                o[normalizeHeader(k)] = (obj[k] == null) ? '' : String(obj[k]).trim();
              }
              return o;
            });

            const required = [
              'filename','start_date','finish_date',
              'start_time','end_time',
              'start_coordinates','end_coordinates'
            ];

            const have = new Set(Object.keys(rows[0] || {}));
            const missing = required.filter(k => !have.has(k));
            if (missing.length) {
              console.error('Missing expected column(s):', missing, 'Found:', [...have]);
              // continue; we’ll filter rows below
            }

            const good = [];
            const bad = [];
            for (const r of rows) {
              const ok = r.filename && isLatLonString(r.start_coordinates) && isLatLonString(r.end_coordinates);
              (ok ? good : bad).push(r);
            }

            console.log(`[CSV] total: ${rows.length} | usable: ${good.length} | skipped: ${bad.length}`);
            if (bad.length) console.log('[CSV] Example skipped row:', bad[0]);

            resolve(good);
          },
          error: err => reject(err)
        });
      });
    });
}
