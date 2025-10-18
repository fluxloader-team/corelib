function disableScreen() {
	// Used to block input while async tasks are running
	let disable = document.createElement("div");
	disable.id = "interactibility-nuker";
	disable.className = "fixed inset-0 z-[99999] bg-black/0 cursor-wait";
	document.body.appendChild(disable);
}

class CoreLib {
	exposed = { raw: {}, named: {} };
	simulation = {};
	events = {};
	utils = {};
	hooks = {};

	async init() {
		this.setupEvents();
		this.setupHooks();
		this.setupInternals();
		await this.setupTickingBlocks();
	}

	setupEvents() {
		fluxloaderAPI.events.registerEvent("cl:raw-api-setup");

		fluxloaderAPI.events.on("cl:raw-api-setup", () => {
			log("info", "corelib", "Setting up corelib raw API");

			corelib.exposed.named = {
				soils: corelib.exposed.raw.t,
				particles: corelib.exposed.raw.n,
				blocks: corelib.exposed.raw.d,
				matterTypes: corelib.exposed.raw.h,
				createParticle: corelib.exposed.raw.Fh,
				createBlock: corelib.exposed.raw.xd,
				setCell: corelib.exposed.raw.Od,
				getSelectedItem: corelib.exposed.raw.Ef,
				notifyUIChange: corelib.exposed.raw.Al,
				convertHSLtoRGBA: corelib.exposed.raw.pu,
				getStructureAtPos: corelib.exposed.raw.Oc,
				checkIfTechUnlocked: corelib.exposed.raw.Xf,
			};
		});
	}

	setupHooks() {
		globalThis.corelib.hooks.setupSave = (store) => {
			return store;
		};

		globalThis.corelib.hooks.preSceneChange = async (param) => {
			disableScreen();

			// Main menu loading game and not new game
			if (typeof param == "string" && param.includes("db_load")) {
				let url = param.substring(8); // "db_load="
				let results = await window.electron.load(url);
				let data = results.data;
				let enumMapping = data?.corelibEnumMapping ?? {};
				await fluxloaderAPI.invokeElectronIPC("corelib:updateEnumMapping", enumMapping);
			}

			corelib.hooks.doSceneChange(param);
		};
	}

	setupInternals() {
		corelib.simulation = {
			spawnParticle: (x, y, type, data = {}) => {
				const particleType = Number.isInteger(type) ? type : corelib.exposed.named.particles[type];
				if (particleType === undefined || !corelib.exposed.named.particles.hasOwnProperty(particleType)) return log("error", "corelib", `Particle type ${type} does not exist!`);
				const particle = corelib.exposed.named.createParticle(particleType, x, y, data);
				corelib.exposed.named.setCell(fluxloaderAPI.gameInstance.state, x, y, particle);
			},
			spawnMovingParticle: (x, y, vx, vy, type, data = {}) => {
				const particleType = Number.isInteger(type) ? type : corelib.exposed.named.particles[type];
				if (particleType === undefined || !corelib.exposed.named.particles.hasOwnProperty(particleType)) return log("error", "corelib", `Particle type ${type} does not exist!`);
				const innerParticle = corelib.exposed.named.createParticle(particleType, x, y, data);
				const outerParticle = corelib.exposed.named.createParticle(corelib.exposed.named.particles.Particle, x, y, {
					element: innerParticle,
					velocity: { x: vx, y: vy },
				});
				corelib.exposed.named.setCell(fluxloaderAPI.gameInstance.state, x, y, outerParticle);
			},
			spawnBlock: (x, y, type) => {
				const blockType = corelib.exposed.named.blocks[type];
				if (blockType === undefined) return log("error", "corelib", `Block type ${type} does not exist!`);
				corelib.exposed.named.createBlock(fluxloaderAPI.gameInstance.state, { x, y }, { structureType: blockType });
			},
			deleteBlocks: (x1, y1, x2, y2) => {
				// The game only deals with deleting blocks in a specific area
				corelib.exposed.raw.ed(fluxloaderAPI.gameInstance.state, { x: x1, y: y1 }, { x: x2, y: y2 }, { removeCells: true });
			},
			revealFog: (x, y) => {
				fluxloaderAPI.gameInstance.state.environment.multithreading.simulation.postAll(fluxloaderAPI.gameInstance.state, [14, x, y]);
			},
			isEmpty: (x, y) => {
				return corelib.exposed.raw.tf(fluxloaderAPI.gameInstance.state, x, y);
			},
		};

		corelib.utils = {
			getBlockNameByType: (type) => {
				return corelib.exposed.named.blocks[type] != undefined ? corelib.exposed.named.blocks[type] : null;
			},
			getParticleNameByType: (type) => {
				return corelib.exposed.named.particles[type] != undefined ? corelib.exposed.named.particles[type] : null;
			},
			getSoilNameByType: (type) => {
				return corelib.exposed.named.soils[type] != undefined ? corelib.exposed.named.soils[type] : null;
			},
			countTechLeaves: (tech) => {
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
			getLineStyle: (tech) => {
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
					width: `${finalWidth}px`,
					// I'm not 100% sure this margin checks works in all cases tbh..
					// But it works in at least a simple test with several techs added
					marginLeft: `${middleWidth + firstWidth - finalWidth}px`,
				};
			},
			getSelectedItem() {
				return corelib.exposed.named.getSelectedItem(fluxloaderAPI.gameInstance.state);
			},
		};
	}

	async setupTickingBlocks() {
		// get the schedules to register immediately so mods can start listening immediately
		let registrations = await fluxloaderAPI.invokeElectronIPC("corelib:getModuleRegistrations");

		// we don't need the ids so just get values
		for (let schedule of Object.keys(registrations.schedules)) {
			fluxloaderAPI.events.registerEvent(`corelib:schedule-${schedule}`);
		}

		let tickingIds = Object.values(registrations.blocks).filter((b) => b.interval > 0);

		// only allow running after scene loading to ensure state and store exist properly; debating making this a part of corelib's api because it could be a bit useful
		let hasSceneLoaded = false;
		fluxloaderAPI.events.on("fl:scene-loaded", () => {
			hasSceneLoaded = true;

			let { store } = fluxloaderAPI.gameInstance.state;
			store.corelibEnumMapping = registrations.enumMapping;
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
				for (let blockIndex in store.corelibCache[id]) {
					let block = store.corelibCache[id][blockIndex];
					const realBlock = structures?.[block.y]?.[block.x];

					if (!realBlock) {
						store.corelibCache[id].splice(blockIndex, 1);
						continue;
					}
					fluxloaderAPI.events.trigger(`corelib:block-${id}`, realBlock);
				}
			});
		}
	}
}

globalThis.corelib = new CoreLib();
await corelib.init();
