function disableScreen() {
	// Used to block input while async tasks are running
	let disable = document.createElement("div");
	disable.id = "interactibility-nuker";
	disable.className = "fixed inset-0 z-[99999] bg-black/0 cursor-wait";
	document.body.appendChild(disable);
}

class CoreLib {
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
	async init() {
		this.setupEvents();
		this.setupHooks();
		this.setupInternals();
		await this.setupSchedules();
	}

	/**@private*/
	setupEvents() {
		fluxloaderAPI.events.registerEvent("cl:raw-api-setup");

		fluxloaderAPI.events.on("cl:raw-api-setup", () => {
			log("info", "corelib", "Setting up corelib raw API");

			corelib.exposed.named = {
				soils: corelib.exposed.raw.t,
				particles: corelib.exposed.raw.n,
				blocks: corelib.exposed.raw.d,
				tools: corelib.exposed.raw.H,
				matterTypes: corelib.exposed.raw.h,
				mapColors: corelib.exposed.raw.Fd,
				createCellData: corelib.exposed.raw.Fh,
				spawnBlock: corelib.exposed.raw.xd,
				setCell: corelib.exposed.raw.Od,
				notifyUIChange: corelib.exposed.raw.Al,
				convertHSLtoRGBA: corelib.exposed.raw.pu,
				getStructureAtPos: corelib.exposed.raw.Oc,
				checkIfTechUnlocked: corelib.exposed.raw.Xf,
				deleteBlocks: corelib.exposed.raw.ed,
				buttonStates: corelib.exposed.raw.y,
				actionTypes: corelib.exposed.raw.o,
				actionStates: corelib.exposed.raw.u,
				toolTypes: corelib.exposed.raw.a,
				uiNames: corelib.exposed.raw.k,
				workerMessages: corelib.exposed.raw.f,
				tutorialStages: corelib.exposed.raw.b,
				authorizationZoneLimits: corelib.exposed.raw.P,
				scenes: corelib.exposed.raw.z,
				getCellAtPos: corelib.exposed.raw.Bd,
			};

			corelib.exposed.utils = {
				...corelib.exposed.raw.q,
			};
		});
	}

	/**@private*/
	setupHooks() {
		this.hooks = {
			setupSave(store) {
				return store;
			},
			async preSceneChange(param) {
				disableScreen();

				// Main menu loading game and not new game
				if (typeof param == "string" && param.includes("db_load")) {
					let url = param.substring(8); // "db_load="
					let results = await window.electron.load(url);
					let enumMapping = results?.corelib?.enumMapping ?? {};
					await fluxloaderAPI.invokeElectronIPC("corelib:updateEnumMapping", enumMapping);
				}

				corelib.hooks.doSceneChange(param);
			},
			getLineStyle(tech) {
				// Used internally in the tech UI to fix the line drawing
				const nodeWidth = 96;
				const gap = 32; // Technically based on 2rem, so be careful

				let totalLeaves = corelib.utils.countTechLeaves(tech);
				// Get leaf count of first child
				let firstLeaves = corelib.utils.countTechLeaves(tech.children[0]);
				// Get leaf count of last child
				let lastLeaves = corelib.utils.countTechLeaves(tech.children[tech.children.length - 1]);
				// Calculate leaves between the first and last nodes
				let middleLeaves = totalLeaves - (firstLeaves + lastLeaves);

				let firstWidth = firstLeaves * nodeWidth + (firstLeaves - 1) * gap;
				let middleWidth = middleLeaves * nodeWidth + (middleLeaves + 1) * gap;
				let lastWidth = lastLeaves * nodeWidth + (lastLeaves - 1) * gap;
				let finalWidth = firstWidth / 2 + middleWidth + lastWidth / 2;
				return {
					width: `${finalWidth + 1}px`,
					// I'm not 100% sure this margin checks works in all cases tbh..
					// But it works in at least a simple test with several techs added
					marginLeft: `${middleWidth + firstWidth - finalWidth}px`,
				};
			},
		};
	}

