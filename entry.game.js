await import("./shared.game.worker.js");

fluxloaderAPI.events.registerEvent("cl:raw-api-setup");

fluxloaderAPI.events.on("cl:raw-api-setup", () => {
	log("info", "corelib", "Setting up corelib raw API");
	corelib.simulation.internal = {};
	corelib.simulation.internal.solids = corelib.exposed.t;
	corelib.simulation.internal.particles = corelib.exposed.n;
	corelib.simulation.internal.blocks = corelib.exposed.d;
	corelib.simulation.internal.createParticle = corelib.exposed.Fh;
	corelib.simulation.internal.createBlock = corelib.exposed.xd;
	corelib.simulation.internal.setCell = corelib.exposed.Od;
	corelib.utils.internal = {};
	corelib.utils.internal.methods = corelib.exposed.q;
});

corelib.simulation = {
	// ---------------- Elements, cells, particles, solids ----------------
	spawnParticle: (x, y, type, data = {}) => {
		const particleType = corelib.simulation.internal.particles[type];
		if (particleType === undefined) log("error", "corelib", `Particle type ${type} does not exist!`);
		const particle = corelib.simulation.internal.createParticle(particleType, x, y, data);
		corelib.simulation.internal.setCell(fluxloaderAPI.gameInstance.state, x, y, particle);
	},
	spawnMovingParticle: (x, y, vx, vy, type, data = {}) => {
		const particleType = corelib.simulation.internal.particles[type];
		if (particleType === undefined) log("error", "corelib", `Particle type ${type} does not exist!`);
		const innerParticle = corelib.simulation.internal.createParticle(particleType, x, y, data);
		const outerParticle = corelib.simulation.internal.createParticle(corelib.simulation.internal.particles.Particle, x, y, {
			element: innerParticle,
			velocity: { x: vx, y: vy },
		});
		corelib.simulation.internal.setCell(fluxloaderAPI.gameInstance.state, x, y, outerParticle);
	},
	spawnBlock: (x, y, type) => {
		const blockType = corelib.simulation.internal.blocks[type];
		if (blockType === undefined) log("error", "corelib", `Block type ${type} does not exist!`);
		corelib.simulation.internal.createBlock(fluxloaderAPI.gameInstance.state, { x, y }, { structureType: blockType });
	},
	revealFog: (x, y) => {
		fluxloaderAPI.gameInstance.state.environment.multithreading.simulation.postAll(fluxloaderAPI.gameInstance.state, [14, x, y]);
	},
};

corelib.utils = {
	getBlockNameByType: (type) => {
		return corelib.simulation.internal.blocks[type] != undefined ? corelib.simulation.internal.blocks[type] : null;
	},
	getParticleNameByType: (type) => {
		return corelib.simulation.internal.particles[type] != undefined ? corelib.simulation.internal.particles[type] : null;
	},
	getSolidNameByType: (type) => {
		return corelib.simulation.internal.solids[type] != undefined ? corelib.simulation.internal.solids[type] : null;
	},
	getCellTypeAtXY: (x, y) => {
		return fluxloaderAPI.gameInstance.state.store.world.matrix[y][x] != undefined ? fluxloaderAPI.gameInstance.state.store.world.matrix[y][x] : null;
	},
	getWorkerByX: (x) => {
		let threads = fluxloaderAPI.gameInstance.state.environment.multithreading.simulation.threads;
		let t = corelib.utils.internal.methods.getThreadIndexFromCellX(x, threads.length);
		return threads[t];
	},
};

// register the events
for (let eventType of corelib.events.eventTypes) {
	fluxloaderAPI.events.registerEvent(`cl:worker-${eventType}`);
}

