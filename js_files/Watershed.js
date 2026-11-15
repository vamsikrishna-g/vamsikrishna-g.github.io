
import { deserialize } from "https://esm.sh/flatgeobuf@4.6.0/geojson";

const MANIFEST_PATH = "./data/Watershed/watersheds.json";
const WATERSHED_FOLDER = "./data/Watershed/";
const LAYER_NAME = "Watershed";

const MAX_CONCURRENT = 4;
const DEBOUNCE_MS = 500;

let watershedFiles = [];
let watershedLayer = null;
let loading = false;
let pendingRefresh = false;
let requestId = 0;
let debounceTimer = null;

function watershedStyle() {
    return {
        color: "#f39c12",
        weight: 1.2,
        opacity: 0.9,
        fillColor: "#f1c40f",
        fillOpacity: 0.12
    };
}

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

async function loadManifest() {
    const response = await fetch(MANIFEST_PATH);

    if (!response.ok) {
        throw new Error(
            `Manifest request failed: ${response.status} ${response.statusText}`
        );
    }

    const files = await response.json();

    if (!Array.isArray(files) || files.length !== 102) {
        throw new Error(
            `Expected 102 watershed files; received ${
                Array.isArray(files) ? files.length : "invalid manifest"
            }.`
        );
    }

    watershedFiles = files;
    console.log(`Watershed: ${watershedFiles.length} files found.`);
}

async function loadOneWatershed(filename, bounds, targetLayer) {
    const bbox = [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth()
    ];

    const url = WATERSHED_FOLDER + encodeURIComponent(filename);
    const iterator = deserialize(url, { rect: bbox });

    for await (const feature of iterator) {
        if (!feature || !feature.geometry) continue;

        const geoJsonLayer = L.geoJSON(feature, {
            style: watershedStyle,
            pointToLayer: (feature, latlng) =>
                L.circleMarker(latlng, {
                    radius: 4,
                    color: "#d35400",
                    weight: 1,
                    fillOpacity: 0.8
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
                    `Watershed: Failed to load ${filename}:`,
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

async function loadVisibleWatersheds() {
    if (!window.gvkMap || !watershedLayer) return;

    if (!window.gvkMap.hasLayer(watershedLayer)) return;

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
            watershedFiles,
            filename =>
                loadOneWatershed(filename, bounds, nextLayer),
            MAX_CONCURRENT,
            currentRequest
        );

        if (
            currentRequest === requestId &&
            window.gvkMap.hasLayer(watershedLayer)
        ) {
            watershedLayer.clearLayers();
            nextLayer.addTo(watershedLayer);

            console.log(
                `Watershed: ${nextLayer.getLayers().length} features loaded.`
            );
        }
    } catch (error) {
        console.error("Watershed: Loading failed:", error);
    } finally {
        loading = false;

        if (pendingRefresh && window.gvkMap.hasLayer(watershedLayer)) {
            pendingRefresh = false;
            loadVisibleWatersheds();
        }
    }
}

function scheduleWatershedRefresh() {
    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
        loadVisibleWatersheds();
    }, DEBOUNCE_MS);
}

async function initialiseWatershed() {
    if (window.gvkWatershedInitialised) return;

    if (!window.gvkMap || !window.gvkLayerControl) {
        console.warn("Watershed: Map or layer control unavailable.");
        return;
    }

    window.gvkWatershedInitialised = true;

    try {
        await loadManifest();

        watershedLayer = L.featureGroup();

        window.gvkOverlayLayers[LAYER_NAME] = watershedLayer;
        window.gvkLayerControl.addOverlay(
            watershedLayer,
            LAYER_NAME
        );

        window.gvkWatershedLayer = watershedLayer;

        window.gvkMap.on(
            "overlayadd",
            event => {
                if (event.layer === watershedLayer) {
                    loadVisibleWatersheds();
                }
            }
        );

        window.gvkMap.on(
            "overlayremove",
            event => {
                if (event.layer === watershedLayer) {
                    requestId++;
                    pendingRefresh = false;
                    clearTimeout(debounceTimer);
                    watershedLayer.clearLayers();
                }
            }
        );

        window.gvkMap.on(
            "moveend",
            () => {
                if (window.gvkMap.hasLayer(watershedLayer)) {
                    scheduleWatershedRefresh();
                }
            }
        );

        console.log(
            "Watershed: Layer registered successfully (OFF by default)."
        );

    } catch (error) {
        window.gvkWatershedInitialised = false;
        console.error("Watershed: Initialisation failed:", error);
    }
}

function startWatershed() {
    if (window.gvkMap && window.gvkLayerControl) {
        initialiseWatershed();
    } else {
        window.addEventListener(
            "gvk-map-ready",
            initialiseWatershed,
            { once: true }
        );
    }
}

startWatershed();
