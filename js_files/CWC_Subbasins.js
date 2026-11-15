
import { deserialize } from "https://esm.sh/flatgeobuf@4.6.0/geojson";

(() => {

    // =========================================
    // CONFIGURATION
    // =========================================

    const CONFIG = {
        manifest: "./data/CWC_Subbasins/cwc_subbasins.json",
        folder: "./data/CWC_Subbasins/",
        layerName: "CWC Subbasins",
        concurrency: 4,
        debounce: 500,

        style: {
            color: "#1565c0",
            weight: 1.2,
            opacity: 0.9,
            fillColor: "#42a5f5",
            fillOpacity: 0.18
        }
    };

    let map = null;
    let subbasinsLayer = null;
    let subbasinFiles = [];

    let requestId = 0;
    let timer = null;

    let loading = false;
    let pending = false;
    let initialized = false;
    let initializing = false;


    // =========================================
    // LOAD MANIFEST
    // =========================================

    async function loadManifest() {

        const response = await fetch(CONFIG.manifest);

        if (!response.ok) {
            throw new Error(
                `Manifest loading failed: ${response.status}`
            );
        }

        const files = await response.json();

        if (!Array.isArray(files) || files.length !== 25) {
            throw new Error(
                `Expected 25 files, received ${
                    Array.isArray(files) ? files.length : "invalid manifest"
                }.`
            );
        }

        subbasinFiles = files.map(name =>
            CONFIG.folder + name
        );

        console.log(
            "CWC Subbasins: Files registered:",
            subbasinFiles.length
        );
    }


    // =========================================
    // POPUP
    // =========================================

    function createPopup(feature) {

        const popup = document.createElement("div");

        const heading = document.createElement("strong");
        heading.textContent = "CWC Subbasin";

        popup.appendChild(heading);

        Object.entries(feature.properties || {}).forEach(
            ([key, value]) => {

                if (
                    value === null ||
                    value === undefined ||
                    value === ""
                ) {
                    return;
                }

                const line = document.createElement("div");
                const label = document.createElement("strong");

                label.textContent = key + ": ";

                line.append(
                    label,
                    document.createTextNode(String(value))
                );

                popup.appendChild(line);
            }
        );

        return popup;
    }


    // =========================================
    // QUERY ONE FGB FILE
    // =========================================

    async function querySubbasinFile(
        url,
        bbox,
        targetLayer,
        currentRequest
    ) {

        let count = 0;

        try {

            const iterator = deserialize(url, {
                rect: bbox
            });

            for await (const feature of iterator) {

                if (currentRequest !== requestId) {
                    return 0;
                }

                if (!feature || !feature.geometry) {
                    continue;
                }

                L.geoJSON(feature, {

                    style: CONFIG.style,

                    onEachFeature: function (feature, layer) {
                        layer.bindPopup(createPopup(feature));
                    }

                }).addTo(targetLayer);

                count++;
            }

        } catch (error) {

            if (currentRequest === requestId) {
                console.error(
                    "CWC Subbasin file query failed:",
                    url,
                    error
                );
            }
        }

        return count;
    }


    // =========================================
    // LOAD VISIBLE SUBBASINS
    // =========================================

    async function loadVisibleSubbasins() {

        if (!map.hasLayer(subbasinsLayer)) {
            return;
        }

        if (loading) {
            pending = true;
            return;
        }

        loading = true;
        pending = false;

        const currentRequest = ++requestId;

        const bounds = map.getBounds();

        const bbox = {
            minX: bounds.getWest(),
            minY: bounds.getSouth(),
            maxX: bounds.getEast(),
            maxY: bounds.getNorth()
        };

        // Keep old features visible during refresh.
        const nextLayer = L.layerGroup();

        let totalFeatures = 0;
        let nextFileIndex = 0;

        console.log(
            "CWC Subbasins: Querying extent:",
            bbox
        );


        async function worker() {

            while (currentRequest === requestId) {

                const index = nextFileIndex++;

                if (index >= subbasinFiles.length) {
                    return;
                }

                const url = subbasinFiles[index];

                const count = await querySubbasinFile(
                    url,
                    bbox,
                    nextLayer,
                    currentRequest
                );

                totalFeatures += count;
            }
        }


        try {

            const workerCount = Math.min(
                CONFIG.concurrency,
                subbasinFiles.length
            );

            await Promise.all(
                Array.from(
                    { length: workerCount },
                    () => worker()
                )
            );

            if (currentRequest !== requestId) {
                return;
            }

            // Replace previous viewport features.
            subbasinsLayer.clearLayers();

            nextLayer.eachLayer(layer => {
                subbasinsLayer.addLayer(layer);
            });

            console.log(
                "CWC Subbasins: Features displayed:",
                totalFeatures
            );

        } catch (error) {

            console.error(
                "CWC Subbasins loading error:",
                error
            );

        } finally {

            loading = false;

            if (
                pending &&
                map.hasLayer(subbasinsLayer)
            ) {
                scheduleRefresh();
            }
        }
    }


    // =========================================
    // DEBOUNCED REFRESH
    // =========================================

    function scheduleRefresh() {

        clearTimeout(timer);

        timer = setTimeout(
            loadVisibleSubbasins,
            CONFIG.debounce
        );
    }


    // =========================================
    // INITIALIZE LAYER
    // =========================================

    async function initialiseSubbasins() {

        if (initialized || initializing) {
            return;
        }

        if (!window.gvkMap || !window.gvkLayerControl) {
            console.error(
                "CWC Subbasins: GVK map or layer control unavailable."
            );
            return;
        }

        initializing = true;
        map = window.gvkMap;

        try {
            await loadManifest();
        } catch (error) {

            initializing = false;

            console.error(
                "CWC Subbasins initialization failed:",
                error
            );

            return;
        }

        subbasinsLayer = L.layerGroup();

        window.gvkOverlayLayers =
            window.gvkOverlayLayers || {};

        window.gvkOverlayLayers[CONFIG.layerName] =
            subbasinsLayer;

        window.gvkLayerControl.addOverlay(
            subbasinsLayer,
            CONFIG.layerName
        );


        subbasinsLayer.on("add", function () {
            scheduleRefresh();
        });


        subbasinsLayer.on("remove", function () {

            clearTimeout(timer);

            requestId++;
            pending = false;

            subbasinsLayer.clearLayers();
        });


        map.on("moveend", function () {

            if (map.hasLayer(subbasinsLayer)) {
                scheduleRefresh();
            }
        });


        initialized = true;
        initializing = false;

        console.log(
            "CWC Subbasins: Layer registered successfully (OFF by default)."
        );
    }


    // =========================================
    // START
    // =========================================

    function startSubbasins() {

        if (window.gvkMap && window.gvkLayerControl) {
            initialiseSubbasins();
            return;
        }

        console.log(
            "CWC Subbasins: Waiting for GVK map and layer control..."
        );

        window.addEventListener(
            "gvk-map-ready",
            initialiseSubbasins,
            { once: true }
        );
    }

    startSubbasins();

})();
