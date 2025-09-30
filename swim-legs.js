// ====== CONFIG ======
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRtXUJdZR_9Ul9Fp7gIiipv9rR9EBLvgcwV3-VMt2SNwkmWbOcc4HLZTw18bwE3g9JjvjMY7q1QlF1g/pub?output=csv';
// If your coordinates are "lat,lon" keep FLIP_LONLAT=false (default).
// If you discover they were saved "lon,lat", set this to true.
const FLIP_LONLAT = false;

// ====== HELPERS ======
function parseLatLon(pair) {
  // pair like "64.098838,-22.695829"
  const [a, b] = String(pair).split(',').map(s => Number(s.trim()));
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  // Sheet is lat,lon by your note. Flip only if needed.
  return FLIP_LONLAT ? [b, a] : [a, b]; // returns [lat, lon]
}

async function fetchCSV(url) {
  const res = await fetch(url);
  const text = await res.text();
  // simple CSV parser (no quotes in your headers/data)
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(',').map(h => h.trim());
  return lines.map(line => {
    const cols = line.split(',').map(c => c.trim());
    const row = {};
    headers.forEach((h, i) => row[h] = cols[i] ?? '');
    return row;
  });
}

// ====== MAP ======
const map = L.map('map', { scrollWheelZoom: true }).setView([64.9, -18.9], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 17,
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

// Group to hold all legs
const legsLayer = L.layerGroup().addTo(map);

(async () => {
  const rows = await fetchCSV(SHEET_CSV_URL);

  // Expecting headers exactly:
  // filename,start_date,finish_date,start_time,end_time,start_coordinates,end_coordinates
  rows.forEach((r, idx) => {
    const start = parseLatLon(r.start_coordinates);
    const end   = parseLatLon(r.end_coordinates);
    if (!start || !end) return; // skip bad rows

    // Draw the leg as a straight line for now (or replace with GPX later)
    const poly = L.polyline([start, end], { weight: 3 }).addTo(legsLayer);

    const popupHtml = `
      <b>${r.filename || `Leg ${idx+1}`}</b><br/>
      ${r.start_date || ''} ${r.start_time || ''} → ${r.finish_date || ''} ${r.end_time || ''}<br/>
      <small>Start: ${r.start_coordinates}<br/>End: ${r.end_coordinates}</small>
    `;
    poly.bindPopup(popupHtml);
  });

  // Fit map to all legs
  if (legsLayer.getLayers().length) {
    map.fitBounds(legsLayer.getBounds(), { padding: [20, 20] });
  }

  // Optional: add a legend-ish control
  L.control.layers(null, { 'Swim Legs (sheet)': legsLayer }, { collapsed: false }).addTo(map);
})();
