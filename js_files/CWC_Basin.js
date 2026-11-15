
/* =========================================
   GVK CWC BASIN LAYER
   GDAL3.js + FlatGeobuf
========================================= */

window.gvkCwcbasinLayer = null;
window.gvkCwcbasinDataset = null;

const CWC_FGB_PATH = "./data/CWC_Basin/CWC_Basin.fgb";


/* =========================================
   CSV PARSER
========================================= */

function parseCWCCSV(text) {

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
   WKT POLYGON PARSER
   Supports POLYGON and MULTIPOLYGON
========================================= */

function parseCWCWKT(wkt) {

    if (!wkt) return null;

    wkt = wkt.trim();

    const typeMatch = wkt.match(
        /^(MULTIPOLYGON|POLYGON)\s*(?:Z|M|ZM)?\s*/i
    );

    if (!typeMatch) return null;

    const type = typeMatch[1].toUpperCase();

    if (/EMPTY$/i.test(wkt)) return null;

    const body = wkt.slice(typeMatch[0].length);

    const number = "[-+]?(?:\\d+\\.?\\d*|\\.\\d+)(?:[eE][-+]?\\d+)?";

    const parseRing = ringText => {

        const pairs = ringText.split(",");

        const coordinates = [];

        for (const pair of pairs) {

            const values = pair.trim().match(
                new RegExp(number, "g")
            );

            if (!values || values.length < 2) continue;

            const longitude = Number(values[0]);
            const latitude = Number(values[1]);

            if (
                !Number.isFinite(longitude) ||
                !Number.isFinite(latitude)
            ) continue;

            coordinates.push([longitude, latitude]);
        }

        return coordinates.length >= 4 ? coordinates : null;
    };

    const extractRings = polygonText => {

        const rings = [];
        let depth = 0;
        let start = -1;

        for (let i = 0; i < polygonText.length; i++) {

            if (polygonText[i] === "(") {

                depth++;

                if (depth === 2) start = i + 1;
            }
            else if (polygonText[i] === ")") {

                if (depth === 2 && start >= 0) {
                    const ring = parseRing(
                        polygonText.slice(start, i)
                    );

                    if (ring) rings.push(ring);
                }

                depth--;
            }
        }

        return rings;
    };

    const extractPolygons = geometryText => {

        const polygons = [];
        let depth = 0;
        let start = -1;

        for (let i = 0; i < geometryText.length; i++) {

            if (geometryText[i] === "(") {

                depth++;

                if (depth === 1) start = i;
            }
            else if (geometryText[i] === ")") {

                if (depth === 1 && start >= 0) {
                    polygons.push(
                        geometryText.slice(start, i + 1)
                    );
                }

                depth--;
            }
        }

        return polygons;
    };

    if (type === "POLYGON") {

        const rings = extractRings(body);

        return rings.length
            ? { type: "Polygon", coordinates: rings }
            : null;
    }

    const polygonTexts = extractPolygons(body);

    const coordinates = polygonTexts
        .map(extractRings)
        .filter(rings => rings.length > 0);

    return coordinates.length
        ? { type: "MultiPolygon", coordinates }
        : null;
}


/* =========================================
   MAIN CWC BASIN INITIALISATION
========================================= */

async function initialiseCWCBasin() {

    try {

        // 1. Initialise GDAL
        const gdal = window.gvkGDAL || await initGdalJs({
            path: "https://cdn.jsdelivr.net/npm/gdal3.js@2.8.1/dist/package",
            useWorker: false
        });

        window.gvkGDAL = gdal;

        console.log("CWC Basin: GDAL initialised.");


        // 2. Fetch original FGB
        const response = await fetch(CWC_FGB_PATH);

        if (!response.ok) {
            throw new Error(
                `CWC Basin FGB loading failed: ${response.status}`
            );
        }

        const blob = await response.blob();

        const file = new File([blob], "CWC_Basin.fgb");


        // 3. Open original FGB
        const result = await gdal.open(file);

        if (!result.datasets || !result.datasets.length) {
            throw new Error("GDAL could not open CWC_Basin.fgb.");
        }

        const dataset = result.datasets[0];

        window.gvkCwcbasinDataset = dataset;


        // 4. Read dataset information
        const info = await gdal.getInfo(dataset);

        console.log("CWC Basin dataset information:", info);


        // 5. Export temporary CSV with WKT geometry
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

        const records = parseCWCCSV(csvText);

        if (!records.length) {
            throw new Error("No CWC Basin records found.");
        }


        // 6. Find WKT geometry column
        const geometryField = Object.keys(records[0]).find(
            key => key.toUpperCase() === "WKT"
        );

        if (!geometryField) {
            throw new Error("CWC Basin WKT geometry column not found.");
        }


        // 7. Create Leaflet polygon layer
        const basinLayer = L.geoJSON(null, {

            style: function () {

                return {
                    color: "#1769aa",
                    weight: 1.5,
                    opacity: 0.9,
                    fillColor: "#42a5f5",
                    fillOpacity: 0.18
                };
            },

            onEachFeature: function (feature, layer) {

                const popup = document.createElement("div");

                Object.entries(feature.properties || {}).forEach(
                    ([key, value]) => {

                        const line = document.createElement("div");
                        const label = document.createElement("strong");

                        label.textContent = key + ": ";

                        line.append(
                            label,
                            document.createTextNode(String(value))
                        );

                        popup.appendChild(line);
                    }
                );

                layer.bindPopup(popup);
            }
        });


        // 8. Convert WKT geometries into GeoJSON features
        let featureCount = 0;

        records.forEach(record => {

            const geometry = parseCWCWKT(
                record[geometryField]
            );

            if (!geometry) return;

            const properties = { ...record };

            delete properties[geometryField];

            basinLayer.addData({

                type: "Feature",

                geometry: geometry,

                properties: properties
            });

            featureCount++;
        });


        if (featureCount === 0) {
            throw new Error("No valid CWC Basin polygons found.");
        }


        // 9. Register overlay
        if (!window.gvkMap) {
            throw new Error("GVK map is not available.");
        }

        window.gvkOverlayLayers =
            window.gvkOverlayLayers || {};

        window.gvkOverlayLayers["CWC Basins"] = basinLayer;

        window.gvkCwcbasinLayer = basinLayer;


        // 10. Update existing layer control
        if (window.gvkLayerControl) {

            window.gvkLayerControl.addOverlay(
                basinLayer,
                "CWC Basins"
            );

        } else if (
            typeof window.addGVKMapControls === "function"
        ) {

            window.addGVKMapControls();
        }


        // IMPORTANT:
        // Do not call basinLayer.addTo(window.gvkMap).
        // This keeps CWC Basins OFF by default.


        console.log("CWC Basin features loaded:", featureCount);
        console.log("GVK CWC Basin layer successfully added.");

    }
    catch (error) {

        console.error("CWC Basin loading failed:", error);

    }
}


/* =========================================
   START AFTER MAP INITIALISATION
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    initialiseCWCBasin
);
