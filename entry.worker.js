class CoreLib {
	/**
	 *
	 */
	/**
	 * Exposed bundle variables
	 */
	exposed = {
		/**
		 * Raw variables from the bundle files, see source of entry.electron.js for a complete list
		 */
		raw: {},
		/**
		 * General miscellanous functions
		 */
		named: {},
	};
	/**
	 * Functions for interacting with the game world
	 */
	simulation = {};
	/**@private*/
	events = {};
	/**
	 * Functions for checking miscellanous data
	 */
	utils = {};
	/**@private*/
	hooks = {};
	/**@private*/
	batchData = {};
	/**@private*/
	eventNames = ["cell-change", "fog-reveal", "soil-dig"];
	blockRecipes = {};

	/**@private*/
	init() {
		this.setupEvents();
		this.setupHooks();
		this.setupInternals();
		console.log(globalThis.corelib.exposed);
	}

	/**@private*/
	setupEvents() {
		for (let event of this.eventNames) {
			fluxloaderAPI.events.registerEvent(`cl:${event}`);
			this.batchData[event] = [];
		}

		fluxloaderAPI.events.registerEvent("cl:raw-api-setup");

		fluxloaderAPI.events.on("cl:raw-api-setup", () => {
			log("info", "corelib", "Setting up corelib raw API");

			corelib.exposed.named = {
				soils: corelib.exposed.raw.i.vZ,
				tech: corelib.exposed.raw.i.xQ,
				blocks: corelib.exposed.raw.i.ev,
				particles: corelib.exposed.raw.i.RJ,
				items: corelib.exposed.raw.i.Np,
				createParticle: corelib.exposed.raw.c.n,
				matterTypes: corelib.exposed.raw.i.es,
				setCell: corelib.exposed.raw.u.Jx,
				getCellAtPos: corelib.exposed.raw.u.tT,
				moveCell: corelib.exposed.raw.u.L3,
				queueSetCell: corelib.exposed.raw.u.MH,
				swapCells: corelib.exposed.raw.u.Hc,
				shouldChunkUpdate: corelib.exposed.raw.u.Do,
				isEmpty: corelib.exposed.raw.u.lV,
				deleteBlocks: corelib.exposed.raw.z.Cj,
				getElementType: corelib.exposed.raw.u.QC,
				getElementTypeFromMapData: corelib.exposed.raw.u.BQ,
				setCellWithAutoWorkerRoute: corelib.exposed.raw.u.Q1,
				getChunkAtPos: corelib.exposed.raw.u.NK,
			};

			corelib.exposed.utils = {
				...corelib.exposed.raw.o.A,
			};
			this.blockRecipes.Grower = corelib.exposed.raw.r(2127).$;
			this.blockRecipes.VelocitySoaker = corelib.exposed.raw.r(421).v;
		});
	}

	/**@private*/
	setupHooks() {
		// Events are batched together because of how many are triggered
		// All batched data is sent when the worker receives the "RunUpdate" message
		corelib.events.sendBatches = () => {
			for (let event of this.eventNames) {
				if (this.batchData[event].length === 0) continue;
				fluxloaderAPI.events.trigger(`cl:${event}`, this.batchData[event], false);
				this.batchData[event] = [];
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

			this.batchData["cell-change"].push(data);

			if (data.fromCellType && data.fromCellType !== 1) {
				data.cellFromName = corelib.exposed.named.soils[data.fromCellType];
				this.batchData["soil-dig"].push(data);
			}
		};

		corelib.events.processFogReveal = (x, y) => {
			if (x === undefined || y === undefined) {
				return;
			}

			let data = {
				loc: { x, y },
			};

			this.batchData["fog-reveal"].push(data);
		};
	}

	/**@private*/
	setupInternals() {
		corelib.simulation = {
			isEmpty: (x, y) => {
				corelib.exposed.named.isEmpty(fluxloaderAPI.gameInstanceState, x, y);
			},
			spawnParticle: ({ x, y, id, data = {}, delayUntilEmpty = false }) => {
				const particleId = Number.isInteger(id) ? id : corelib.exposed.named.particles[id];
				if (particleId === undefined || !corelib.exposed.named.particles.hasOwnProperty(particleId)) return log("error", "corelib", `Particle type ${id} does not exist!`);
				const particle = corelib.exposed.named.createParticle(particleId, x, y, data);
				corelib.simulation.setCell(x, y, particle, delayUntilEmpty);
			},
			spawnMovingParticle: ({ x, y, velocityX, velocityY, type, data = {}, delayUntilEmpty = false }) => {
				const particleType = Number.isInteger(type) ? type : corelib.exposed.named.particles[type];
				if (particleType === undefined || !corelib.exposed.named.particles.hasOwnProperty(particleType)) return log("error", "corelib", `Particle type ${type} does not exist!`);
				const innerParticle = corelib.exposed.named.createParticle(particleType, x, y, data);
				const outerParticle = corelib.exposed.named.createParticle(corelib.exposed.named.particles.Particle, x, y, {
					element: innerParticle,
					velocity: { x: velocityX, y: velocityY },
				});
				corelib.simulation.setCell(x, y, outerParticle, delayUntilEmpty);
			},
			setCell: (x, y, data, delayUntilEmpty = false) => {
				if (delayUntilEmpty) {
					corelib.exposed.named.queueSetCell(fluxloaderAPI.gameInstanceState, x, y, data);
				} else {
					corelib.exposed.named.setCell(fluxloaderAPI.gameInstanceState, x, y, data);
				}
			},
			deleteBlocks: (x1, y1, x2, y2) => {
				corelib.exposed.named.deleteBlocks(fluxloaderAPI.gameInstanceState, { x: x1, y: y1 }, { x: x2, y: y2 }, { removeCells: true });
			},

			doBlockRecipes: (x, y, element, collidingBlock,cellBelow) => {
				return this.blockRecipes?.[corelib.exposed.named.blocks[collidingBlock.type]]?.(x, y, element, collidingBlock,cellBelow, fluxloaderAPI.gameInstanceState);
			},
		};
		corelib.utils = {
			getCellAtPos: (x, y) => {
				return corelib.exposed.named.getCellAtPos(fluxloaderAPI.gameInstanceState, x, y);
			},
			getStructureAtPos: (x, y) => {
				return corelib.exposed.raw.r(9241).TR(fluxloaderAPI.gameInstanceState, x, y);
			},
			getThreadIndexFromCellX(x) {
				return corelib.exposed.utils.getThreadIndexFromCellX(x, fluxloaderAPI.gameInstanceState.environment.threadMeta.threadCount);
			},
			isCellXInThread(x) {
				return corelib.exposed.utils.isCellXInThread(x, fluxloaderAPI.gameInstanceState.environment.threadMeta.startingIndex, fluxloaderAPI.gameInstanceState.environment.threadMeta.threadCount);
			},
			getBlockNameFromNumber: (type) => {
				return corelib.exposed.named.blocks[type] != undefined ? corelib.exposed.named.blocks[type] : null;
			},
			getParticleNameFromNumber: (type) => {
				return corelib.exposed.named.particles[type] != undefined ? corelib.exposed.named.particles[type] : null;
			},
			getSoilNameFromNumber: (type) => {
				return corelib.exposed.named.soils[type] != undefined ? corelib.exposed.named.soils[type] : null;
			},
		};
	}
}

/**
 * Worker Env of corelib
 * @version 2.0.0
 */
globalThis.corelib = new CoreLib();
corelib.init();
