// Defined immediately so map.js can call it from its DOMContentLoaded handler.
window.addGVKMapControls = function () {

    if (!window.gvkMap || !window.gvkBaseLayers) return;

    // Remove existing layer control before recreating it
    if (window.gvkLayerControl) {
        window.gvkMap.removeControl(window.gvkLayerControl);
    }

    // Create the layer control
    window.gvkLayerControl = L.control.layers(
        window.gvkBaseLayers,
        window.gvkOverlayLayers || {},
        { collapsed: true }
    ).addTo(window.gvkMap);

    // Make the control accessible to other JavaScript files
    window.GVK_LAYER_CONTROL = window.gvkLayerControl;
};
