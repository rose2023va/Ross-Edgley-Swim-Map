// swim-legs-all4.js
// Config: 4 CSV datasets with colors
const datasets = [
  { name: "Main GPX",   url: "https://raw.githubusercontent.com/rose2023va/Ross-Edgley-Swim-Map/refs/heads/main/consolidated_gpx%20-%20consolidated_gpx.csv",   color: "red" },
  { name: "Skirr GPX",  url: "https://raw.githubusercontent.com/rose2023va/Ross-Edgley-Swim-Map/refs/heads/main/Skirr%20GPX%20-%20Skirr%20GPX.csv",  color: "blue" },
  { name: "Garmin GPX", url: "https://raw.githubusercontent.com/rose2023va/Ross-Edgley-Swim-Map/refs/heads/main/GarminGPX%20-%20GarminGPX.csv", color: "green" },
  { name: "Marshall Garmin GPX",  url: "https://raw.githubusercontent.com/rose2023va/Ross-Edgley-Swim-Map/refs/heads/main/Marshall_Garmin.csv",   color: "pink" }
];

const map = L.map("map", { center:[64.9631,-19.0208], zoom:6, zoomControl:true });

L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  { attribution: "Tiles © Esri — USGS, NOAA", maxZoom: 18 }
).addTo(map);

const legLayers = {};
const bounds = L.latLngBounds();
const listEl = document.getElementById("checkboxes");

function parseLatLon(pair){
  if(!pair) return null;
  const [lat, lon] = String(pair).split(",").map(s => Number(s.trim()));
  if(Number.isNaN(lat) || Number.isNaN(lon)) return null;
  return [lat, lon]; // lat,lon order
}

function addCheckbox(group, name){
  const row = document.createElement("div");
  row.className = "filter-item";
  row.innerHTML = `
    <label>
      <input type="checkbox" checked onchange="toggleLeg('${group}_${name}', this.checked)">
      ${name}
    </label>`;
  listEl.appendChild(row);
}

// Load each dataset
datasets.forEach(ds => {
  // Group header
  const h4 = document.createElement("h4");
  h4.textContent = ds.name;
  listEl.appendChild(h4);

  Papa.parse(ds.url, {
    download: true,
    header: true,
    complete: function(results){
      results.data.forEach((r, idx) => {
        const start = parseLatLon(r.start_coordinates);
        const end   = parseLatLon(r.end_coordinates);
        if(!start || !end) return;

        const name = (r.filename && r.filename.trim()) || `Leg ${idx+1}`;
        const key  = `${ds.name}_${name}`;

        const line = L.polyline([start,end], { color: ds.color, weight:4, opacity:0.9 })
          .bindTooltip(name) // show filename on hover
          .bindPopup(
            `<strong>${name}</strong><br>
             ${r.start_date||""} ${r.start_time||""} → ${r.finish_date||""} ${r.end_time||""}<br>
             <small>Start: ${r.start_coordinates}<br>End: ${r.end_coordinates}</small>`
          )
          .addTo(map);

        legLayers[key] = line;
        bounds.extend(line.getBounds());
        addCheckbox(ds.name, name);
      });
      if(bounds.isValid()) map.fitBounds(bounds.pad(0.1));
    }
  });
});

// UI functions
window.toggleLeg = function(id, show){
  const layer = legLayers[id];
  if(!layer) return;
  if(show) layer.addTo(map); else map.removeLayer(layer);
};

window.showAll = function(){
  Object.keys(legLayers).forEach(id => {
    legLayers[id].addTo(map);
    document.querySelectorAll("#checkboxes input").forEach(cb => cb.checked = true);
  });
};

window.clearAll = function(){
  Object.keys(legLayers).forEach(id => {
    map.removeLayer(legLayers[id]);
    document.querySelectorAll("#checkboxes input").forEach(cb => cb.checked = false);
  });
};
