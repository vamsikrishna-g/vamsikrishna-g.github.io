
import { deserialize } from "https://esm.sh/flatgeobuf@4.6.0/geojson";
import { booleanWithin } from "https://esm.sh/@turf/boolean-within@7.2.0";
import { booleanIntersects } from "https://esm.sh/@turf/boolean-intersects@7.2.0";

// ==================================================
// GVK SPATIAL SELECTION
// ==================================================

const MAX_CONCURRENT = 3;

const DATASETS = [
    {
        name: "Rivers",
        folder: "./data/Rivers/",
        manifest: "./data/Rivers/rivers.json"
    },
    {
        name: "Watershed",
        folder: "./data/Watershed/",
        manifest: "./data/Watershed/watersheds.json"
    },
    {
        name: "Canals",
        folder: "./data/Canals/",
        manifest: "./data/Canals/canals.json"
    },
    {
        name: "Coast",
        folder: "./data/Coast/",
        files: ["Coast.fgb"]
    },
    {
        name: "CWC Basin",
        folder: "./data/CWC_Basin/",
        files: ["CWC_Basin.fgb"]
    },
    {
        name: "CWC Subbasins",
        folder: "./data/CWC_Subbasins/",
        manifest: "./data/CWC_Subbasins/cwc_subbasins.json"
    },
    {
        name: "NIO Observation",
        folder: "./data/NIO_Observation/",
        files: ["NIO_Observations.fgb"]
    },
    {
        name: "Met_Sub",
        folder: "./data/Met_Sub/",
        files: ["Met_Sub.fgb"]
    }
];

// ==================================================
// GLOBAL VARIABLES
// ==================================================

let map = null;
let drawnItems = null;
let selectedAOI = null;

let resultsLayer = null;

let queryRunning = false;
let queryId = 0;

let queryMode = "intersects";

let gdalInstance = null;

// ==================================================
// LOAD DATASET FILE LISTS
// ==================================================

async function loadDatasetFiles() {

    for (const dataset of DATASETS) {

        if (dataset.files) continue;

        const response = await fetch(dataset.manifest);

        if (!response.ok) {
            throw new Error(
                `${dataset.name}: Manifest failed (${response.status})`
            );
        }

        const files = await response.json();

        if (!Array.isArray(files)) {
            throw new Error(
                `${dataset.name}: Invalid manifest format`
            );
        }

        dataset.files = files;
    }

    console.log(
        "GVK Spatial Selection: Dataset manifests loaded.",
        DATASETS.map(dataset => ({
            name: dataset.name,
            files: dataset.files.length
        }))
    );
}

// ==================================================
// CREATE RESULTS OVERLAY
// ==================================================

function createResultsLayer() {

    resultsLayer = L.featureGroup();

    window.gvkOverlayLayers["Spatial Selection Results"] =
        resultsLayer;

    window.gvkLayerControl.addOverlay(
        resultsLayer,
        "Spatial Selection Results"
    );

    window.gvkSpatialResultsLayer = resultsLayer;
}

// ==================================================
// VALIDATE AOI
// ==================================================

function getAOIGeoJSON() {

    if (!selectedAOI) {
        throw new Error(
            "Draw or select a polygon or rectangle first."
        );
    }

    const aoi = selectedAOI.toGeoJSON();

    if (
        !aoi.geometry ||
        !["Polygon", "MultiPolygon"].includes(
            aoi.geometry.type
        )
    ) {
        throw new Error(
            "Spatial selection requires a polygon or rectangle."
        );
    }

    return aoi;
}

// ==================================================
// CREATE POPUP
// ==================================================

function createPopup(properties, source) {

    const container = document.createElement("div");

    const heading = document.createElement("strong");
    heading.textContent = source;

    container.appendChild(heading);

    Object.entries(properties || {}).forEach(
        ([key, value]) => {

            if (key === "_gvk_source") return;

            const row = document.createElement("div");

            const label = document.createElement("strong");
            label.textContent = `${key}: `;

            row.appendChild(label);

            row.appendChild(
                document.createTextNode(
                    value == null ? "" : String(value)
                )
            );

            container.appendChild(row);
        }
    );

    return container;
}

