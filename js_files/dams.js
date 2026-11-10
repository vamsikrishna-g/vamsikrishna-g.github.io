document.addEventListener("DOMContentLoaded", () => {
    window.addGVKDams = () => {
        const damData = window.DAM_DATA;
        const map = window.gvkMap;

        if (!map || !damData?.features?.length || window.gvkDamLayer) return;

        const safe = value => String(value ?? "-").replace(/[&<>"']/g, char => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        }[char]));

        window.gvkDamLayer = L.geoJSON(damData, {
            pointToLayer: (feature, latlng) => L.circleMarker(latlng, {
                radius: 8,
                color: "red",
                fillColor: "yellow",
                fillOpacity: 1,
                weight: 1.5
            }),
            onEachFeature: (feature, layer) => {
                const p = feature.properties || {};
                const tooltip = `
                    <b>${safe(p.Name_of_Da)}</b><br>
                    <b>NRLD No:</b> ${safe(p.NRLD_NO)}<br>
                    <b>SDSO:</b> ${safe(p.SDSO)}<br>
                    <b>State:</b> ${safe(p.State)}<br>
                    <b>District:</b> ${safe(p.District)}<br>
                    <b>River:</b> ${safe(p.River)}<br>
                    <b>Dam Incharge:</b> ${safe(p.Dam_Inchar)}<br>
                    <b>Maximum Height:</b> ${safe(p.Max_Height)} m<br>
                    <b>Year of Construction:</b> ${safe(p.Year_of_Co)}<br>
                    <b>Basin:</b> ${safe(p.Basin)}<br>
                    <b>Maximum Water Level:</b> ${safe(p.Maximum_Wa)} m<br>
                    <b>Full Reservoir Level:</b> ${safe(p.Full_Reser)} m<br>
                    <b>Gross Storage:</b> ${safe(p.Gross_Stor)} MCM<br>
                    <b>Spillway Capacity:</b> ${safe(p.Spillway_C)}<br>
                    <b>Dam Length:</b> ${safe(p.Length_of_)} m<br>
                    <b>Type:</b> ${safe(p.Type_of_Da)}<br>
                    <b>Purpose:</b> ${safe(p.Purpose)}<br>
                    <b>Latitude:</b> ${safe(p.Latitude_)}<br>
                    <b>Longitude:</b> ${safe(p.Longitude_)}
                `;
                layer.bindTooltip(tooltip, { direction: "top", sticky: true });
            }
        }).addTo(map);

        window.gvkOverlayLayers = { "Dams": window.gvkDamLayer };

        // Refresh the layer switcher so it includes the Dams overlay.
        if (window.addGVKMapControls) window.addGVKMapControls();

        // Zoom to the extent of the restored source dataset.
        const bounds = window.gvkDamLayer.getBounds();
        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [25, 25], maxZoom: 8 });
        }
    };
});
