document.addEventListener("DOMContentLoaded", () => {
    const element = document.getElementById("map");
    if (!element || typeof L === "undefined") return;

    const map = L.map(element).setView([22.5, 78.9], 5);
    const layers = window.GVK_BASEMAPS;

    // Esri World Imagery is the default basemap
    const esri = layers.EsriWorldImagery().addTo(map);

    window.gvkMap = map;

    // Keep both basemaps available in the layer switcher
    window.gvkBaseLayers = {
        "Esri World Imagery": esri,
        "OpenStreetMap": layers.OpenStreetMap()
    };
});
