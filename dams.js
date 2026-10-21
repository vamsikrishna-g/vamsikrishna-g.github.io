const damLayer = L.geoJSON(damData, {

    pointToLayer: function(feature, latlng) {
        return L.circleMarker(latlng, {
            radius: 8,
            color: "red",
            fillColor: "yellow",
            fillOpacity: 1
        });
    },

    onEachFeature: function(feature, layer) {

        const p = feature.properties;

        layer.bindTooltip(
            `<b>${p.Name_of_Da || "-"}</b><br>
            <b>NRLD No:</b> ${p.NRLD_NO || "-"}<br>
            <b>SDSO:</b> ${p.SDSO || "-"}<br>
            <b>State:</b> ${p.State || "-"}<br>
            <b>District:</b> ${p.District || "-"}<br>
            <b>River:</b> ${p.River || "-"}<br>
            <b>Dam Incharge:</b> ${p.Dam_Inchar || "-"}<br>
            <b>Maximum Height:</b> ${p.Max_Height || "-"} m<br>
            <b>Year of Construction:</b> ${p.Year_of_Co || "-"}<br>
            <b>Basin:</b> ${p.Basin || "-"}<br>
            <b>Maximum Water Level:</b> ${p.Maximum_Wa || "-"} m<br>
            <b>Full Reservoir Level:</b> ${p.Full_Reser || "-"} m<br>
            <b>Gross Storage:</b> ${p.Gross_Stor || "-"} MCM<br>
            <b>Spillway Capacity:</b> ${p.Spillway_C || "-"}<br>
            <b>Dam Length:</b> ${p.Length_of_ || "-"} m<br>
            <b>Type:</b> ${p.Type_of_Da || "-"}<br>
            <b>Purpose:</b> ${p.Purpose || "-"}<br>
            <b>Latitude:</b> ${p.Latitude_ || "-"}<br>
            <b>Longitude:</b> ${p.Longitude_ || "-"}`
        );
    }
});

damLayer.addTo(map);

const overlayMaps = {
    "Dams": damLayer
};

L.control.layers(baseMaps, overlayMaps).addTo(map);

map.fitBounds(damLayer.getBounds());