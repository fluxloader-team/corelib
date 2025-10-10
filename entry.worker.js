class CoreLib {
    exposed = { raw: {}, named: {} };
    simulation = {};
    events = {};
    utils = {};
    hooks = {};

	init() {
		this.setupEvents();
		this.setupHooks();
		this.setupInternals();
	}

	setupEvents() {
		let batchData = {};
		const events = ["cell-change", "fog-reveal", "soil-dig"];

		for (let event of events) {
			fluxloaderAPI.events.registerEvent(`cl:${event}`);
			batchData[event] = [];
		}

		fluxloaderAPI.events.registerEvent("cl:raw-api-setup");

		fluxloaderAPI.events.on("cl:raw-api-setup", () => {
			log("info", "corelib", "Setting up corelib raw API");

			corelib.exposed.named = {
				soils: corelib.exposed.rawi.vZ,
				tech: corelib.exposed.rawi.xQ,
				blocks: corelib.exposed.rawi.ev,
				particles: corelib.exposed.rawi.RJ,
				items: corelib.exposed.rawi.Np,
				createParticle: corelib.exposed.rawc.n,
				matterTypes: corelib.exposed.rawi.es,
				setCell: corelib.exposed.rawu.Jx,
			};

			corelib.utils = {
				...corelib.exposed.rawo.A,
			};
		});
	}

	setupHooks() {
		// Events are batched together because of how many are triggered
		// All batched data is sent when the worker receives the "RunUpdate" message
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

			if (data.fromCellType && data.fromCellType !== 1) {
				data.cellFromName = corelib.exposed.named.soils[data.fromCellType];
				batchData["soil-dig"].push(data);
			}
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
	}

	setupInternals() {
		corelib.simulation = {
			isEmpty: (x, y) => {
				corelib.exposed.rawu.lV(fluxloaderAPI.gameInstanceState, x, y);
			},
			spawnParticle: (x, y, type, data = {}) => {
				const particleType = Number.isInteger(type) ? type : corelib.exposed.named.particles[type];
				if (particleType === undefined || !corelib.exposed.named.particles.hasOwnProperty(particleType)) return log("error", "corelib", `Particle type ${type} does not exist!`);
				const particle = corelib.exposed.named.createParticle(particleType, x, y, data);
				corelib.simulation.setCell(x, y, particle);
			},
			spawnMovingParticle: (x, y, vx, vy, type, data = {}) => {
				const particleType = Number.isInteger(type) ? type : corelib.exposed.named.particles[type];
				if (particleType === undefined || !corelib.exposed.named.particles.hasOwnProperty(particleType)) return log("error", "corelib", `Particle type ${type} does not exist!`);
				const innerParticle = corelib.exposed.named.createParticle(particleType, x, y, data);
				const outerParticle = corelib.exposed.named.createParticle(corelib.exposed.named.particles.Particle, x, y, {
					element: innerParticle,
					velocity: { x: vx, y: vy },
				});
				corelib.simulation.setCell(x, y, outerParticle);
			},
			setCell: (x, y, data) => {
				corelib.exposed.named.setCell(fluxloaderAPI.gameInstanceState, x, y, data);
			}
		};
	}
}

globalThis.corelib = new CoreLib();
corelib.init();
