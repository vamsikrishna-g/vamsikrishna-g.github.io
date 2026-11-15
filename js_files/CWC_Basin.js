
import { deserialize } from "https://esm.sh/flatgeobuf@4.6.0/geojson";

(() => {

    // --------------------------------------------------
    // Configuration
    // --------------------------------------------------

    const CWC_FGB_PATH = "./data/CWC_Basin/CWC_Basin.fgb";
    const LAYER_NAME = "CWC Basins";

    let map = null;
    let basinLayer = null;
    let requestId = 0;
    let initialized = false;

    // --------------------------------------------------
    // Styling
    // --------------------------------------------------

    const basinStyle = {
        color: "#1687c9",
        weight: 1.2,
        opacity: 0.9,
        fillColor: "#38a9e0",
        fillOpacity: 0.18
    };

    // --------------------------------------------------
    // Popup
    // --------------------------------------------------

    function createPopup(feature) {

        const properties = feature.properties || {};

        let content = "<b>CWC Basin</b>";

        for (const [key, value] of Object.entries(properties)) {

            if (value === null || value === undefined || value === "") {
                continue;
            }

            content += `<br><b>${key}:</b> ${String(value)}`;
        }

        return content;
    }

    // --------------------------------------------------
    // Load basins intersecting the current map view
    // --------------------------------------------------

    async function loadVisibleBasins() {

        if (!map || !basinLayer || !map.hasLayer(basinLayer)) {
            return;
        }

        const currentRequest = ++requestId;

        const bounds = map.getBounds();

        // FlatGeobuf rectangle coordinates:
        // minX = west, minY = south,
        // maxX = east, maxY = north.

        const bbox = {
            minX: bounds.getWest(),
            minY: bounds.getSouth(),
            maxX: bounds.getEast(),
            maxY: bounds.getNorth()
        };

        console.log("CWC: Loading basins for map extent:", bbox);

        // Remove features from the previous map extent.
        basinLayer.clearLayers();

        try {

            // FlatGeobuf 4.6.0 requires rect inside options.
            const iterator = deserialize(CWC_FGB_PATH, {
                rect: bbox
            });

            let featureCount = 0;

            for await (const feature of iterator) {

                // Ignore results from an older map request.
                if (currentRequest !== requestId) {
                    return;
                }

                if (!feature || !feature.geometry) {
                    continue;
                }

                L.geoJSON(feature, {

                    style: basinStyle,

                    onEachFeature: function (feature, layer) {
                        layer.bindPopup(createPopup(feature));
                    }

                }).addTo(basinLayer);

                featureCount++;
            }

            // Do not report an outdated request.
            if (currentRequest !== requestId) {
                return;
            }

            console.log(
                "CWC: Basin features displayed:",
                featureCount
            );

        } catch (error) {

            if (currentRequest === requestId) {
                console.error(
                    "CWC: FlatGeobuf query failed:",
                    error
                );
            }
        }
    }

    // --------------------------------------------------
    // Initialize CWC layer
    // --------------------------------------------------

    function initialiseCWCBasin() {

        if (initialized) {
            return;
        }

        if (!window.gvkMap) {
            console.error("CWC: GVK map unavailable.");
            return;
        }

        if (typeof L === "undefined") {
            console.error("CWC: Leaflet unavailable.");
            return;
        }

        map = window.gvkMap;

        // Create the layer without adding it to the map.
        // Therefore, it remains OFF by default.
        basinLayer = L.layerGroup();

        // Register it in the GVK overlay collection.
        window.gvkOverlayLayers = window.gvkOverlayLayers || {};
        window.gvkOverlayLayers[LAYER_NAME] = basinLayer;

        // Add it to the existing layer control.
        if (window.gvkLayerControl) {

            window.gvkLayerControl.addOverlay(
                basinLayer,
                LAYER_NAME
            );

        } else {

            console.warn(
                "CWC: Layer control unavailable; overlay registered but not displayed in control."
            );
        }

        // Load features when the user switches the layer ON.
        basinLayer.on("add", function () {
            loadVisibleBasins();
        });

        // Invalidate previous requests when the layer is switched OFF.
        basinLayer.on("remove", function () {
            requestId++;
            basinLayer.clearLayers();
        });

        // Reload the visible extent after map movement,
        // but only while the CWC layer is ON.
        map.on("moveend", function () {

            if (map.hasLayer(basinLayer)) {
                loadVisibleBasins();
            }

        });

        initialized = true;

        console.log(
            "CWC: Basin layer registered successfully (OFF by default)."
        );
    }

    // --------------------------------------------------
    // Wait for GVK map initialization
    // --------------------------------------------------

    function startCWCBasin() {

        if (window.gvkMap && window.gvkLayerControl) {
            initialiseCWCBasin();
            return;
        }

        console.log("CWC: Waiting for GVK map and layer control...");

        window.addEventListener(
            "gvk-map-ready",
            initialiseCWCBasin,
            { once: true }
        );
    }

    startCWCBasin();

})();
