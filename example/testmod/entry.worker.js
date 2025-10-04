globalThis.sandsoildug=0

fluxloaderAPI.events.on("cl:soil-dig", (data) => {
    for (const cell of data) {
        if (cell.cellFromName==="SandSoil") globalThis.sandsoildug=0++
    }
});