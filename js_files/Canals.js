
import { deserialize } from "https://esm.sh/flatgeobuf@4.6.0/geojson";

/* =========================================
   GVK CANALS
   26 FlatGeobuf files
   Direct spatial-index queries
   Leaflet viewport loading
========================================= */

(() => {

    // -------------------------------------
    // CONFIGURATION
    // -------------------------------------

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

    let map = null;
    let canalsLayer = null;

    let canalFiles = [];

    let canalRequestId = 0;
    let canalTimer = null;

    let canalLoading = false;
    let canalPending = false;

    let canalInitialized = false;
    let canalInitializing = false;


    // -------------------------------------
    // INITIALISE CANALS
    // -------------------------------------

    async function initialiseCanals() {

        if (canalInitialized || canalInitializing) {
            return;
        }

        if (!window.gvkMap || !window.gvkLayerControl) {
            console.error(
                "Canals: GVK map or layer control unavailable."
            );
            return;
        }

        canalInitializing = true;

        map = window.gvkMap;

        // ---------------------------------
        // LOAD MANIFEST
        // ---------------------------------

        try {

            const response = await fetch(
                CANALS_CONFIG.manifest
            );

            if (!response.ok) {
                throw new Error(
                    `Manifest loading failed: ${response.status}`
                );
            }

            const files = await response.json();

            if (!Array.isArray(files) || files.length === 0) {
                throw new Error(
                    "Canal manifest is empty or invalid."
                );
            }

            canalFiles = files.map(name =>
                CANALS_CONFIG.folder + name
            );

            console.log(
                `Canals: ${canalFiles.length} FGB files registered.`
            );

        } catch (error) {

            canalInitializing = false;

            console.error(
                "Canals manifest error:",
                error
            );

            return;
        }


        // ---------------------------------
        // CREATE EMPTY LAYER
        // ---------------------------------

        canalsLayer = L.layerGroup();

        window.gvkCanalsLayer = canalsLayer;

        window.gvkOverlayLayers =
            window.gvkOverlayLayers || {};

        window.gvkOverlayLayers["Canals"] = canalsLayer;


        // ---------------------------------
        // REGISTER LAYER CONTROL
        // ---------------------------------

        window.gvkLayerControl.addOverlay(
            canalsLayer,
            "Canals"
        );


        // ---------------------------------
        // CURRENT MAP BOUNDING BOX
        // ---------------------------------

        function getCanalBounds() {

            const bounds = map.getBounds();

            return {
                minX: bounds.getWest(),
                minY: bounds.getSouth(),
                maxX: bounds.getEast(),
                maxY: bounds.getNorth()
            };
        }


        // ---------------------------------
        // QUERY ONE FGB FILE
        // ---------------------------------

        async function queryCanalFile(
            url,
            bbox,
            targetLayer,
            requestId
        ) {

            let count = 0;

            try {

                const iterator = deserialize(url, {
                    rect: bbox
                });

                for await (const feature of iterator) {

                    // Ignore outdated map requests.
                    if (requestId !== canalRequestId) {
                        break;
                    }

                    if (!feature || !feature.geometry) {
                        continue;
                    }

                    L.geoJSON(feature, {

                        style: CANALS_CONFIG.style,

                        onEachFeature: function (feature, layer) {

                            const popup =
                                document.createElement("div");

                            Object.entries(
                                feature.properties || {}
                            ).forEach(([key, value]) => {

                                const line =
                                    document.createElement("div");

                                const label =
                                    document.createElement("strong");

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

            } catch (error) {

                // A failed state file should not stop other files.
                console.error(
                    "Canal file query failed:",
                    url,
                    error
                );
            }

            return count;
        }


        // ---------------------------------
        // QUERY ALL FILES
        // LIMITED CONCURRENCY
        // ---------------------------------

        async function loadVisibleCanals() {

            if (!map.hasLayer(canalsLayer)) {
                return;
            }

            if (canalLoading) {
                canalPending = true;
                return;
            }

            canalLoading = true;
            canalPending = false;

            const requestId = ++canalRequestId;

            const bbox = getCanalBounds();

            // Temporary group:
            // Existing features remain visible until
            // the new viewport query is complete.
            const nextLayer = L.layerGroup();

            let totalFeatures = 0;
            let nextFileIndex = 0;

            console.log(
                "Canals: Querying visible extent:",
                bbox
            );


            async function worker() {

                while (true) {

                    if (requestId !== canalRequestId) {
                        return;
                    }

                    const index = nextFileIndex++;

                    if (index >= canalFiles.length) {
                        return;
                    }

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

                // Do not display outdated results.
                if (requestId !== canalRequestId) {
                    return;
                }

                // Replace previous visible features.
                canalsLayer.clearLayers();

                nextLayer.eachLayer(layer => {
                    canalsLayer.addLayer(layer);
                });

                console.log(
                    "Canals: Visible features:",
                    totalFeatures
                );

            } catch (error) {

                console.error(
                    "Canal loading error:",
                    error
                );

            } finally {

                canalLoading = false;

                // If the map moved during loading,
                // run another query for the latest extent.
                if (
                    canalPending &&
                    map.hasLayer(canalsLayer)
                ) {
                    scheduleCanalRefresh();
                }
            }
        }


        // ---------------------------------
        // DEBOUNCED REFRESH
        // ---------------------------------

        function scheduleCanalRefresh() {

            clearTimeout(canalTimer);

            canalTimer = setTimeout(
                loadVisibleCanals,
                CANALS_CONFIG.debounce
            );
        }


        // ---------------------------------
        // LAYER EVENTS
        // ---------------------------------

        // User enables Canals.
        canalsLayer.on("add", function () {

            scheduleCanalRefresh();

        });


        // User disables Canals.
        canalsLayer.on("remove", function () {

            clearTimeout(canalTimer);

            // Invalidate any previous query.
            canalRequestId++;

            canalPending = false;

            canalsLayer.clearLayers();

        });


        // Reload after map movement.
        map.on("moveend", function () {

            if (map.hasLayer(canalsLayer)) {
                scheduleCanalRefresh();
            }

        });


        // ---------------------------------
        // COMPLETE INITIALIZATION
        // ---------------------------------

        canalInitialized = true;
        canalInitializing = false;

        console.log(
            "GVK Canals layer initialized (OFF by default)."
        );

    }


    // -------------------------------------
    // START
    // -------------------------------------

    function startCanals() {

        if (window.gvkMap && window.gvkLayerControl) {

            initialiseCanals();

            return;
        }

        console.log(
            "Canals: Waiting for GVK map and layer control..."
        );

        window.addEventListener(
            "gvk-map-ready",
            initialiseCanals,
            { once: true }
        );
    }

    startCanals();

})();
