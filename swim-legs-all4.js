// ================== CONFIG (edit URLs as needed) ==================
const DATASETS = [
  { name: "Main GPX",   url: "https://raw.githubusercontent.com/rose2023va/Ross-Edgley-Swim-Map/refs/heads/main/consolidated_gpx%20-%20consolidated_gpx.csv",   color: "red" },
  { name: "Skirr GPX",  url: "https://raw.githubusercontent.com/rose2023va/Ross-Edgley-Swim-Map/refs/heads/main/Skirr%20GPX%20-%20Skirr%20GPX.csv",  color: "blue" },
  { name: "Garmin GPX", url: "https://raw.githubusercontent.com/rose2023va/Ross-Edgley-Swim-Map/refs/heads/main/GarminGPX%20-%20GarminGPX.csv", color: "green" },
  { name: "Marshall Garmin GPX",  url: "https://raw.githubusercontent.com/rose2023va/Ross-Edgley-Swim-Map/refs/heads/main/Marshall_Garmin.csv",   color: "pink" }
];
// If you prefer RAW GitHub URLs, replace each `url` with the Raw link.

// ================== MAP SETUP ==================
const map = L.map("map", { center:[64.9631,-19.0208], zoom:6, zoomControl:true });
L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  { attribution: "Tiles © Esri — USGS, NOAA", maxZoom: 18 }
).addTo(map);

// ================== HELPERS ==================
function parseLatLon(pair){
  if (!pair) return null;
  const [lat, lon] = String(pair).split(",").map(s => Number(s.trim()));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return [lat, lon]; // lat,lon
}

function normalizeHeader(h){
  return String(h||"").replace(/^\uFEFF/,"").trim().toLowerCase().replace(/\s+/g,"_");
}

function isLatLonString(s){
  return /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/.test(String(s||""));
}

function loadCsv(url){
  return fetch(url, { cache:"no-cache" })
    .then(r => r.text())
    .then(text => {
      if (/^\s*<!doctype html/i.test(text) || /<html[\s>]/i.test(text)) {
        throw new Error("Got HTML instead of CSV — use a file path in the site or a RAW GitHub URL.");
      }
      return new Promise((resolve, reject) => {
        Papa.parse(text, {
          header: true,
          skipEmptyLines: "greedy",
          transformHeader: normalizeHeader,
          complete: res => resolve(res.data || []),
          error: reject
        });
      });
    });
}

// ================== RENDERING ==================
const panel = document.getElementById("checkboxes");
const allLayers = {};                // key -> Leaflet layer
const datasetGroups = [];            // per-dataset layerGroup + DOM refs
const globalBounds = L.latLngBounds();

DATASETS.forEach((ds, idx) => {
  // Make a dedicated section for this dataset
  const section = document.createElement("div");
  section.className = "dataset";
  section.innerHTML = `
    <h4>${ds.name}</h4>
    <div class="list" id="list-ds-${idx}"></div>
  `;
  panel.appendChild(section);

  const listEl = section.querySelector(`#list-ds-${idx}`);
  const group = L.layerGroup().addTo(map);

  datasetGroups.push({ name: ds.name, group, listEl });

  // Load and render this dataset into its own list & group
  loadCsv(ds.url).then(rows => {
    rows.forEach((r, i) => {
      // Expect columns: filename,start_date,finish_date,start_time,end_time,start_coordinates,end_coordinates
      const start = isLatLonString(r.start_coordinates) ? parseLatLon(r.start_coordinates) : null;
      const end   = isLatLonString(r.end_coordinates)   ? parseLatLon(r.end_coordinates)   : null;
      if (!start || !end) return;

      const name = (r.filename && r.filename.trim()) || `Leg ${i+1}`;
      const key  = `${idx}|${name}`; // unique per dataset + filename

      // Map line (colored per dataset)
      const line = L.polyline([start, end], { color: ds.color, weight: 4, opacity: 0.9 })
        .bindTooltip(name) // show filename on hover
        .bindPopup(
          `<strong>${name}</strong><br>
           ${r.start_date||""} ${r.start_time||""} → ${r.finish_date||""} ${r.end_time||""}<br>
           <small>Start: ${r.start_coordinates}<br>End: ${r.end_coordinates}</small>`
        );

      line.addTo(group);
      allLayers[key] = line;
      globalBounds.extend(line.getBounds());

      // Checkbox row for THIS dataset only
      const row = document.createElement("div");
      row.className = "filter-item";
      const safe = name.replace(/"/g,'&quot;').replace(/'/g,"&#39;");
      row.innerHTML = `<label><input type="checkbox" data-key="${key}" checked> ${safe}</label>`;
      listEl.appendChild(row);
    });

    if (globalBounds.isValid()) map.fitBounds(globalBounds.pad(0.1));
  }).catch(err => {
    console.error(`Failed to load ${ds.name}:`, err);
  });
});

// Per-leg toggle (delegated per dataset section)
panel.addEventListener("change", e => {
  const cb = e.target.closest('input[type="checkbox"][data-key]');
  if (!cb) return;
  const key = cb.dataset.key;
  const layer = allLayers[key];
  if (!layer) return;
  if (cb.checked) layer.addTo(map); else map.removeLayer(layer);
});

// Global buttons wired from HTML
window.showAll = function(){
  Object.values(allLayers).forEach(layer => layer.addTo(map));
  panel.querySelectorAll('input[type="checkbox"][data-key]').forEach(cb => cb.checked = true);
};
window.clearAll = function(){
  Object.values(allLayers).forEach(layer => map.removeLayer(layer));
  panel.querySelectorAll('input[type="checkbox"][data-key]').forEach(cb => cb.checked = false);
};
