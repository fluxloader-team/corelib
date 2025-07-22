await import("./shared.game.worker.js");

fluxloaderAPI.events.registerEvent("cl:cell-change");
fluxloaderAPI.events.registerEvent("cl:fog-reveal");

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

	fluxloaderAPI.events.trigger("cl:cell-change", data, false);
};

corelib.events.processFogReveal = (x, y) => {
	if (x === undefined || y === undefined) {
		return;
	}

	let data = {
		loc: { x, y },
	};

	fluxloaderAPI.events.trigger("cl:fog-reveal", data, false);
};
