let gdal;

// FGB file location
const filePath = "data/Surge/Surge.fgb";

// Initialise GDAL
async function initialiseGDAL() {
    try {
        gdal = await initGdalJs({
            path: "https://cdn.jsdelivr.net/npm/gdal3.js@2.8.1/dist/package",
            useWorker: false
        });

        console.log("GDAL initialised successfully!");
        console.log("FGB file location:", filePath);

    } catch (error) {
        console.error("GDAL initialisation failed:", error);
    }
}

initialiseGDAL();
