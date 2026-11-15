
/* =========================================
   GVK CWC BASINS
   Direct FlatGeobuf 4.6.0
   Spatial Index + Leaflet
========================================= */

import { deserialize } from
    "https://esm.sh/flatgeobuf@4.6.0/geojson";

window.gvkCwcbasinLayer = null;

const CWC_FGB_PATH = "./data/CWC_Basin/CWC_Basin.fgb";

const CWC_STYLE = {
    color: "#1769aa",
    weight: 1.5,
    opacity: 0.9,
    fillColor: "#42a5f5",
    fillOpacity: 0.18
};

const CWC_DEBOUNCE = 400;

let cwcTimer = null;
let cwcRequestId = 0;
let cwcLoading = false;
let cwcPending = false;
let cwcInitialized = false;


/* =========================================
   POPUP
========================================= */

function createCWCPopup(properties) {

    const popup = document.createElement("div");

    Object.entries(properties || {}).forEach(
        ([key, value]) => {

            const line = document.createElement("div");
            const label = document.createElement("strong");

            label.textContent = key + ": ";

            line.append(
                label,
                document.createTextNode(String(value ?? ""))
            );

            popup.appendChild(line);
        }
    );

    return popup;
}


/* =========================================
   INITIALISE CWC BASINS
========================================= */

function initialiseCWCBasin() {

    if (cwcInitialized) return;

    if (!window.gvkMap) {
        console.error("CWC: GVK map unavailable.");
        return;
    }

    if (typeof L === "undefined") {
        console.error("CWC: Leaflet unavailable.");
        return;
    }

    cwcInitialized = true;

    const map = window.gvkMap;


    /* =====================================
       CREATE EMPTY LEAFLET LAYER
    ===================================== */

    const basinLayer = L.geoJSON(null, {

        style: CWC_STYLE,

        onEachFeature: function (feature, layer) {

            layer.bindPopup(
                createCWCPopup(feature.properties)
            );
        }
    });

    window.gvkCwcbasinLayer = basinLayer;


    /* =====================================
       REGISTER LAYER CONTROL
    ===================================== */

    window.gvkOverlayLayers =
        window.gvkOverlayLayers || {};

    window.gvkOverlayLayers["CWC Basins"] = basinLayer;

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


    /* =====================================
       GET MAP BOUNDING BOX
    ===================================== */

    function getCWCBounds() {

        const bounds = map.getBounds();

        return {
            minX: bounds.getWest(),
            minY: bounds.getSouth(),
            maxX: bounds.getEast(),
            maxY: bounds.getNorth()
        };
    }


    /* =====================================
       LOAD VISIBLE FEATURES
    ===================================== */

    async function loadVisibleBasins() {

        if (!map.hasLayer(basinLayer)) return;

        if (cwcLoading) {
            cwcPending = true;
            return;
        }

        cwcLoading = true;
        cwcPending = false;

        const requestId = ++cwcRequestId;
        const bbox = getCWCBounds();

        const features = [];

        console.log("CWC: Querying extent:", bbox);

        try {

            // Read original FlatGeobuf directly.
            // The bounding box filters the spatial query.

            const iterator = deserialize(
                CWC_FGB_PATH,
                bbox
            );

            for await (const feature of iterator) {

                if (requestId !== cwcRequestId) {
                    break;
                }

                if (feature && feature.geometry) {
                    features.push(feature);
                }
            }

            // Render only the latest query results.
            if (requestId === cwcRequestId) {

                basinLayer.clearLayers();

                if (features.length > 0) {

                    basinLayer.addData({
                        type: "FeatureCollection",
                        features: features
                    });
                }

                console.log(
                    "CWC: Visible features:",
                    features.length
                );
            }

        }
        catch (error) {

            console.error(
                "CWC: FlatGeobuf query failed:",
                error
            );

        }
        finally {

            cwcLoading = false;

            if (
                cwcPending &&
                map.hasLayer(basinLayer)
            ) {
                scheduleCWCRefresh();
            }
        }
    }


    /* =====================================
       DEBOUNCED REFRESH
    ===================================== */

    function scheduleCWCRefresh() {

        clearTimeout(cwcTimer);

        cwcTimer = setTimeout(
            loadVisibleBasins,
            CWC_DEBOUNCE
        );
    }


    /* =====================================
       MAP EVENTS
    ===================================== */

    // Refresh after pan or zoom.
    map.on("moveend", function () {

        if (map.hasLayer(basinLayer)) {
            scheduleCWCRefresh();
        }
    });


    // Load when CWC Basins is switched ON.
    map.on("overlayadd", function (event) {

        if (event.layer === basinLayer) {
            scheduleCWCRefresh();
        }
    });


    // Clear features when switched OFF.
    map.on("overlayremove", function (event) {

        if (event.layer === basinLayer) {

            clearTimeout(cwcTimer);

            cwcRequestId++;
            cwcPending = false;

            basinLayer.clearLayers();
        }
    });


    // Do not add basinLayer to the map.
    // CWC Basins is OFF by default.

    console.log("CWC Basins direct FGB initialised.");
}


/* =========================================
   START AFTER MAP INITIALISATION
========================================= */

function startCWCBasin() {

    if (!window.gvkMap) {
        console.error("CWC: GVK map unavailable.");
        return;
    }

    initialiseCWCBasin();
}

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        startCWCBasin,
        { once: true }
    );

} else {

    startCWCBasin();
}
