
/* =========================================
   GVK SURGE LAYER
   Direct FlatGeobuf reading
========================================= */

window.gvkSurgeLayer = null;

document.addEventListener("DOMContentLoaded", async () => {

    try {

        // 1. Check existing Leaflet map
        const map = window.gvkMap;

        if (!map) {
            throw new Error("GVK map is not initialised.");
        }

        // 2. Check FlatGeobuf library
        if (
            typeof flatgeobuf === "undefined" ||
            typeof flatgeobuf.deserialize !== "function"
        ) {
            throw new Error("FlatGeobuf library is unavailable.");
        }

        // 3. FGB file location
        const filePath = "./data/Surge/Surge.fgb";

        console.log("Loading Surge FlatGeobuf:", filePath);

        // 4. Fetch the original FGB file
        const response = await fetch(filePath);

        if (!response.ok) {
            throw new Error(
                `Unable to load Surge.fgb: HTTP ${response.status}`
            );
        }

        const buffer = await response.arrayBuffer();

        const fgbData = new Uint8Array(buffer);

        console.log("Surge FGB loaded:", buffer.byteLength, "bytes");

        // 5. Create an empty Leaflet layer
        const surgeLayer = L.geoJSON([], {

            // Point styling
            pointToLayer: function (feature, latlng) {

                return L.circleMarker(latlng, {
                    radius: 5,
                    color: "#ff4500",
                    weight: 1,
                    fillColor: "#ff6347",
                    fillOpacity: 0.8
                });

            },

            // Attribute popup
            onEachFeature: function (feature, layer) {

                const popup = document.createElement("div");

                Object.entries(feature.properties || {}).forEach(
                    ([key, value]) => {

                        const row = document.createElement("div");

                        const label = document.createElement("strong");

                        label.textContent = key + ": ";

                        row.append(
                            label,
                            document.createTextNode(String(value ?? ""))
                        );

                        popup.appendChild(row);

                    }
                );

                layer.bindPopup(popup);

            }

        });

        // 6. Read FGB features directly
        const iterator = flatgeobuf.deserialize(fgbData);

        let featureCount = 0;

        for await (const feature of iterator) {

            surgeLayer.addData(feature);

            featureCount++;

        }

        console.log("Surge features loaded:", featureCount);

        if (featureCount === 0) {
            throw new Error("No Surge features were found.");
        }

        // 7. Register Surge in existing overlay collection
        window.gvkOverlayLayers =
            window.gvkOverlayLayers || {};

        window.gvkOverlayLayers["Surge"] = surgeLayer;

        window.gvkSurgeLayer = surgeLayer;

        // 8. Add Surge to existing map
        surgeLayer.addTo(map);

        // 9. Refresh existing layer control
        if (typeof window.addGVKMapControls === "function") {

            window.addGVKMapControls();

        }

        // 10. Zoom to Surge points
        const bounds = surgeLayer.getBounds();

        if (bounds.isValid()) {

            map.fitBounds(bounds, {
                padding: [25, 25]
            });

        }

        console.log("GVK Surge layer successfully added!");

    } catch (error) {

        console.error("Surge loading failed:", error);

    }

});