fluxloaderAPI.listenWorkerMessage("corelib:eventMessage", (eventMessage) => {
	// validate the minimal eventMessage
	if (eventMessage.type === undefined || eventMessage.type === null || eventMessage.trigger === undefined || eventMessage.trigger === null) {
		return;
	}

	// additional pre-processing for cell-change
	if (eventMessage.type == "cell-change") {
		// no cell object data
		if (typeof eventMessage.rawData.to !== "object") {
			return;
		}
		let wm = fluxloaderAPI.gameInstance.state.store.world.matrix[eventMessage.loc.y][eventMessage.loc.x];
		// cell hasn't changed
		if (wm === eventMessage.rawData.to) {
			return;
		}
		eventMessage.data.fromCellType = typeof eventMessage.rawData.from === "object" ? eventMessage.rawData.from.cellType : eventMessage.rawData.from;
		eventMessage.data.fromParticleType = eventMessage.data.fromCellType == 1 && typeof eventMessage.rawData.from === "object" ? eventMessage.rawData.from.type : null;
		eventMessage.data.fromBlockType = eventMessage.data.fromCellType == 15 && typeof eventMessage.rawData.from === "object" ? eventMessage.rawData.from.type : null;
		eventMessage.data.fromCellTypeName = corelib.utils.getSolidNameByType(eventMessage.data.fromCellType);
		eventMessage.data.fromParticleTypeName = corelib.utils.getParticleNameByType(eventMessage.data.fromParticleType);
		eventMessage.data.fromBlockTypeName = corelib.utils.getBlockNameByType(eventMessage.data.fromBlockType);

		eventMessage.data.toCellType = typeof eventMessage.rawData.to === "object" ? eventMessage.rawData.to.cellType : eventMessage.rawData.to;
		eventMessage.data.toParticleType = eventMessage.data.toCellType == 1 && typeof eventMessage.rawData.to === "object" ? eventMessage.rawData.to.type : null;
		eventMessage.data.toBlockType = eventMessage.data.toCellType == 15 && typeof eventMessage.rawData.to === "object" ? eventMessage.rawData.to.type : null;
		eventMessage.data.toCellTypeName = corelib.utils.getSolidNameByType(eventMessage.data.toCellType);
		eventMessage.data.toParticleTypeName = corelib.utils.getParticleNameByType(eventMessage.data.toParticleType);
		eventMessage.data.toBlockTypeName = corelib.utils.getBlockNameByType(eventMessage.data.toBlockType);
		//eventMessage.rawData = null;

		// additionaly update the game world matrix
		// this probably needs to be a cloned cache or something, reset on save ?
		console.log(`world.matrix[${eventMessage.loc.y}][${eventMessage.loc.x}] changed to ${JSON.stringify(eventMessage.rawData.to)}`);
		fluxloaderAPI.gameInstance.state.store.world.matrix[eventMessage.loc.y][eventMessage.loc.x] = eventMessage.rawData.to;
	}

	// additional pre-processing for dig
	if (eventMessage.type == "dig") {
		eventMessage.data.tool = {
			itemType: eventMessage.rawData.tool.itemType,
			itemName: eventMessage.rawData.tool.name,
			itemDescription: eventMessage.rawData.tool.description,
		};
		eventMessage.data.cell = corelib.utils.getCellTypeAtXY(eventMessage.loc.x, eventMessage.loc.y);
		console.log(`(${eventMessage.worker}) Dig @ ${eventMessage.loc.x},${eventMessage.loc.y} using ${eventMessage.data.tool.itemName} on cell ${eventMessage.data.cell}`);
	}

	//	console.warn(eventMessage);

	fluxloaderAPI.events.trigger(eventMessage.trigger, eventMessage, false);
});

fluxloaderAPI.events.on("fl:scene-loaded", (e) => {
	if (e === "test") {
		let x = 301;
		let y = 602;
		console.log("scene-load-test 1");
		let t = corelib.utils.getCellTypeAtXY(x, y);
		console.log(t);
		console.log("scene-load-test Sand");
		corelib.simulation.spawnParticle(x, y, "Sand");
		console.log("scene-load-test 2");
		t = corelib.utils.getCellTypeAtXY(x, y);
		console.log(t);
	}
});
