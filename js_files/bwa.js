/* =========================================================
   GVK WEBSITE — BWA STRUCTURES
   Displays BWA structures as a Leaflet overlay.

   Requires:
   1. Leaflet loaded.
   2. window.bwaData containing the complete GeoJSON.
   3. window.map containing the initialized Leaflet map.
   ========================================================= */

window.addGVKBWA = function () {

    if (!window.map) {
        console.error("GVK Map is not initialized.");
        return;
    }

    if (!window.bwaData || !Array.isArray(window.bwaData.features)) {
        console.error("BWA GeoJSON data is missing or invalid.");
        return;
    }

    // Prevent duplicate layers
    if (window.GVK_BWA_LAYER) {
        return window.GVK_BWA_LAYER;
    }

    // Create BWA marker layer
    const bwaLayer = L.geoJSON(window.bwaData, {

        pointToLayer: function (feature, latlng) {

            return L.circleMarker(latlng, {
                radius: 6,
                color: "#8e44ad",
                weight: 1.5,
                opacity: 1,
                fillColor: "#d7bde2",
                fillOpacity: 0.9
            });
        },

        onEachFeature: function (feature, layer) {

            const p = feature.properties || {};

            const fields = [
                ["Structure Name", "Name_of_Ba"],
                ["Structure ID", "Structure_"],
                ["Nearest City", "Nearest_Ci"],
                ["District", "District"],
                ["State", "State"],
                ["River", "River"],
                ["Basin", "Basin"],
                ["Year of Construction", "Year_of_Co"],
                ["Design Flood", "Design_Flo"],
                ["River Width", "Width_of_R"],
                ["Structure Length", "Length_of_"],
                ["Height", "Height_upt"],
                ["Type of Spillway", "Type_of_Sp"],
                ["Crest Level", "Crest_Leve"],
                ["Pond Level", "Pond_Level"],
                ["Status", "Status"],
                ["Seismic Zone", "Seismic_Zo"],
                ["Class", "Class"],
                ["Spillway Capacity", "Spillway_C"],
                ["Latitude", "Latitude"],
                ["Longitude", "Longitude"]
            ];

            let popupContent = `
                <div style="
                    min-width:240px;
                    max-width:320px;
                    max-height:350px;
                    overflow-y:auto;
                    font-family:Arial,sans-serif;
                ">
                    <h3 style="
                        margin:0 0 10px 0;
                        color:#8e44ad;
                        border-bottom:1px solid #ccc;
                        padding-bottom:6px;
                    ">
                        ${escapeHTML(p.Name_of_Ba || "BWA Structure")}
                    </h3>

                    <table style="
                        width:100%;
                        border-collapse:collapse;
                        font-size:12px;
                    ">
            `;

            fields.forEach(function (field) {

                const label = field[0];
                const key = field[1];
                const value = p[key];

                if (
                    value !== null &&
                    value !== undefined &&
                    value !== ""
                ) {
                    popupContent += `
                        <tr>
                            <td style="
                                padding:4px;
                                font-weight:bold;
                                vertical-align:top;
                                border-bottom:1px solid #eee;
                            ">
                                ${escapeHTML(label)}
                            </td>

                            <td style="
                                padding:4px;
                                vertical-align:top;
                                border-bottom:1px solid #eee;
                            ">
                                ${escapeHTML(String(value))}
                            </td>
                        </tr>
                    `;
                }
            });

            popupContent += `
                    </table>
                </div>
            `;

            layer.bindPopup(popupContent);

            layer.bindTooltip(
                escapeHTML(p.Name_of_Ba || "BWA Structure"),
                {
                    direction: "top",
                    sticky: true
                }
            );
        }

    });

    // Keep the layer off by default
    window.GVK_BWA_LAYER = bwaLayer;

    // Add it to the existing Leaflet layer control
    if (window.GVK_LAYER_CONTROL) {
        window.GVK_LAYER_CONTROL.addOverlay(
            bwaLayer,
            "BWA Structures"
        );
    } else {
        console.warn(
            "GVK layer control not found. BWA layer was created but not added to the control."
        );
    }

    return bwaLayer;
};


// Escape HTML to safely display attribute values
function escapeHTML(value) {

    return String(value).replace(/[&<>"']/g, function (character) {

        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[character];
    });
}