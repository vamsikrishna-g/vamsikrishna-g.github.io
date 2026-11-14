
let gdal;

const filePath = "data/Surge/Surge.fgb";

async function initialiseGDAL() {
    try {
        // Initialise GDAL
        gdal = await initGdalJs({
            path: "https://cdn.jsdelivr.net/npm/gdal3.js@2.8.1/dist/package",
            useWorker: false
        });

        console.log("GDAL initialised successfully!");

        // Open the FlatGeobuf file
        const result = await gdal.open([filePath]);

        console.log("FGB file opened:", result);

    } catch (error) {
        console.error("GDAL operation failed:", error);
    }
}

initialiseGDAL();