// ==================================================
// EXACT SPATIAL PREDICATE
// ==================================================

function matchesAOI(feature, aoi) {

    if (!feature || !feature.geometry) {
        return false;
    }

    try {

        if (queryMode === "within") {
            return booleanWithin(feature, aoi);
        }

        return booleanIntersects(feature, aoi);

    } catch (error) {

        console.warn(
            "Spatial predicate failed for feature:",
            error
        );

        return false;
    }
}

// ==================================================
// ADD MATCHING FEATURE TO RESULTS
// ==================================================

function addResult(feature, datasetName) {

    const result = {
        type: "Feature",
        geometry: feature.geometry,

        properties: {
            ...(feature.properties || {}),
            _gvk_source: datasetName
        }
    };

    if (feature.id !== undefined) {
        result.id = feature.id;
    }

    const layer = L.geoJSON(result, {

        style: function (feature) {

            const type = feature.geometry?.type || "";

            if (
                type.includes("Line")
            ) {
                return {
                    color: "#e67e22",
                    weight: 2.5,
                    opacity: 0.95
                };
            }

            return {
                color: "#e67e22",
                weight: 2,
                fillColor: "#f39c12",
                fillOpacity: 0.25
            };
        },

        pointToLayer: function (feature, latlng) {

            return L.circleMarker(latlng, {
                radius: 5,
                color: "#c0392b",
                weight: 1.5,
                fillColor: "#f1c40f",
                fillOpacity: 0.9
            });
        }

    });

    layer.eachLayer(function (child) {

        child.bindPopup(function () {

            return createPopup(
                result.properties,
                datasetName
            );

        });

    });

    layer.addTo(resultsLayer);
}

// ==================================================
// QUERY ONE FGB FILE
// ==================================================

async function queryOneFile(
    dataset,
    filename,
    bbox,
    aoi,
    currentQuery,
    counts
) {

    if (currentQuery !== queryId) return;

    const url =
        dataset.folder + encodeURIComponent(filename);

    const iterator = deserialize(url, {
        rect: bbox
    });

    for await (const feature of iterator) {

        if (currentQuery !== queryId) return;

        if (!matchesAOI(feature, aoi)) continue;

        addResult(feature, dataset.name);

        counts[dataset.name]++;
    }
}

// ==================================================
// CONCURRENT FILE PROCESSING
// ==================================================

async function runTasks(
    tasks,
    worker,
    currentQuery,
    failedFiles
) {

    let index = 0;

    async function runWorker() {

        while (
            index < tasks.length &&
            currentQuery === queryId
        ) {

            const task = tasks[index++];

            try {

                await worker(task);

            } catch (error) {

                failedFiles.push(
                    `${task.dataset.name}/${task.filename}`
                );

                console.warn(
                    `Spatial query failed: ${task.dataset.name} / ${task.filename}`,
                    error
                );
            }
        }
    }

    const workers = Array.from(
        {
            length: Math.min(
                MAX_CONCURRENT,
                tasks.length
            )
        },
        () => runWorker()
    );

    await Promise.all(workers);
}

// ==================================================
// RUN SPATIAL QUERY
// ==================================================