	/**@private*/
	setupInternals() {
		this.simulation = {
			spawnElement: ({ id, x, y, data = {} }) => {
				// Typically prefer to use spawnParticle for moving elements in the world
				let intId = id;
				if (!Number.isInteger(id)) {
					intId = corelib.exposed.named.particles[id];
					if (intId === undefined) return log("error", "corelib", `Could not find particle with ID '${id}' in exposed.named.particles!`);
				}
				const particle = corelib.exposed.named.createCellData(intId, x, y, data);
				corelib.exposed.named.setCell(fluxloaderAPI.gameInstance.state, x, y, particle);
			},
			spawnParticle: ({ id, x, y, velocityX = 0, velocityY = 0, data = {} }) => {
				// If something is breaking make sure youre not spawning a "meta" particle type like 2 (Particle) or 9 (Shake)
				let intId = id;
				if (!Number.isInteger(id)) {
					intId = corelib.exposed.named.particles[id];
					if (intId === undefined) return log("error", "corelib", `Could not find particle with ID '${id}' in exposed.named.particles!`);
				}
				const element = corelib.exposed.named.createCellData(intId, x, y, data);
				const particle = corelib.exposed.named.createCellData(corelib.exposed.named.particles.Particle, x, y, {
					element: element,
					velocity: { x: velocityX, y: velocityY },
				});
				corelib.exposed.named.setCell(fluxloaderAPI.gameInstance.state, x, y, particle);
			},
			spawnBlock: (x, y, id) => {
				let intId = id;
				if (!Number.isInteger(id)) {
					intId = corelib.exposed.named.blocks[id];
					if (intId === undefined) return log("error", "corelib", `Could not find block with ID '${id}' in exposed.named.blocks!`);
				}
				corelib.exposed.named.spawnBlock(fluxloaderAPI.gameInstance.state, { x, y }, { structureType: intId });
			},
			deleteBlocks: (x1, y1, x2, y2) => {
				// The game only deals with deleting blocks in a specific area
				corelib.exposed.named.deleteBlocks(fluxloaderAPI.gameInstance.state, { x: x1, y: y1 }, { x: x2, y: y2 }, { removeCells: true });
			},
			revealFog: (x, y) => {
				fluxloaderAPI.gameInstance.state.environment.multithreading.simulation.postAll(fluxloaderAPI.gameInstance.state, [14, x, y]);
			},
			isEmpty: (x, y) => {
				return corelib.exposed.raw.tf(fluxloaderAPI.gameInstance.state, x, y);
			},
			setCell: (x, y, cellData) => {
				corelib.exposed.named.setCell(fluxloaderAPI.gameInstance.state, x, y, cellData);
			},
		};

		this.utils = {
			getCellAtPos(x, y) {
				return corelib.exposed.named.getCellAtPos(fluxloaderAPI.gameInstance.state.store, x, y);
			},
			getBlockNameFromNumber(id) {
				return corelib.exposed.named.blocks[id] != undefined ? corelib.exposed.named.blocks[id] : null;
			},
			getParticleNameFromNumber(id) {
				return corelib.exposed.named.particles[id] != undefined ? corelib.exposed.named.particles[id] : null;
			},
			getSoilNameFromNumber(id) {
				return corelib.exposed.named.soils[id] != undefined ? corelib.exposed.named.soils[id] : null;
			},
			countTechLeaves(tech) {
				// Used internally in the tech UI to fix the line drawing
				// counts how many techs are at the very bottom, to get the width
				let children = 0;
				// If there are no children, increment leaf count
				// Otherwise, count leaves of children
				if (!tech.children || tech.children.length === 0) {
					return 1;
				} else {
					for (let child of tech.children) {
						children += corelib.utils.countTechLeaves(child);
					}
				}
				return children;
			},
			getSelectedItem() {
				return corelib.exposed.raw.Ef(fluxloaderAPI.gameInstance.state);
			},
		};
	}

	/**@private*/
	async setupSchedules() {
		let registrations = await fluxloaderAPI.invokeElectronIPC("corelib:getModuleRegistrations");

		// Register each schedule event
		for (let schedule of Object.keys(registrations.schedules)) {
			fluxloaderAPI.events.registerEvent(`corelib:schedule-${schedule}`);
		}

		// Calculate the ticking blocks
		let tickingBlockIds = Object.values(registrations.blocks)
			.filter((b) => b.tickInterval > 0)
			.map((b) => b.id);

		let hasSceneLoaded = false;
		fluxloaderAPI.events.on("fl:scene-loaded", () => {
			hasSceneLoaded = true;

			let { store } = fluxloaderAPI.gameInstance.state;
			store.corelib ??= {};

			// This is read in the preSceneChange hook to reload enums
			store.corelib.enumMapping = registrations.enumMapping;

			// This is populated by patches in the blocks module
			store.corelib.tickingBlockPositions ??= {};
			for (let id of tickingBlockIds) {
				store.corelib.tickingBlockPositions[id] ??= [];
			}
		});

		for (let id of tickingBlockIds) {
			// Listen for general 'corelib:schedules-block-tick-{ID}' and redirect to 'corelib:schedules-block-{ID}' for each block
			fluxloaderAPI.events.registerEvent(`corelib:block-${id}`);
			fluxloaderAPI.events.on(`corelib:schedule-block-tick-${id}`, () => {
				if (!hasSceneLoaded) return;

				let store = fluxloaderAPI.gameInstance.state.store;
				let structures = fluxloaderAPI.gameInstance.state.session.cache.structures;

				// For each active block find its structure and trigger the event
				for (let blockIndex in store.corelib.tickingBlockPositions[id]) {
					let position = store.corelib.tickingBlockPositions[id][blockIndex];
					const block = structures?.[position.y]?.[position.x];
					if (!block) {
						store.corelib.tickingBlockPositions[id].splice(blockIndex, 1);
						continue;
					}

					fluxloaderAPI.events.trigger(`corelib:block-${id}`, block);
				}
			});
		}
	}
}

/**
 * Game Env of corelib
 * @version 2.0.0
 */
globalThis.corelib = new CoreLib();
await corelib.init();
