
document.addEventListener("DOMContentLoaded", () => {

    const element = document.getElementById("map");

    if (!element || typeof L === "undefined" || !window.GVK_BASEMAPS) return;

    const map = L.map(element, {
        minZoom: 2,
        maxZoom: 19,
        zoomControl: true,
        worldCopyJump: false
    }).setView([28.5, 57], 4.5);

    const esri = window.GVK_BASEMAPS.EsriWorldImagery().addTo(map);

    // 1. Register map
    window.gvkMap = map;

    // 2. Register base layers
    window.gvkBaseLayers = {
        "Esri World Imagery": esri,
        "OpenStreetMap": window.GVK_BASEMAPS.OpenStreetMap()
    };

    // 3. Initialise overlay collection
    window.gvkOverlayLayers = {};

    // 4. Create layer control
    if (typeof window.addGVKMapControls === "function") {
        window.addGVKMapControls();
    }

    // 5. Initialise existing Dams layer
    if (typeof window.addGVKDams === "function") {
        window.addGVKDams();
    }

    // 6. Initialise BWA layer
    if (typeof window.addGVKBWA === "function") {
        window.addGVKBWA();
    }

    // 7. Notify other map layers ONLY after initialisation
    window.dispatchEvent(new Event("gvk-map-ready"));

    // 8. Refresh map when Hydrology panel becomes visible
    window.refreshGVKMap = () => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                map.invalidateSize({ pan: false });
            });
        });
    };

    // 9. Observe map container size changes
    if (typeof ResizeObserver !== "undefined") {

        const observer = new ResizeObserver(() => {

            if (element.offsetWidth > 0 && element.offsetHeight > 0) {
                map.invalidateSize({ pan: false });
            }

        });

        observer.observe(element);
    }

    console.log("GVK map and base layers initialised.");

});
