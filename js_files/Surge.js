
let gdal;

const filePath = "./data/Surge/Surge.fgb";

async function initialiseGDAL() {
    try {

        // 1. Initialise GDAL
        gdal = await initGdalJs({
            path: "https://cdn.jsdelivr.net/npm/gdal3.js@2.8.1/dist/package",
            useWorker: false
        });

        console.log("GDAL initialised successfully!");

        // 2. Fetch the FGB file
        const response = await fetch(filePath);

        if (!response.ok) {
            throw new Error(`Unable to load FGB: ${response.status}`);
        }

        // 3. Convert response into a File object
        const blob = await response.blob();
        const file = new File([blob], "Surge.fgb");

        console.log("FGB file loaded:", file);

        // 4. Open the file using GDAL
        const result = await gdal.open(file);

        console.log("GDAL open result:", result);

        // 5. Get the first dataset
        if (!result.datasets || result.datasets.length === 0) {
            throw new Error("No GDAL dataset found.");
        }

        const dataset = result.datasets[0];

        // 6. Get dataset information
        const info = await gdal.getInfo(dataset);

        console.log("Surge dataset information:", info);

    } catch (error) {
        console.error("GDAL operation failed:", error);
    }
}

initialiseGDAL();
