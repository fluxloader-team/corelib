await import("./shared.game.worker.js");

fluxloaderAPI.events.registerEvent("cl:raw-api-setup");

fluxloaderAPI.events.on("cl:raw-api-setup", () => {
	log("info", "corelib", "Setting up corelib raw API");
	corelib.simulation.internal = {};
	corelib.simulation.internal.soils = corelib.exposed.t;
	corelib.simulation.internal.particles = corelib.exposed.n;
	corelib.simulation.internal.blocks = corelib.exposed.d;
	corelib.simulation.internal.matterTypes = corelib.exposed.h;
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
		return corelib.simulation.internal.soils[type] != undefined ? corelib.simulation.internal.soils[type] : null;
	},
};
