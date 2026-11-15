
import { deserialize } from "https://esm.sh/flatgeobuf@4.6.0/geojson";

(() => {

    // -----------------------------------------
    // CONFIGURATION
    // -----------------------------------------

    const COAST_FGB_PATH = "./data/COast/Coast.fgb";
    const LAYER_NAME = "Coastline";

    let map = null;
    let coastLayer = null;
    let requestId = 0;
    let initialized = false;

    // -----------------------------------------
    // COASTLINE STYLE
    // -----------------------------------------

    const coastStyle = {
        color: "#ff7043",
        weight: 2,
        opacity: 0.95
    };

    // -----------------------------------------
    // POPUP
    // -----------------------------------------

    function createPopup(feature) {

        const properties = feature.properties || {};
        const popup = document.createElement("div");

        const heading = document.createElement("strong");
        heading.textContent = "Coastline";
        popup.appendChild(heading);

        for (const [key, value] of Object.entries(properties)) {

            if (
                value === null ||
                value === undefined ||
                value === ""
            ) {
                continue;
            }

            const line = document.createElement("div");
            const label = document.createElement("strong");

            label.textContent = key + ": ";

            line.append(
                label,
                document.createTextNode(String(value))
            );

            popup.appendChild(line);
        }

        return popup;
    }

    // -----------------------------------------
    // LOAD VISIBLE COASTLINE FEATURES
    // -----------------------------------------

    async function loadVisibleCoast() {

        if (
            !map ||
            !coastLayer ||
            !map.hasLayer(coastLayer)
        ) {
            return;
        }

        const currentRequest = ++requestId;

        const bounds = map.getBounds();

        const bbox = {
            minX: bounds.getWest(),
            minY: bounds.getSouth(),
            maxX: bounds.getEast(),
            maxY: bounds.getNorth()
        };

        console.log("Coast: Querying map extent:", bbox);

        // Clear previous viewport features.
        coastLayer.clearLayers();

        try {

            const iterator = deserialize(
                COAST_FGB_PATH,
                {
                    rect: bbox
                }
            );

            let featureCount = 0;

            for await (const feature of iterator) {

                // Ignore outdated requests.
                if (currentRequest !== requestId) {
                    return;
                }

                if (!feature || !feature.geometry) {
                    continue;
                }

                L.geoJSON(feature, {

                    style: coastStyle,

                    onEachFeature: function (feature, layer) {
                        layer.bindPopup(createPopup(feature));
                    }

                }).addTo(coastLayer);

                featureCount++;
            }

            if (currentRequest !== requestId) {
                return;
            }

            console.log(
                "Coast: Features displayed:",
                featureCount
            );

        } catch (error) {

            if (currentRequest === requestId) {
                console.error(
                    "Coast: FlatGeobuf query failed:",
                    error
                );
            }
        }
    }

    // -----------------------------------------
    // INITIALIZE COASTLINE
    // -----------------------------------------

    function initialiseCoast() {

        if (initialized) {
            return;
        }

        if (!window.gvkMap || !window.gvkLayerControl) {
            console.error(
                "Coast: GVK map or layer control unavailable."
            );
            return;
        }

        map = window.gvkMap;

        // Create empty layer: OFF by default.
        coastLayer = L.layerGroup();

        window.gvkOverlayLayers =
            window.gvkOverlayLayers || {};

        window.gvkOverlayLayers[LAYER_NAME] = coastLayer;

        // Register in existing layer control.
        window.gvkLayerControl.addOverlay(
            coastLayer,
            LAYER_NAME
        );

        // Load when enabled.
        coastLayer.on("add", function () {
            loadVisibleCoast();
        });

        // Cancel requests and clear when disabled.
        coastLayer.on("remove", function () {
            requestId++;
            coastLayer.clearLayers();
        });

        // Refresh after pan or zoom.
        map.on("moveend", function () {

            if (map.hasLayer(coastLayer)) {
                loadVisibleCoast();
            }

        });

        initialized = true;

        console.log(
            "Coast: Layer registered successfully (OFF by default)."
        );
    }

    // -----------------------------------------
    // START
    // -----------------------------------------

    function startCoast() {

        if (window.gvkMap && window.gvkLayerControl) {
            initialiseCoast();
            return;
        }

        console.log(
            "Coast: Waiting for GVK map and layer control..."
        );

        window.addEventListener(
            "gvk-map-ready",
            initialiseCoast,
            { once: true }
        );
    }

    startCoast();

})();
