
(function () {

    function initialiseDrawTools() {

        if (!window.gvkMap) {
            console.warn("GVK Draw: Map unavailable.");
            return;
        }

        if (window.gvkDrawInitialised) return;

        if (typeof L.Control.Draw === "undefined") {
            console.error("GVK Draw: Leaflet.draw is not loaded.");
            return;
        }

        const map = window.gvkMap;

        // Store user-created features
        const drawnItems = new L.FeatureGroup();
        map.addLayer(drawnItems);

        // Drawing toolbar configuration
        const drawControl = new L.Control.Draw({

            position: "topleft",

            draw: {
                polyline: {
                    shapeOptions: {
                        color: "#e74c3c",
                        weight: 3
                    }
                },

                polygon: {
                    allowIntersection: false,
                    showArea: true,
                    shapeOptions: {
                        color: "#27ae60",
                        fillOpacity: 0.2
                    }
                },

                rectangle: {
                    shapeOptions: {
                        color: "#2980b9",
                        fillOpacity: 0.15
                    }
                },

                circle: {
                    shapeOptions: {
                        color: "#8e44ad",
                        fillOpacity: 0.15
                    }
                },

                marker: true,
                circlemarker: false
            },

            edit: {
                featureGroup: drawnItems,
                edit: true,
                remove: true
            }

        });

        map.addControl(drawControl);

        // New feature created
        map.on(L.Draw.Event.CREATED, function (event) {

            const layer = event.layer;

            drawnItems.addLayer(layer);

            console.log(
                "GVK Draw: New feature created:",
                event.layerType
            );

        });

        // Features edited
        map.on(L.Draw.Event.EDITED, function (event) {

            event.layers.eachLayer(function (layer) {
                console.log("GVK Draw: Feature edited.", layer);
            });

        });

        // Features deleted
        map.on(L.Draw.Event.DELETED, function (event) {

            console.log("GVK Draw: Features deleted.");

        });

        // Expose drawing objects
        window.gvkDrawnItems = drawnItems;
        window.gvkDrawControl = drawControl;

        // Export drawn features as GeoJSON
        window.exportGVKDrawings = function () {

            return drawnItems.toGeoJSON();

        };

        window.gvkDrawInitialised = true;

        console.log("GVK Draw: Initialised successfully.");

    }

    function startDrawTools() {

        if (window.gvkMap) {
            initialiseDrawTools();
        } else {
            window.addEventListener(
                "gvk-map-ready",
                initialiseDrawTools,
                { once: true }
            );
        }

    }

    startDrawTools();

})();
