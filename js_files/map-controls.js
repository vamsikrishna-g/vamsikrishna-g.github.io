// Defined immediately so map.js can call it from its DOMContentLoaded handler.
window.addGVKMapControls = function () {
    if (!window.gvkMap || !window.gvkBaseLayers) return;

    if (window.gvkLayerControl) {
        window.gvkMap.removeControl(window.gvkLayerControl);
    }

    window.gvkLayerControl = L.control.layers(
        window.gvkBaseLayers,
        window.gvkOverlayLayers || {},
        { collapsed: true }
    ).addTo(window.gvkMap);
};
