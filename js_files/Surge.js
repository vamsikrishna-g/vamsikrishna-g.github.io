
let gdal;

const filePath = "./data/Surge/Surge.fgb";

async function initialiseSurge() {

    try {

        // 1. Initialise GDAL
        gdal = await initGdalJs({
            path: "https://cdn.jsdelivr.net/npm/gdal3.js@2.8.1/dist/package",
            useWorker: false
        });

        window.gvkGDAL = gdal;

        console.log("GDAL initialised successfully!");

        // 2. Fetch the original FlatGeobuf file
        const response = await fetch(filePath);

        if (!response.ok) {
            throw new Error(`FGB loading failed: ${response.status}`);
        }

        const blob = await response.blob();

        const file = new File(
            [blob],
            "Surge.fgb",
            { type: "application/octet-stream" }
        );

        // 3. Open original FGB directly with GDAL
        const result = await gdal.open(file);

        if (!result.datasets || result.datasets.length === 0) {
            throw new Error(
                "GDAL could not open Surge.fgb: " +
                JSON.stringify(result.errors)
            );
        }

        const dataset = result.datasets[0];

        window.gvkSurgeDataset = dataset;

        // 4. Retrieve dataset information
        const info = await gdal.getInfo(dataset);

        window.gvkSurgeInfo = info;

        console.log("Surge dataset:", dataset);
        console.log("Surge information:", info);
        console.log("Feature count:", info.layers?.[0]?.featureCount);

    } catch (error) {

        console.error("Surge initialisation failed:", error);

    }

}

window.gvkSurgeReady = initialiseSurge();
