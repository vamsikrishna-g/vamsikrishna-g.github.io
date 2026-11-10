document.addEventListener("DOMContentLoaded", () => {
    const element = document.getElementById("map");
    if (!element || typeof L === "undefined" || !window.GVK_BASEMAPS) return;

    const map = L.map(element, {
        minZoom: 2,
        maxZoom: 19,
        zoomControl: true,
        worldCopyJump: false
    }).setView([20.5937, 78.9629], 5);

    const esri = window.GVK_BASEMAPS.EsriWorldImagery().addTo(map);

    window.gvkMap = map;
    window.gvkBaseLayers = {
        "Esri World Imagery": esri,
        "OpenStreetMap": window.GVK_BASEMAPS.OpenStreetMap()
    };

    // These functions are defined by dams.js and map-controls.js before
    // DOMContentLoaded fires because their scripts are loaded in index.html.
    if (typeof window.addGVKDams === "function") window.addGVKDams();
    if (typeof window.addGVKMapControls === "function") window.addGVKMapControls();

    window.refreshGVKMap = () => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => map.invalidateSize({ pan: false }));
        });
    };

    if (typeof ResizeObserver !== "undefined") {
        const observer = new ResizeObserver(() => {
            if (element.offsetWidth > 0 && element.offsetHeight > 0) {
                map.invalidateSize({ pan: false });
            }
        });
        observer.observe(element);
    }
});