async function runSpatialQuery() {

    if (queryRunning) {
        console.warn(
            "GVK Spatial Selection: Query already running."
        );
        return;
    }

    queryRunning = true;

    const currentQuery = ++queryId;

    const status = document.getElementById(
        "gvk-spatial-status"
    );

    const runButton = document.getElementById(
        "gvk-spatial-run"
    );

    try {

        const aoi = getAOIGeoJSON();

        const bounds = L.geoJSON(aoi).getBounds();

        const bbox = [
            bounds.getWest(),
            bounds.getSouth(),
            bounds.getEast(),
            bounds.getNorth()
        ];

        status.textContent =
            "Loading dataset manifests...";

        runButton.disabled = true;

        await loadDatasetFiles();

        if (currentQuery !== queryId) return;

        resultsLayer.clearLayers();

        if (!map.hasLayer(resultsLayer)) {
            resultsLayer.addTo(map);
        }

        const counts = {};
        const tasks = [];
        const failedFiles = [];

        DATASETS.forEach(dataset => {

            counts[dataset.name] = 0;

            dataset.files.forEach(filename => {

                tasks.push({
                    dataset,
                    filename
                });

            });

        });

        status.textContent =
            `Searching ${tasks.length} FGB files...`;

        await runTasks(
            tasks,

            task => queryOneFile(
                task.dataset,
                task.filename,
                bbox,
                aoi,
                currentQuery,
                counts
            ),

            currentQuery,
            failedFiles
        );

        if (currentQuery !== queryId) return;

        const total = Object.values(counts).reduce(
            (sum, value) => sum + value,
            0
        );

        const report = Object.entries(counts)
            .filter(([, count]) => count > 0)
            .map(([name, count]) =>
                `${name}: ${count}`
            );

        let message =
            `${queryMode.toUpperCase()} complete. ` +
            `${total} features selected.\n`;

        message += report.length
            ? report.join(" | ")
            : "No matching features found.";

        if (failedFiles.length > 0) {

            message +=
                `\n\n${failedFiles.length} files could not be read.`;

            console.warn(
                "Files not processed:",
                failedFiles
            );
        }

        status.textContent = message;

        console.log(
            "GVK Spatial Selection Results:",
            counts
        );

    } catch (error) {

        status.textContent = error.message;

        console.error(
            "GVK Spatial Selection:",
            error
        );

    } finally {

        if (currentQuery === queryId) {

            queryRunning = false;
            runButton.disabled = false;
        }
    }
}

// ==================================================
// CLEAR RESULTS
// ==================================================

function clearResults() {

    queryId++;

    queryRunning = false;

    resultsLayer.clearLayers();

    document.getElementById(
        "gvk-spatial-status"
    ).textContent = "Results cleared.";

    document.getElementById(
        "gvk-spatial-run"
    ).disabled = false;

    document.getElementById(
        "gvk-spatial-download"
    ).disabled = false;
}

// ==================================================
// DOWNLOAD SELECTED FEATURES AS GEOPACKAGE
// ==================================================

