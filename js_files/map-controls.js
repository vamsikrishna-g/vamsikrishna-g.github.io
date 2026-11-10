document.addEventListener("DOMContentLoaded", () => {
    window.addGVKMapControls = () => {
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
});
