
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

    window.gvkMap = map;

    window.gvkBaseLayers = {
        "Esri World Imagery": esri,
        "OpenStreetMap": window.GVK_BASEMAPS.OpenStreetMap()
    };

    // Initialize overlay collection
    window.gvkOverlayLayers = {};

    // Create the layer control
    if (typeof window.addGVKMapControls === "function") {
        window.addGVKMapControls();
    }

    // Add existing Dams layer
    if (typeof window.addGVKDams === "function") {
        window.addGVKDams();
    }

    // Add new BWA layer
    if (typeof window.addGVKBWA === "function") {
        window.addGVKBWA();
    }

    // Refresh map when Hydrology panel becomes visible
    window.refreshGVKMap = () => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                map.invalidateSize({ pan: false });
            });
        });
    };

    // Observe map container size changes
    if (typeof ResizeObserver !== "undefined") {

        const observer = new ResizeObserver(() => {

            if (element.offsetWidth > 0 && element.offsetHeight > 0) {
                map.invalidateSize({ pan: false });
            }

        });

        observer.observe(element);
    }

});