async function downloadGeoPackage() {

    const status = document.getElementById(
        "gvk-spatial-status"
    );

    const button = document.getElementById(
        "gvk-spatial-download"
    );

    let inputDataset = null;

    try {

        if (
            !resultsLayer ||
            resultsLayer.getLayers().length === 0
        ) {
            throw new Error(
                "No selected features available for export."
            );
        }

        button.disabled = true;

        status.textContent =
            "Preparing GeoPackage...";

        // ------------------------------------------
        // Collect selected features
        // ------------------------------------------

        const geojson = resultsLayer.toGeoJSON();

        if (
            !geojson.features ||
            geojson.features.length === 0
        ) {
            throw new Error(
                "No GeoJSON features available for export."
            );
        }

        // ------------------------------------------
        // Preserve source dataset information
        // ------------------------------------------

        geojson.features.forEach(feature => {

            feature.properties =
                feature.properties || {};

            feature.properties.source_layer =
                feature.properties._gvk_source || "Unknown";

            delete feature.properties._gvk_source;

            // Convert nested attributes to strings
            // for compatibility with GeoPackage fields.

            Object.entries(feature.properties).forEach(
                ([key, value]) => {

                    if (
                        value !== null &&
                        typeof value === "object"
                    ) {
                        feature.properties[key] =
                            JSON.stringify(value);
                    }

                }
            );

        });

        // ------------------------------------------
        // Initialise GDAL
        // ------------------------------------------

        if (!gdalInstance) {

            if (
                typeof window.initGdalJs !== "function"
            ) {
                throw new Error(
                    "GDAL3.js is not available. Check the script in index.html."
                );
            }

            status.textContent =
                "Initialising GDAL...";

            gdalInstance = await window.initGdalJs({

                path:
                    "https://cdn.jsdelivr.net/npm/gdal3.js@2.8.1/dist/package",

                useWorker: false

            });
        }

        // ------------------------------------------
        // Create GeoJSON input file
        // ------------------------------------------

        status.textContent =
            "Preparing GeoJSON input...";

        const geojsonFile = new File(
            [JSON.stringify(geojson)],
            "GVK_Spatial_Selection.geojson",
            {
                type: "application/geo+json"
            }
        );

        // ------------------------------------------
        // Open GeoJSON in GDAL
        // ------------------------------------------

        const opened = await gdalInstance.open(
            geojsonFile
        );

        if (
            !opened ||
            !opened.datasets ||
            opened.datasets.length === 0
        ) {
            throw new Error(
                "GDAL could not open the GeoJSON input."
            );
        }

        inputDataset = opened.datasets[0];

        // ------------------------------------------
        // Convert GeoJSON to GeoPackage
        // ------------------------------------------

        status.textContent =
            "Creating GeoPackage...";

        const outputPath = await gdalInstance.ogr2ogr(

            inputDataset,

            [
                "-f", "GPKG",
                "-nln", "spatial_selection",
                "-nlt", "GEOMETRY",
                "-t_srs", "EPSG:4326"
            ],

            "GVK_Spatial_Selection"

        );

        if (!outputPath) {
            throw new Error(
                "GDAL did not produce a GeoPackage output."
            );
        }

        // ------------------------------------------
        // Read GeoPackage bytes
        // ------------------------------------------

        status.textContent =
            "Preparing download...";

        const bytes = await gdalInstance.getFileBytes(
            outputPath
        );

        if (!bytes || bytes.length === 0) {
            throw new Error(
                "GeoPackage output is empty."
            );
        }

        // ------------------------------------------
        // Trigger browser download
        // ------------------------------------------

        const blob = new Blob(
            [bytes],
            {
                type: "application/geopackage+sqlite3"
            }
        );

        const downloadURL =
            URL.createObjectURL(blob);

        const link = document.createElement("a");

        link.href = downloadURL;

        link.download =
            "GVK_Spatial_Selection.gpkg";

        document.body.appendChild(link);

        link.click();

        link.remove();

        setTimeout(() => {
            URL.revokeObjectURL(downloadURL);
        }, 2000);

        status.textContent =
            `${geojson.features.length} features exported successfully.`;

        console.log(
            "GVK GeoPackage exported:",
            outputPath
        );

    } catch (error) {

        console.error(
            "GeoPackage export failed:",
            error
        );

        status.textContent =
            "GeoPackage export failed: " + error.message;

    } finally {

        if (inputDataset && gdalInstance) {

            try {
                await gdalInstance.close(inputDataset);
            } catch (error) {
                console.warn(
                    "Could not close temporary GDAL dataset:",
                    error
                );
            }
        }

        button.disabled = false;
    }
}

// ==================================================
// SPATIAL SELECTION CONTROL
// ==================================================

