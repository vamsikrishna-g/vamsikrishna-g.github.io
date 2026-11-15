
/* =========================================
   GVK CWC BASINS
   Direct FlatGeobuf 4.6.0
   Spatial index + HTTP range queries
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

let cwcLoading = false;
let cwcPending = false;
let cwcRequestId = 0;
let cwcTimer = null;
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

    cwcInitialized = true;

    const map = window.gvkMap;

    // Empty layer; OFF by default.
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
       REGISTER OVERLAY
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
       CURRENT MAP EXTENT
    ===================================== */

    function getBoundingBox() {

        const bounds = map.getBounds();

        return {
            minX: bounds.getWest(),
            minY: bounds.getSouth(),
            maxX: bounds.getEast(),
            maxY: bounds.getNorth()
        };
    }


    /* =====================================
       LOAD VISIBLE BASINS
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

        const bbox = getBoundingBox();

        const features = [];

        console.log("CWC: Spatial query:", bbox);

        try {

            // Query original FGB directly.
            // No CSV export or WKT parsing.

            const iterator = deserialize(
                CWC_FGB_PATH,
                {
                    rect: bbox
                }
            );

            for await (const feature of iterator) {

                if (requestId !== cwcRequestId) {
                    break;
                }

                features.push(feature);
            }

            // Only display results from the latest request.
            if (requestId === cwcRequestId) {

                basinLayer.clearLayers();

                if (features.length > 0) {

                    basinLayer.addData({
                        type: "FeatureCollection",
                        features: features
                    });
                }

                console.log(
                    "CWC: Features in current extent:",
                    features.length
                );
            }

        }
        catch (error) {

            console.error(
                "CWC direct FGB query failed:",
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
            400
        );
    }


    /* =====================================
       MAP EVENTS
    ===================================== */

    map.on("moveend", function () {

        if (map.hasLayer(basinLayer)) {
            scheduleCWCRefresh();
        }
    });

    map.on("overlayadd", function (event) {

        if (event.layer === basinLayer) {
            scheduleCWCRefresh();
        }
    });

    map.on("overlayremove", function (event) {

        if (event.layer === basinLayer) {

            clearTimeout(cwcTimer);

            cwcRequestId++;
            cwcPending = false;

            basinLayer.clearLayers();
        }
    });


    // Do not add basinLayer to the map.
    // CWC Basins remains OFF by default.

    console.log("CWC Basins direct FGB layer initialised.");
}


/* =========================================
   START
========================================= */

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        initialiseCWCBasin,
        { once: true }
    );

} else {

    initialiseCWCBasin();
}
