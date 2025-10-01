const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTI-jHa9Jf_E-F5O5sFFcDdTzkvoapQdJiW-rFG6Pz25gqWeRIFhIdkNYvI909JBRb8lf7EsF_U_W4C/pubhtml';
// ---------- CSV LOADER ----------
function normalizeHeader(h){
  return String(h || '')
    .replace(/^\uFEFF/, '')     // strip BOM if present
    .trim()
    .toLowerCase()
    .replace(/\s+/g,'_')        // spaces -> underscores
    .replace(/[^a-z0-9_]/g,''); // drop odd chars
}

function isLatLonString(s){
  if (!s) return false;
  // e.g. 64.098838,-22.695829  (allow spaces)
  return /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/.test(String(s));
}

function loadSwimLegs(){
  return new Promise((resolve, reject) => {
    Papa.parse(SHEET_CSV_URL, {
      download: true,
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: false,
      transformHeader: normalizeHeader,
      complete: (results) => {
        if (results.errors && results.errors.length) {
          console.warn('CSV parse warnings:', results.errors);
        }

        // Normalize row keys and trim values
        const rows = (results.data || []).map(obj => {
          const o = {};
          Object.keys(obj || {}).forEach(k => {
            const nk = normalizeHeader(k);
            o[nk] = (obj[k] == null) ? '' : String(obj[k]).trim();
          });
          return o;
        });

        // We expect these keys (any capitalization in CSV is OK):
        // filename,start_date,finish_date,start_time,end_time,start_coordinates,end_coordinates
        const required = [
          'filename','start_date','finish_date',
          'start_time','end_time',
          'start_coordinates','end_coordinates'
        ];

        // Report missing headers (after normalization)
        const have = new Set(Object.keys(rows[0] || {}));
        const missing = required.filter(k => !have.has(k));
        if (missing.length) {
          console.error('Missing expected column(s):', missing, 'Found columns:', [...have]);
          // Still proceed; we’ll filter unusable rows below
        }

        // Validate rows
        const good = [];
        const bad = [];
        for (const r of rows) {
          const startOK = isLatLonString(r.start_coordinates);
          const endOK   = isLatLonString(r.end_coordinates);
          const hasFile = !!(r.filename && r.filename.length);
          if (startOK && endOK && hasFile) good.push(r); else bad.push(r);
        }

        console.log(`[CSV] total rows: ${rows.length} | usable: ${good.length} | skipped: ${bad.length}`);
        if (bad.length) {
          console.log('[CSV] Example skipped row:', bad[0]);
        }

        resolve(good);
      },
      error: (err) => {
        reject(err);
      }
    });
  });
}

