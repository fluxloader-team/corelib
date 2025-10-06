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
	// The game only deals with deleting blocks in a specific area
	deleteBlocks: (x1, y1, x2, y2) => {
		corelib.exposed.ed(fluxloaderAPI.gameInstance.state, { x: x1, y: y1 }, { x: x2, y: y2 }, { removeCells: true });
	},
	revealFog: (x, y) => {
		fluxloaderAPI.gameInstance.state.environment.multithreading.simulation.postAll(fluxloaderAPI.gameInstance.state, [14, x, y]);
	},
	isEmpty: (x, y) => {
		return corelib.exposed.tf(fluxloaderAPI.gameInstance.state, x, y);
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
for (let schedule of Object.keys(localRegistry.schedules)) {
	fluxloaderAPI.events.registerEvent(`corelib:schedule-${schedule}`);
}

let tickingIds = Object.values(localRegistry.blocks).filter((b) => b.interval > 0);

// only allow running after scene loading to ensure state and store exist properly; debating making this a part of corelib's api because it could be a bit useful
let hasSceneLoaded = false;
fluxloaderAPI.events.on("fl:scene-loaded", () => {
	hasSceneLoaded = true;

	let { store } = fluxloaderAPI.gameInstance.state;
	store.corelibEnums = localRegistry.enumStore;
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

// load enums

// so the user can't click again while we're reading the save and before we continue to load the game -- confirmed you get ~1-2 seconds as we're reading the file early
function disableScreen() {
	let disable = document.createElement('div');
	disable.id = "interactibility-nuker";
	disable.className = "fixed inset-0 z-[99999] bg-black/0 cursor-wait";
	document.body.appendChild(disable);
}


// archived -- not sure why this didnt work
globalThis.corelib.hooks.setupSave = (store) => {
	return store;
	// we can always overwrite it because we read from the save before loading it
	// store.corelibEnums = localRegistry.enumStore;
	// return store;
};

globalThis.corelib.hooks.preSceneChange = async (param) => {
	// we're doing operations that might take time and the window will reload when we finish
	disableScreen();
	if (typeof param == "string" && param.includes("db_load")) { // means main menu loading game and not new game
		let url = param.substring(8); // "db_load="
		let results = await window.electron.load(url);
		let data = results.data; // get results
		let store = data?.corelibEnums ?? {};

		// if we send electron an object it adds on all it's internals, and if we send it as {data:store} it just refuses to pass data for some reason
		await fluxloaderAPI.invokeElectronIPC("corelib:saveEnumStore", store);
	}
	corelib.hooks.doSceneChange(param);
}



