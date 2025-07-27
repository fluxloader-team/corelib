await import("./shared.game.worker.js");

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
		raw: {
			from,
			to,
		},
		worker,
		loc: {
			x,
			y,
		},
	};

	// These `Name` variables need to be ported to the worker
	data.fromCellType = typeof data.raw.from === "object" ? data.raw.from.cellType : data.raw.from;
	data.fromParticleType = data.fromCellType == 1 && typeof data.raw.from === "object" ? data.raw.from.type : null;
	data.fromBlockType = data.fromCellType == 15 && typeof data.raw.from === "object" ? data.raw.from.type : null;
	// data.fromCellTypeName = corelib.utils.getSolidNameByType(data.fromCellType);
	// data.fromParticleTypeName = corelib.utils.getParticleNameByType(data.fromParticleType);
	// data.fromBlockTypeName = corelib.utils.getBlockNameByType(data.fromBlockType);

	data.toCellType = typeof data.raw.to === "object" ? data.raw.to.cellType : data.raw.to;
	data.toParticleType = data.toCellType == 1 && typeof data.raw.to === "object" ? data.raw.to.type : null;
	data.toBlockType = data.toCellType == 15 && typeof data.raw.to === "object" ? data.raw.to.type : null;
	// data.toCellTypeName = corelib.utils.getSolidNameByType(data.toCellType);
	// data.toParticleTypeName = corelib.utils.getParticleNameByType(data.toParticleType);
	// data.toBlockTypeName = corelib.utils.getBlockNameByType(data.toBlockType);

	batchData["cell-change"].push(data);
};

corelib.events.processFogReveal = (x, y) => {
	if (x === undefined || y === undefined) {
		return;
	}

	let data = {
		loc: {
			x,
			y,
		},
	};

	batchData["fog-reveal"].push(data);
};
