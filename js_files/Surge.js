
/* =========================================
   GVK SURGE
   Direct FlatGeobuf access through GDAL
========================================= */

window.gvkSurgeDataset = null;
window.gvkSurgeInfo = null;
window.gvkGDAL = null;

const SURGE_FGB_PATH = "./data/Surge/Surge.fgb";


async function initialiseSurge() {

    try {

        // 1. Initialise GDAL
        const gdal = await initGdalJs({
            path: "https://cdn.jsdelivr.net/npm/gdal3.js@2.8.1/dist/package",
            useWorker: false
        });

        window.gvkGDAL = gdal;

        console.log("GDAL initialised.");


        // 2. Fetch the original FGB
        const response = await fetch(SURGE_FGB_PATH);

        if (!response.ok) {
            throw new Error(
                `Unable to load Surge.fgb: HTTP ${response.status}`
            );
        }

        const blob = await response.blob();

        const file = new File(
            [blob],
            "Surge.fgb",
            { type: "application/octet-stream" }
        );


        // 3. Open original FGB directly
        const result = await gdal.open(file);

        if (!result.datasets || result.datasets.length === 0) {
            throw new Error("GDAL could not open Surge.fgb.");
        }

        const dataset = result.datasets[0];

        window.gvkSurgeDataset = dataset;


        // 4. Retrieve dataset information
        const info = await gdal.getInfo(dataset);

        window.gvkSurgeInfo = info;

        console.log("Surge driver:", info.driverName);
        console.log("Surge layers:", info.layers);
        console.log("Surge feature count:", info.featureCount);

        console.log("Surge FGB opened successfully.");

    } catch (error) {

        console.error("Surge loading failed:", error);

    }
}


// Start Surge initialisation
window.gvkSurgeReady = initialiseSurge();
