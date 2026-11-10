document.addEventListener("DOMContentLoaded", () => {
    if (window.gvkMap && window.gvkBaseLayers)
        L.control.layers(window.gvkBaseLayers).addTo(window.gvkMap);
});
