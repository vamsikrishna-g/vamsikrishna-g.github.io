
import { deserialize } from "https://esm.sh/flatgeobuf@4.6.0/geojson";

const MANIFEST_PATH = "./data/Rivers/rivers.json";
const RIVERS_FOLDER = "./data/Rivers/";
const LAYER_NAME = "Rivers";

const MAX_CONCURRENT = 4;
const DEBOUNCE_MS = 500;

let riverFiles = [];
let riversLayer = null;
let loading = false;
let pendingRefresh = false;
let requestId = 0;
let debounceTimer = null;

// River line style
function riverStyle() {
    return {
        color: "#1687d9",
        weight: 1.5,
        opacity: 0.9
    };
}

// Safe popup creation
function createPopup(properties) {
    const container = document.createElement("div");

    if (!properties || Object.keys(properties).length === 0) {
        container.textContent = "No attributes available";
        return container;
    }

    Object.entries(properties).forEach(([key, value]) => {
        const row = document.createElement("div");
        const label = document.createElement("strong");

        label.textContent = `${key}: `;

        row.appendChild(label);
        row.appendChild(
            document.createTextNode(
                value === null || value === undefined
                    ? ""
                    : String(value)
            )
        );

        container.appendChild(row);
    });

    return container;
}

// Load and validate manifest
async function loadManifest() {
    const response = await fetch(MANIFEST_PATH);

    if (!response.ok) {
        throw new Error(
            `Manifest request failed: ${response.status} ${response.statusText}`
        );
    }

    const files = await response.json();

    if (!Array.isArray(files) || files.length !== 44) {
        throw new Error(
            `Expected 44 river files; received ${
                Array.isArray(files) ? files.length : "invalid manifest"
            }.`
        );
    }

    riverFiles = files;

    console.log(`Rivers: ${riverFiles.length} files found.`);
}

// Query one river file for the current map extent
async function loadOneRiver(filename, bounds, targetLayer) {
    const bbox = [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth()
    ];

    const url = RIVERS_FOLDER + encodeURIComponent(filename);
    const iterator = deserialize(url, { rect: bbox });

    for await (const feature of iterator) {
        if (!feature || !feature.geometry) continue;

        const geoJsonLayer = L.geoJSON(feature, {
            style: riverStyle,

            pointToLayer: (feature, latlng) =>
                L.circleMarker(latlng, {
                    radius: 3,
                    color: "#1687d9",
                    weight: 1,
                    fillOpacity: 0.9
                })
        });

        geoJsonLayer.eachLayer(layer => {
            layer.bindPopup(() =>
                createPopup(feature.properties || {})
            );
        });

        geoJsonLayer.addTo(targetLayer);
    }
}

// Run file queries with limited concurrency
async function runWithConcurrency(items, worker, concurrency, id) {
    let index = 0;

    async function runWorker() {
        while (index < items.length) {
            if (id !== requestId) return;

            const currentIndex = index++;
            const filename = items[currentIndex];

            try {
                await worker(filename);
            } catch (error) {
                console.warn(
                    `Rivers: Failed to load ${filename}:`,
                    error
                );
            }
        }
    }

    const workers = Array.from(
        { length: Math.min(concurrency, items.length) },
        () => runWorker()
    );

    await Promise.all(workers);
}

// Load rivers within the visible map extent
async function loadVisibleRivers() {
    if (!window.gvkMap || !riversLayer) return;

    if (!window.gvkMap.hasLayer(riversLayer)) return;

    if (loading) {
        pendingRefresh = true;
        return;
    }

    loading = true;
    pendingRefresh = false;

    const currentRequest = ++requestId;
    const bounds = window.gvkMap.getBounds();
    const nextLayer = L.featureGroup();

    try {
        await runWithConcurrency(
            riverFiles,
            filename =>
                loadOneRiver(filename, bounds, nextLayer),
            MAX_CONCURRENT,
            currentRequest
        );

        if (
            currentRequest === requestId &&
            window.gvkMap.hasLayer(riversLayer)
        ) {
            riversLayer.clearLayers();
            nextLayer.addTo(riversLayer);

            console.log(
                `Rivers: ${nextLayer.getLayers().length} features loaded.`
            );
        }

    } catch (error) {
        console.error("Rivers: Loading failed:", error);

    } finally {
        loading = false;

        if (
            pendingRefresh &&
            window.gvkMap.hasLayer(riversLayer)
        ) {
            pendingRefresh = false;
            loadVisibleRivers();
        }
    }
}

// Debounce map movement
function scheduleRiverRefresh() {
    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
        loadVisibleRivers();
    }, DEBOUNCE_MS);
}

// Initialise the Rivers overlay
async function initialiseRivers() {
    if (window.gvkRiversInitialised) return;

    if (!window.gvkMap || !window.gvkLayerControl) {
        console.warn("Rivers: Map or layer control unavailable.");
        return;
    }

    window.gvkRiversInitialised = true;

    try {
        await loadManifest();

        riversLayer = L.featureGroup();

        window.gvkOverlayLayers[LAYER_NAME] = riversLayer;

        window.gvkLayerControl.addOverlay(
            riversLayer,
            LAYER_NAME
        );

        window.gvkRiversLayer = riversLayer;

        // Load when enabled
        window.gvkMap.on("overlayadd", event => {
            if (event.layer === riversLayer) {
                loadVisibleRivers();
            }
        });

        // Clear when disabled
        window.gvkMap.on("overlayremove", event => {
            if (event.layer === riversLayer) {
                requestId++;
                pendingRefresh = false;
                clearTimeout(debounceTimer);
                riversLayer.clearLayers();
            }
        });

        // Refresh after pan or zoom
        window.gvkMap.on("moveend", () => {
            if (window.gvkMap.hasLayer(riversLayer)) {
                scheduleRiverRefresh();
            }
        });

        console.log(
            "Rivers: Layer registered successfully (OFF by default)."
        );

    } catch (error) {
        window.gvkRiversInitialised = false;
        console.error("Rivers: Initialisation failed:", error);
    }
}

// Wait for GVK map initialisation
function startRivers() {
    if (window.gvkMap && window.gvkLayerControl) {
        initialiseRivers();
    } else {
        window.addEventListener(
            "gvk-map-ready",
            initialiseRivers,
            { once: true }
        );
    }
}

startRivers();
