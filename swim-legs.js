const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRtXUJdZR_9Ul9Fp7gIiipv9rR9EBLvgcwV3-VMt2SNwkmWbOcc4HLZTw18bwE3g9JjvjMY7q1QlF1g/pub?output=csv';

function normalizeHeader(h){
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g,'_'); // "start date" -> "start_date"
}

// Returns Promise<array of rows> with keys matching:
// filename,start_date,finish_date,start_time,end_time,start_coordinates,end_coordinates
function loadSwimLegs(){
  return new Promise((resolve, reject) => {
    Papa.parse(SHEET_CSV_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: results => {
        if (results.errors && results.errors.length){
          console.warn('CSV parse warnings:', results.errors);
        }
        // Normalize headers to snake_case to match expected keys
        const rows = results.data.map(obj => {
          const o = {};
          Object.keys(obj).forEach(k => o[normalizeHeader(k)] = obj[k]);
          return o;
        });
        resolve(rows);
      },
      error: err => reject(err)
    });
  });
}
