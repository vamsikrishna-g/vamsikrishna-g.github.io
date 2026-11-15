
import { deserialize } from "https://esm.sh/flatgeobuf@4.6.0/geojson";

(() => {

    // -----------------------------------------
    // CONFIGURATION
    // -----------------------------------------

    const FGB_PATH = "./data/NIO_Obs/NIO_Observation.fgb";
    const LAYER_NAME = "NIO Observations";

    let map = null;
    let observationLayer = null;
    let requestId = 0;
    let initialized = false;

    // -----------------------------------------
    // STYLES
    // -----------------------------------------

    const observationStyle = {
        color: "#e65100",
        weight: 1.5,
        opacity: 0.9,
        fillColor: "#ff9800",
        fillOpacity: 0.5
    };

    // -----------------------------------------
    // POPUP
    // -----------------------------------------

    function createPopup(feature) {

        const popup = document.createElement("div");

        const heading = document.createElement("strong");
        heading.textContent = "NIO Observation";
        popup.appendChild(heading);

        Object.entries(feature.properties || {}).forEach(
            ([key, value]) => {

                if (
                    value === null ||
                    value === undefined ||
                    value === ""
                ) return;

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
    // LOAD VISIBLE OBSERVATIONS
    // -----------------------------------------

    async function loadVisibleObservations() {

        if (
            !map ||
            !observationLayer ||
            !map.hasLayer(observationLayer)
        ) return;

        const currentRequest = ++requestId;

        const bounds = map.getBounds();

        const bbox = {
            minX: bounds.getWest(),
            minY: bounds.getSouth(),
            maxX: bounds.getEast(),
            maxY: bounds.getNorth()
        };

        console.log("NIO: Querying extent:", bbox);

        observationLayer.clearLayers();

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

                    style: observationStyle,

                    pointToLayer: function (feature, latlng) {

                        return L.circleMarker(latlng, {
                            radius: 5,
                            color: "#e65100",
                            weight: 1,
                            fillColor: "#ff9800",
                            fillOpacity: 0.85
                        });

                    },

                    onEachFeature: function (feature, layer) {
                        layer.bindPopup(createPopup(feature));
                    }

                }).addTo(observationLayer);

                featureCount++;
            }

            if (currentRequest !== requestId) {
                return;
            }

            console.log(
                "NIO: Observations displayed:",
                featureCount
            );

        } catch (error) {

            if (currentRequest === requestId) {
                console.error(
                    "NIO: FlatGeobuf query failed:",
                    error
                );
            }
        }
    }

    // -----------------------------------------
    // INITIALIZE LAYER
    // -----------------------------------------

    function initialiseNIO() {

        if (initialized) return;

        if (!window.gvkMap || !window.gvkLayerControl) {
            console.error(
                "NIO: GVK map or layer control unavailable."
            );
            return;
        }

        map = window.gvkMap;

        observationLayer = L.layerGroup();

        window.gvkOverlayLayers =
            window.gvkOverlayLayers || {};

        window.gvkOverlayLayers[LAYER_NAME] =
            observationLayer;

        window.gvkLayerControl.addOverlay(
            observationLayer,
            LAYER_NAME
        );

        // Load when enabled.
        observationLayer.on("add", function () {
            loadVisibleObservations();
        });

        // Clear and invalidate when disabled.
        observationLayer.on("remove", function () {
            requestId++;
            observationLayer.clearLayers();
        });

        // Refresh after map movement.
        map.on("moveend", function () {

            if (map.hasLayer(observationLayer)) {
                loadVisibleObservations();
            }

        });

        initialized = true;

        console.log(
            "NIO: Observation layer registered (OFF by default)."
        );
    }

    // -----------------------------------------
    // START
    // -----------------------------------------

    function startNIO() {

        if (window.gvkMap && window.gvkLayerControl) {
            initialiseNIO();
            return;
        }

        console.log("NIO: Waiting for GVK map...");

        window.addEventListener(
            "gvk-map-ready",
            initialiseNIO,
            { once: true }
        );
    }

    startNIO();

})();
