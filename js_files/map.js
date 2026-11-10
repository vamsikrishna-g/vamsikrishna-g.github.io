document.addEventListener("DOMContentLoaded", () => {
    const element = document.getElementById("map");
    if (!element || typeof L === "undefined") return;

    // Create Leaflet only after its page is visible. This avoids a zero-size
    // hidden-container initialization that can leave the map at zoom 0.
    window.initGVKMap = () => {
        if (window.gvkMap) {
            requestAnimationFrame(() => {
                window.gvkMap.invalidateSize({ pan: false });
                window.gvkMap.setView([20.5937, 78.9629], 5, { animate: false });
            });
            return;
        }

        const map = L.map(element, {
            minZoom: 2,
            maxZoom: 19,
            zoomControl: true,
            worldCopyJump: false
        }).setView([20.5937, 78.9629], 5);

        const layers = window.GVK_BASEMAPS;
        const esri = layers.EsriWorldImagery().addTo(map);

        window.gvkMap = map;
        window.gvkBaseLayers = {
            "Esri World Imagery": esri,
            "OpenStreetMap": layers.OpenStreetMap()
        };

        if (window.addGVKMapControls) window.addGVKMapControls();
        if (window.addGVKDams) window.addGVKDams();

        requestAnimationFrame(() => {
            map.invalidateSize({ pan: false });
            map.setView([20.5937, 78.9629], 5, { animate: false });
        });
    };
});
