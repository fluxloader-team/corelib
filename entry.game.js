globalThis.corelib = { exposed: {} };

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

// worker event types we want
const eventTypes = {
	//3: "SetCell",
	4: "Blast",
	5: "Dig",
	7: "AddStructure",
	10: "SwapElement",
	13: "Ignite",
	19: "Burn",
	20: "Explode",
	32: "SetPixel",
	38: "SpawnWorldItem"
};

// register the events
for (var key in eventTypes) {
	fluxloaderAPI.events.registerEvent(`cl:worker${eventTypes[key]}`);
}

// Listen for Worker Events
fluxloaderAPI.listenWorkerMessage("corelib:workerEvent", (_data) => {

	let data = JSON.parse(_data);
	let event = {
		type: null,
		x: -1,
		y: -1,
	};

	// only if this event type is wanted
	if (eventTypes[data[0]] && eventTypes[data[0]] !== null) {

		event.type = eventTypes[data[0]];

		event.x = (data[1] && data[1]["x"]) ? data[1]["x"] : -1;
		event.y = (data[1] && data[1]["y"]) ? data[1]["y"] : -1;

		switch (data[0]) {
			case 3: // SetCell
			break;
			case 4: // Blast
			break;
			case 5: // Dig
			break;
			case 7: // AddStructure
			event.StructureId = (data[1]["type"]) ? data[1]["type"] : -1 ;
			//event.StructureName = (corelib.exposed.variable.Ed[event.StructureId]) ? corelib.exposed.variable.Ed[event.StructureId].name : null ;
			// todo: hook into exposed vars and get structure name
			break;
		}

		// double check and fire event
		if (event.type !== null) {
			console.log(event);
			console.log(data);
			//			log("debug", "corelib", `Worker Event ${JSON.stringify(event)}`);
			//			fluxloaderAPI.events.trigger(`cl:worker${event.type}`, event);
		}
	}

});
