
import { deserialize } from "https://esm.sh/flatgeobuf@4.6.0/geojson";

(() => {

    // -----------------------------------------
    // CONFIGURATION
    // -----------------------------------------

    const FGB_PATH = "./data/Met_Sub/Met_Sub.fgb";
    const LAYER_NAME = "Meteorological Subdivisions";

    let map = null;
    let metSubLayer = null;
    let requestId = 0;
    let initialized = false;

    // -----------------------------------------
    // STYLE
    // -----------------------------------------

    const metSubStyle = {
        color: "#8e44ad",
        weight: 1.5,
        opacity: 0.9,
        fillColor: "#bb8fce",
        fillOpacity: 0.20
    };

    // -----------------------------------------
    // POPUP
    // -----------------------------------------

    function createPopup(feature) {

        const popup = document.createElement("div");

        const heading = document.createElement("strong");
        heading.textContent = "Meteorological Subdivision";
        popup.appendChild(heading);

        Object.entries(feature.properties || {}).forEach(
            ([key, value]) => {

                if (
                    value === null ||
                    value === undefined ||
                    value === ""
                ) {
                    return;
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
        );

        return popup;
    }

    // -----------------------------------------
    // LOAD VISIBLE FEATURES
    // -----------------------------------------

    async function loadVisibleMetSub() {

        if (
            !map ||
            !metSubLayer ||
            !map.hasLayer(metSubLayer)
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

        console.log("Met_Sub: Querying extent:", bbox);

        metSubLayer.clearLayers();

        try {

            const iterator = deserialize(FGB_PATH, {
                rect: bbox
            });

            let featureCount = 0;

            for await (const feature of iterator) {

                if (currentRequest !== requestId) {
                    return;
                }

                if (!feature || !feature.geometry) {
                    continue;
                }

                L.geoJSON(feature, {

                    style: metSubStyle,

                    onEachFeature: function (feature, layer) {
                        layer.bindPopup(createPopup(feature));
                    }

                }).addTo(metSubLayer);

                featureCount++;
            }

            if (currentRequest !== requestId) {
                return;
            }

            console.log(
                "Met_Sub: Features displayed:",
                featureCount
            );

        } catch (error) {

            if (currentRequest === requestId) {
                console.error(
                    "Met_Sub: FlatGeobuf query failed:",
                    error
                );
            }
        }
    }

    // -----------------------------------------
    // INITIALIZE LAYER
    // -----------------------------------------

    function initialiseMetSub() {

        if (initialized) {
            return;
        }

        if (!window.gvkMap || !window.gvkLayerControl) {
            console.error(
                "Met_Sub: GVK map or layer control unavailable."
            );
            return;
        }

        map = window.gvkMap;

        // OFF by default.
        metSubLayer = L.layerGroup();

        window.gvkOverlayLayers =
            window.gvkOverlayLayers || {};

        window.gvkOverlayLayers[LAYER_NAME] = metSubLayer;

        window.gvkLayerControl.addOverlay(
            metSubLayer,
            LAYER_NAME
        );

        // Load when switched ON.
        metSubLayer.on("add", function () {
            loadVisibleMetSub();
        });

        // Clear when switched OFF.
        metSubLayer.on("remove", function () {
            requestId++;
            metSubLayer.clearLayers();
        });

        // Refresh after pan or zoom.
        map.on("moveend", function () {

            if (map.hasLayer(metSubLayer)) {
                loadVisibleMetSub();
            }

        });

        initialized = true;

        console.log(
            "Met_Sub: Layer registered successfully (OFF by default)."
        );
    }

    // -----------------------------------------
    // START
    // -----------------------------------------

    function startMetSub() {

        if (window.gvkMap && window.gvkLayerControl) {
            initialiseMetSub();
            return;
        }

        console.log("Met_Sub: Waiting for GVK map...");

        window.addEventListener(
            "gvk-map-ready",
            initialiseMetSub,
            { once: true }
        );
    }

    startMetSub();

})();
