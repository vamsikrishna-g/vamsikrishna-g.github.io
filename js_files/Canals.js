
/* =========================================
   GVK CANALS
   28 FlatGeobuf files
   Direct spatial-index queries
   Leaflet viewport loading
========================================= */

window.gvkCanalsLayer = null;

const CANALS_CONFIG = {
    manifest: "./data/Canals/canals.json",
    folder: "./data/Canals/",

    // Maximum simultaneous FGB queries
    concurrency: 4,

    // Wait after map movement before querying
    debounce: 500,

    style: {
        color: "#00a6a6",
        weight: 1.5,
        opacity: 0.9,
        fillOpacity: 0.15
    }
};

let canalFiles = [];
let canalRequestId = 0;
let canalTimer = null;
let canalLoading = false;
let canalPending = false;
let canalInitialized = false;


/* =========================================
   INITIALISE CANALS
========================================= */

async function initialiseCanals() {

    if (canalInitialized) return;

    if (!window.gvkMap) {
        console.error("Canals: GVK map is unavailable.");
        return;
    }

    if (typeof flatgeobuf === "undefined") {
        console.error("Canals: FlatGeobuf library is unavailable.");
        return;
    }

    canalInitialized = true;

    const map = window.gvkMap;

    // Empty group shown in the layer control.
    const canalsLayer = L.layerGroup();

    window.gvkCanalsLayer = canalsLayer;

    window.gvkOverlayLayers =
        window.gvkOverlayLayers || {};

    window.gvkOverlayLayers["Canals"] = canalsLayer;


    /* =====================================
       REGISTER LAYER CONTROL
    ===================================== */

    if (window.gvkLayerControl) {

        window.gvkLayerControl.addOverlay(
            canalsLayer,
            "Canals"
        );

    } else if (
        typeof window.addGVKMapControls === "function"
    ) {

        window.addGVKMapControls();
    }


    /* =====================================
       LOAD FILE MANIFEST
    ===================================== */

    try {

        const response = await fetch(CANALS_CONFIG.manifest);

        if (!response.ok) {
            throw new Error(
                `Manifest loading failed: ${response.status}`
            );
        }

        const files = await response.json();

        if (!Array.isArray(files) || files.length === 0) {
            throw new Error("Canal manifest is empty or invalid.");
        }

        canalFiles = files.map(name =>
            CANALS_CONFIG.folder + name
        );

        console.log(
            `Canals: ${canalFiles.length} FGB files registered.`
        );

    }
    catch (error) {

        console.error("Canals manifest error:", error);
        return;
    }


    /* =====================================
       CURRENT MAP BOUNDING BOX
    ===================================== */

    function getCanalBounds() {

        const bounds = map.getBounds();

        return {
            minX: bounds.getWest(),
            minY: bounds.getSouth(),
            maxX: bounds.getEast(),
            maxY: bounds.getNorth()
        };
    }


    /* =====================================
       QUERY ONE FGB FILE
    ===================================== */

    async function queryCanalFile(url, bbox, targetLayer, requestId) {

        let count = 0;

        try {

            // FlatGeobuf uses its internal spatial index.
            // The rect filter allows range-based retrieval.
            const iterator = flatgeobuf.deserialize(
                url,
                {
                    rect: bbox
                }
            );

            for await (const feature of iterator) {

                // Ignore results from outdated map extents.
                if (requestId !== canalRequestId) {
                    break;
                }

                if (!feature || !feature.geometry) continue;

                L.geoJSON(feature, {
                    style: CANALS_CONFIG.style,

                    onEachFeature: function (feature, layer) {

                        const popup = document.createElement("div");

                        Object.entries(
                            feature.properties || {}
                        ).forEach(([key, value]) => {

                            const line = document.createElement("div");
                            const label = document.createElement("strong");

                            label.textContent = key + ": ";

                            line.append(
                                label,
                                document.createTextNode(
                                    String(value ?? "")
                                )
                            );

                            popup.appendChild(line);
                        });

                        layer.bindPopup(popup);
                    }

                }).addTo(targetLayer);

                count++;
            }

        }
        catch (error) {

            // One failed file should not stop the other 27.
            console.error(
                "Canal file query failed:",
                url,
                error
            );
        }

        return count;
    }


    /* =====================================
       QUERY ALL FILES
       WITH LIMITED CONCURRENCY
    ===================================== */

    async function loadVisibleCanals() {

        if (!map.hasLayer(canalsLayer)) return;

        if (canalLoading) {
            canalPending = true;
            return;
        }

        canalLoading = true;
        canalPending = false;

        const requestId = ++canalRequestId;

        const bbox = getCanalBounds();

        // Build a temporary group. Keep old features visible
        // until the new query finishes.
        const nextLayer = L.layerGroup();

        let totalFeatures = 0;
        let nextFileIndex = 0;

        console.log("Canals: querying visible extent", bbox);

        async function worker() {

            while (true) {

                if (requestId !== canalRequestId) return;

                const index = nextFileIndex++;

                if (index >= canalFiles.length) return;

                const url = canalFiles[index];

                const count = await queryCanalFile(
                    url,
                    bbox,
                    nextLayer,
                    requestId
                );

                totalFeatures += count;
            }
        }

        try {

            const workerCount = Math.min(
                CANALS_CONFIG.concurrency,
                canalFiles.length
            );

            await Promise.all(
                Array.from(
                    { length: workerCount },
                    () => worker()
                )
            );

            // Do not display stale results.
            if (requestId !== canalRequestId) return;

            // Replace previous visible features.
            canalsLayer.clearLayers();

            nextLayer.eachLayer(layer => {
                canalsLayer.addLayer(layer);
            });

            console.log(
                "Canals: visible features:",
                totalFeatures
            );

        }
        catch (error) {

            console.error("Canal loading error:", error);

        }
        finally {

            canalLoading = false;

            if (
                canalPending &&
                map.hasLayer(canalsLayer)
            ) {
                scheduleCanalRefresh();
            }
        }
    }


    /* =====================================
       DEBOUNCED REFRESH
    ===================================== */

    function scheduleCanalRefresh() {

        clearTimeout(canalTimer);

        canalTimer = setTimeout(
            loadVisibleCanals,
            CANALS_CONFIG.debounce
        );
    }


    /* =====================================
       MAP EVENTS
    ===================================== */

    // Reload features after pan or zoom.
    map.on("moveend", function () {

        if (map.hasLayer(canalsLayer)) {
            scheduleCanalRefresh();
        }
    });


    // User enables Canals in layer control.
    map.on("overlayadd", function (event) {

        if (event.layer === canalsLayer) {
            scheduleCanalRefresh();
        }
    });


    // User disables Canals.
    map.on("overlayremove", function (event) {

        if (event.layer === canalsLayer) {

            clearTimeout(canalTimer);

            // Invalidate any previous query.
            canalRequestId++;

            canalPending = false;

            canalsLayer.clearLayers();

        }
    });


    // OFF by default.
    // Do not add canalsLayer to the map.

    console.log("GVK Canals layer initialised.");
}


/* =========================================
   START
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    initialiseCanals
);
