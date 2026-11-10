window.GVK_BASEMAPS = {
    OpenStreetMap: () => L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            noWrap: true,
            keepBuffer: 4,
            updateWhenIdle: false,
            attribution: "&copy; OpenStreetMap contributors"
        }
    ),

    EsriWorldImagery: () => L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
            minZoom: 2,
            maxZoom: 19,
            maxNativeZoom: 19,
            noWrap: true,
            keepBuffer: 4,
            updateWhenIdle: false,
            updateWhenZooming: true,
            attribution: "Tiles &copy; Esri"
        }
    )
};
