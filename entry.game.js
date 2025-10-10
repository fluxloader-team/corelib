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
	// Used internally in the tech UI to fix the line drawing
	// counts how many techs are at the very bottom, to get the width
	_countTechLeaves: (tech) => {
		let children = 0;
		// If there are no children, increment leaf count
		// Otherwise, count leaves of children
		if (!tech.children || tech.children.length === 0) {
			return 1;
		} else {
			for (let child of tech.children) {
				children += corelib.utils._countTechLeaves(child);
			}
		}
		return children;
	},
	// Used internally in the tech UI to fix the line drawing
	_getLineStyle: (tech) => {
		const nodeWidth = 96;
		const gap = 32; // Technically based on 2rem, so be careful

		let totalLeaves = corelib.utils._countTechLeaves(tech);
		// Get leaf count of first child
		let firstLeaves = corelib.utils._countTechLeaves(tech.children[0]);
		// Get leaf count of last child
		let lastLeaves = corelib.utils._countTechLeaves(tech.children[tech.children.length - 1]);
		// Calculate leaves between the first and last nodes
		let middleLeaves = totalLeaves - (firstLeaves + lastLeaves);

		let firstWidth = firstLeaves * nodeWidth + (firstLeaves - 1) * gap;
		let middleWidth = middleLeaves * nodeWidth + (middleLeaves + 1) * gap;
		let lastWidth = lastLeaves * nodeWidth + (lastLeaves - 1) * gap;
		let finalWidth = firstWidth / 2 + middleWidth + lastWidth / 2;
		return {
			width: `${finalWidth}px`,
			// I'm not 100% sure this margin checks works in all cases tbh..
			// But it works in at least a simple test with several techs added
			marginLeft: `${middleWidth + firstWidth - finalWidth}px`,
		};
	},
};