function createSpatialControl() {

    const control = L.control({
        position: "topright"
    });

    control.onAdd = function () {

        const container = L.DomUtil.create(
            "div",
            "leaflet-bar gvk-spatial-control"
        );

        container.style.background = "#fff";
        container.style.padding = "10px";
        container.style.width = "230px";
        container.style.fontSize = "13px";

        container.innerHTML = `

            <div style="font-weight:bold; margin-bottom:8px;">
                Spatial Selection
            </div>

            <select
                id="gvk-spatial-mode"
                style="width:100%; margin-bottom:8px;">

                <option value="intersects">
                    Intersects
                </option>

                <option value="within">
                    Within
                </option>

            </select>

            <button
                id="gvk-spatial-run"
                style="width:100%; margin-bottom:6px;">

                Run Selection

            </button>

            <button
                id="gvk-spatial-clear"
                style="width:100%;">

                Clear Results

            </button>

            <button
                id="gvk-spatial-download"
                style="width:100%; margin-top:6px;">

                Download GeoPackage (.gpkg)

            </button>

            <div
                id="gvk-spatial-status"
                style="
                    margin-top:8px;
                    white-space:pre-wrap;
                    overflow-wrap:anywhere;
                ">

                Draw a polygon or rectangle to begin.

            </div>
        `;

        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);

        return container;
    };

    control.addTo(map);

    // ----------------------------------------------
    // Query mode
    // ----------------------------------------------

    document.getElementById(
        "gvk-spatial-mode"
    ).addEventListener("change", event => {

        queryMode = event.target.value;

    });

    // ----------------------------------------------
    // Run selection
    // ----------------------------------------------

    document.getElementById(
        "gvk-spatial-run"
    ).addEventListener(
        "click",
        runSpatialQuery
    );

    // ----------------------------------------------
    // Clear results
    // ----------------------------------------------

    document.getElementById(
        "gvk-spatial-clear"
    ).addEventListener(
        "click",
        clearResults
    );

    // ----------------------------------------------
    // Download GeoPackage
    // ----------------------------------------------

    document.getElementById(
        "gvk-spatial-download"
    ).addEventListener(
        "click",
        downloadGeoPackage
    );
}

// ==================================================
// DRAWING EVENTS
// ==================================================

function registerDrawingEvents() {

    // ----------------------------------------------
    // New drawing created
    // ----------------------------------------------

    map.on(
        L.Draw.Event.CREATED,
        function (event) {

            selectedAOI = event.layer;

            document.getElementById(
                "gvk-spatial-status"
            ).textContent =
                "AOI selected. Choose a predicate and run selection.";

            console.log(
                "GVK Spatial Selection: AOI created.",
                event.layerType
            );
        }
    );

    // ----------------------------------------------
    // Drawing edited
    // ----------------------------------------------

    map.on(
        L.Draw.Event.EDITED,
        function (event) {

            event.layers.eachLayer(function (layer) {

                if (layer === selectedAOI) {

                    selectedAOI = layer;

                    document.getElementById(
                        "gvk-spatial-status"
                    ).textContent =
                        "AOI updated. Run selection again.";
                }

            });

        }
    );

    // ----------------------------------------------
    // Drawing deleted
    // ----------------------------------------------

    map.on(
        L.Draw.Event.DELETED,
        function (event) {

            event.layers.eachLayer(function (layer) {

                if (layer === selectedAOI) {
                    selectedAOI = null;
                }

            });

            if (!selectedAOI) {

                document.getElementById(
                    "gvk-spatial-status"
                ).textContent =
                    "Draw a polygon or rectangle to begin.";
            }

        }
    );
}

// ==================================================
// INITIALISATION
// ==================================================

function initialiseSpatialSelection() {

    if (window.gvkSpatialSelectionInitialised) {
        return;
    }

    if (
        !window.gvkMap ||
        !window.gvkLayerControl ||
        !window.gvkDrawnItems
    ) {

        console.warn(
            "Spatial Selection: Map, layer control or drawing tools unavailable."
        );

        return;
    }

    map = window.gvkMap;

    drawnItems = window.gvkDrawnItems;

    createResultsLayer();

    createSpatialControl();

    registerDrawingEvents();

    window.gvkSpatialSelectionInitialised = true;

    console.log(
        "GVK Spatial Selection initialised successfully."
    );
}

// ==================================================
// WAIT FOR MAP AND DRAWING TOOLS
// ==================================================

function startSpatialSelection() {

    if (
        window.gvkMap &&
        window.gvkLayerControl &&
        window.gvkDrawnItems
    ) {

        initialiseSpatialSelection();

    } else {

        window.addEventListener(
            "gvk-map-ready",
            initialiseSpatialSelection,
            { once: true }
        );
    }
}

startSpatialSelection();
