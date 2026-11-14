
/* =========================================
   GVK SURGE LAYER
   GDAL3.js + Original FlatGeobuf
========================================= */

window.gvkSurgeLayer = null;
window.gvkSurgeDataset = null;

const SURGE_FGB_PATH = "./data/Surge/Surge.fgb";


/* =========================================
   CSV PARSER
========================================= */

function parseSurgeCSV(text) {

    const rows = [];
    let row = [];
    let value = "";
    let quoted = false;

    for (let i = 0; i < text.length; i++) {

        const char = text[i];
        const next = text[i + 1];

        if (char === '"' && quoted && next === '"') {
            value += '"';
            i++;
        }
        else if (char === '"') {
            quoted = !quoted;
        }
        else if (char === "," && !quoted) {
            row.push(value);
            value = "";
        }
        else if ((char === "\n" || char === "\r") && !quoted) {

            if (char === "\r" && next === "\n") i++;

            row.push(value);

            if (row.some(v => v !== "")) {
                rows.push(row);
            }

            row = [];
            value = "";

        }
        else {
            value += char;
        }
    }

    if (value !== "" || row.length > 0) {
        row.push(value);
        rows.push(row);
    }

    if (!rows.length) return [];

    const headers = rows.shift();

    return rows.map(values => {

        const properties = {};

        headers.forEach((header, index) => {
            properties[header] = values[index] ?? "";
        });

        return properties;

    });
}


/* =========================================
   MAIN SURGE INITIALISATION
========================================= */

async function initialiseSurge() {

    try {

        // 1. Initialise GDAL
        const gdal = await initGdalJs({

            path: "https://cdn.jsdelivr.net/npm/gdal3.js@2.8.1/dist/package",

            useWorker: false

        });

        window.gvkGDAL = gdal;

        console.log("GDAL initialised.");


        // 2. Fetch original FGB
        const response = await fetch(SURGE_FGB_PATH);

        if (!response.ok) {
            throw new Error(
                `Surge FGB loading failed: ${response.status}`
            );
        }

        const blob = await response.blob();

        const file = new File(
            [blob],
            "Surge.fgb"
        );


        // 3. Open original FGB
        const result = await gdal.open(file);

        if (!result.datasets || !result.datasets.length) {
            throw new Error("GDAL could not open Surge.fgb.");
        }

        const dataset = result.datasets[0];

        window.gvkSurgeDataset = dataset;

        // 4. Read dataset information
        const info = await gdal.getInfo(dataset);

        console.log("Surge dataset information:", info);


        // 5. Extract features using GDAL
        // CSV exists only in memory; no GeoJSON is generated.

        const output = await gdal.ogr2ogr(
            dataset,
            [
                "-f", "CSV",
                "-t_srs", "EPSG:4326",
                "-lco", "GEOMETRY=AS_WKT"
            ]
        );

        const bytes = await gdal.getFileBytes(output);

        const csvText = new TextDecoder().decode(bytes);

        const records = parseSurgeCSV(csvText);


        // 6. Find WKT geometry column
        const firstRecord = records[0];

        if (!firstRecord) {
            throw new Error("No Surge records found.");
        }

        const geometryField = Object.keys(firstRecord).find(
            key => key.toUpperCase() === "WKT"
        );

        if (!geometryField) {
            throw new Error("WKT geometry column not found.");
        }


        // 7. Create Leaflet layer
        const surgeLayer = L.layerGroup();

        let featureCount = 0;

        records.forEach(record => {

            const wkt = record[geometryField];

            const match = wkt.match(
                /^POINT\s*(?:Z\s*)?\(\s*([-+0-9.eE]+)\s+([-+0-9.eE]+)/
            );

            if (!match) return;

            const longitude = Number(match[1]);
            const latitude = Number(match[2]);

            if (
                !Number.isFinite(longitude) ||
                !Number.isFinite(latitude)
            ) return;

            const marker = L.circleMarker(
                [latitude, longitude],
                {
                    radius: 5,
                    color: "#ff4500",
                    weight: 1,
                    fillColor: "#ff6347",
                    fillOpacity: 0.8
                }
            );

            // Attribute popup
            const popup = document.createElement("div");

            Object.entries(record).forEach(([key, value]) => {

                if (key === geometryField) return;

                const line = document.createElement("div");

                const label = document.createElement("strong");

                label.textContent = key + ": ";

                line.append(
                    label,
                    document.createTextNode(String(value))
                );

                popup.appendChild(line);

            });

            marker.bindPopup(popup);

            marker.addTo(surgeLayer);

            featureCount++;

        });


        // 8. Register Surge overlay
        if (!window.gvkMap) {
            throw new Error("GVK map is not available.");
        }

        window.gvkOverlayLayers =
            window.gvkOverlayLayers || {};

        window.gvkOverlayLayers["Surge"] = surgeLayer;

        window.gvkSurgeLayer = surgeLayer;


        // 9. Add to existing map
        surgeLayer.addTo(window.gvkMap);


        // 10. Refresh layer control
        if (typeof window.addGVKMapControls === "function") {

            window.addGVKMapControls();

        }


        console.log("Surge features displayed:", featureCount);

        console.log("GVK Surge layer successfully added!");

    }
    catch (error) {

        console.error("Surge loading failed:", error);

    }

}


// Start after the existing map initialisation
document.addEventListener(
    "DOMContentLoaded",
    initialiseSurge
);
