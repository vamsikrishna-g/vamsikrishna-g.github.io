// Layer control for GVK map
// Called from map.js after map initialisation.

window.addGVKMapControls = function () {

    // Check whether map and base layers are available
    if (!window.gvkMap || !window.gvkBaseLayers) {
        console.warn("Map or base layers are not initialised.");
        return;
    }

    // Remove existing layer control before recreating it
    if (window.gvkLayerControl) {
        window.gvkMap.removeControl(window.gvkLayerControl);
    }

    // Initialise overlay collection if not already available
    window.gvkOverlayLayers = window.gvkOverlayLayers || {};

    // Create Leaflet layer control
    window.gvkLayerControl = L.control.layers(
        window.gvkBaseLayers,
        window.gvkOverlayLayers,
        {
            collapsed: true
        }
    ).addTo(window.gvkMap);

    // Make layer control globally accessible
    window.GVK_LAYER_CONTROL = window.gvkLayerControl;

    console.log("GVK layer control initialised.");

};
