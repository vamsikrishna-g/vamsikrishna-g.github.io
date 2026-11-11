
document.addEventListener("DOMContentLoaded", () => {

    const element = document.getElementById("map");

    if (!element || typeof L === "undefined" || !window.GVK_BASEMAPS) return;

    // Initialize Leaflet map
    const map = L.map(element, {
        minZoom: 2,
        maxZoom: 19,
        zoomControl: true,
        worldCopyJump: false
    }).setView([28.5, 57], 4.5);

    // Default basemap
    const esri = window.GVK_BASEMAPS.EsriWorldImagery().addTo(map);

    // Register map globally
    window.gvkMap = map;

    // Register basemaps
    window.gvkBaseLayers = {
        "Esri World Imagery": esri,
        "OpenStreetMap": window.GVK_BASEMAPS.OpenStreetMap()
    };

    // Initialize overlay collection
    window.gvkOverlayLayers = {};

    // Create layer control first
    if (typeof window.addGVKMapControls === "function") {
        window.addGVKMapControls();
    }

    // Add Dams overlay
    if (typeof window.addGVKDams === "function") {
        window.addGVKDams();
    }

    // Add BWA overlay
    if (typeof window.addGVKBWA === "function") {
        window.addGVKBWA();
    }

    // Refresh map when its container becomes visible
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
