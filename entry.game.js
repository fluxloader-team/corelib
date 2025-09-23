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
});

corelib.simulation = {
	spawnParticle: (x, y, type, data = {}) => {
		const particleType = Number.isInteger(type) ? type : corelib.simulation.internal.particles[type];
		if (particleType === undefined || !corelib.simulation.internal.particles.hasOwnProperty(particleType)) return log("error", "corelib", `Particle type ${type} does not exist!`);
		const particle = corelib.simulation.internal.createParticle(particleType, x, y, data);
		corelib.simulation.internal.setCell(fluxloaderAPI.gameInstance.state, x, y, particle);
	},
	spawnMovingParticle: (x, y, vx, vy, type, data = {}) => {
		const particleType = Number.isInteger(type) ? type : corelib.simulation.internal.particles[type];
		if (particleType === undefined || !corelib.simulation.internal.particles.hasOwnProperty(particleType)) return log("error", "corelib", `Particle type ${type} does not exist!`);
		const innerParticle = corelib.simulation.internal.createParticle(particleType, x, y, data);
		const outerParticle = corelib.simulation.internal.createParticle(corelib.simulation.internal.particles.Particle, x, y, {
			element: innerParticle,
			velocity: { x: vx, y: vy },
		});
		corelib.simulation.internal.setCell(fluxloaderAPI.gameInstance.state, x, y, outerParticle);
	},
	spawnBlock: (x, y, type) => {
		const blockType = corelib.simulation.internal.blocks[type];
		if (blockType === undefined) return log("error", "corelib", `Block type ${type} does not exist!`);
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
};

// get the schedules to register immediately so mods can start listening immediately
let localRegistry = await fluxloaderAPI.invokeElectronIPC("corelib:getGameRegistries");
// we don't need the ids so just get values
for (let schedule of Object.values(localRegistry.schedules)) {
	fluxloaderAPI.events.register(`corelib:schedule-${schedule.id}`);
}

let tickingIds = Object.values(localRegistry.blocks).filter((b) => b.interval > 0);

// only allow running after scene loading to ensure state and store exist properly; debating making this a part of corelib's api because it could be a bit useful
let hasSceneLoaded = false;
fluxloaderAPI.events.on("fl:scene-loaded", () => {
	hasSceneLoaded = true;

	let { store } = fluxloaderAPI.gameInstance.state;
	store.corelibCache ??= {};
	for (let id of tickingIds) {
		store.corelibCache[id] ??= {};
	}
});


// add converted handlers for ticking blocks
for (let id of tickingIds) {
	fluxloaderAPI.events.register(`corelib:block-${id}`);
	fluxloaderAPI.events.on(`corelib:schedules-_tickingBlock-${id}`, () => {
		if (!hasSceneLoaded) return;
		let { store } = fluxloaderAPI.gameInstance.state;
		let { structures } = fluxloaderAPI.gameInstance.state.session.cache.structures;

		// use for...in instead of for...of so we can right away remove it, could use indexOf but this is better
		for (let blockInd in store.corelibCache[id]) {
			let block = store.corelibCache[id][blockInd];
			const realBlock = structures?.[block.y]?.[block.x];

			if (!realBlock) {
				store.corelibCache[id].splice(blockInd, 1);
				continue;
			}
			fluxloaderAPI.events.trigger(`corelib:block-${id}`, realBlock);
		}
	});
}

