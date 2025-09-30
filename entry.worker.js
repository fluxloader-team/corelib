await import("./shared.game.worker.js");

fluxloaderAPI.events.registerEvent("cl:raw-api-setup");

fluxloaderAPI.events.on("cl:raw-api-setup", () => {
	console.log(corelib.exposed)
	log("info", "corelib", "Setting up corelib raw API");
	corelib.simulation.internal = {};
	corelib.simulation.internal.soils = corelib.exposed.i.vZ
	corelib.simulation.internal.tech = corelib.exposed.i.xQ
	corelib.simulation.internal.blocks = corelib.exposed.i.ev
	corelib.simulation.internal.particles = corelib.exposed.i.RJ
	corelib.simulation.internal.items = corelib.exposed.i.Np
	corelib.simulation.internal.matterTypes = corelib.exposed.i.es
	corelib.simulation.internal.jetpackZones = corelib.exposed.i.s0
	corelib.simulation.internal.setCell = (x, y, data) => {
		corelib.exposed.u.Jx(fluxloaderAPI.gameInstanceState, x, y, data);
	};
});

// Events are batched together because of how many are triggered
// All batched data is sent when the worker receives the "RunUpdate" message
let batchData = {};
const events = ["cell-change", "fog-reveal"];

for (let event of events) {
	fluxloaderAPI.events.registerEvent(`cl:${event}`);
	batchData[event] = [];
}

corelib.events.sendBatches = () => {
	for (let event of events) {
		if (batchData[event].length === 0) continue;
		fluxloaderAPI.events.trigger(`cl:${event}`, batchData[event], false);
		batchData[event] = [];
	}
};

corelib.events.processCellChange = (worker, x, y, from, to) => {
	if (worker === undefined || x === undefined || y === undefined || from === undefined || to === undefined) {
		return;
	}

	let data = {
		raw: { from, to },
		worker,
		loc: { x, y },
	};

	data.fromCellType = typeof data.raw.from === "object" ? data.raw.from.cellType : data.raw.from;
	data.fromParticleType = data.fromCellType == 1 && typeof data.raw.from === "object" ? data.raw.from.type : null;
	data.fromBlockType = data.fromCellType == 15 && typeof data.raw.from === "object" ? data.raw.from.type : null;

	data.toCellType = typeof data.raw.to === "object" ? data.raw.to.cellType : data.raw.to;
	data.toParticleType = data.toCellType == 1 && typeof data.raw.to === "object" ? data.raw.to.type : null;
	data.toBlockType = data.toCellType == 15 && typeof data.raw.to === "object" ? data.raw.to.type : null;

	batchData["cell-change"].push(data);
};

corelib.events.processFogReveal = (x, y) => {
	if (x === undefined || y === undefined) {
		return;
	}

	let data = {
		loc: { x, y },
	};

	batchData["fog-reveal"].push(data);
};
fluxloaderAPI.events.on("cl:cell-change", (data) => {
    for (const cell of data) {
    	if (cell.fromCellType) {
	    	const cellFromName = corelib.simulation.internal.soils[cell.fromCellType]
	    	if (cellFromName) {
	    		fluxloaderAPI.events.tryTrigger(`cl:elements:soilDug-${cellFromName}`);
	    	}
    	}
    }
});
