/** @typedef {import('../entry.electron.js')} */

/**
 * @typedef {[
 *   [number, number, number, number],
 * 	 [number, number, number, number],
 * 	 [number, number, number, number],
 * 	 [number, number, number, number]]} ShapeConfig
 */

/**
 * @typedef {object} BlockConfig
 * @property {string} sourceMod Your mod, use the name of your mods folder
 * @property {string} id Id of block
 * @property {string} name Name of block
 * @property {string} description Description of block
 * @property {string} [imagePath=""] Path to the blocks image relative to your mod folder
 * @property {boolean} [singleBuild=false] Whether the block is placed one at a time or is draggable
 * @property {boolean} [hasConfigMenu=false] Whether a config menu should open when the block is selected
 * @property {boolean} [hasHoverUI=false] If the block has a UI when hovered on
 * @property {boolean} [unlockedByDefault=false] If the block is avaliable by default
 * @property {boolean} [placeableAnywhere=false] If the block can be placed over things (like the launchers, filters, etc). This also negate shape
 * @property {number} [tickInterval=null] Interval in ms that the block ticks
 * @property {ShapeConfig} shape Shape of the block
 * @property {number[]} [angles=[]] Angles that the block can be dragged and placed at
 * @property {number} [animationInterval=500] How fast your block's animation cycles frames
 */

const blockSchema = {
	sourceMod: { type: "string" },
	id: { type: "string" },
	name: { type: "string" },
	description: { type: "string" },
	imagePath: { type: "string", default: "" },
	singleBuild: { type: "boolean", default: false },
	hasConfigMenu: { type: "boolean", default: false },
	hasHoverUI: { type: "boolean", default: false },
	unlockedByDefault: { type: "boolean", default: false },
	tickInterval: { type: "number", default: null, nullable: true },
	placeableAnywhere: { type: "boolean", default: false },
	shape: {
		type: "array",
		verifier: (v) => {
			const success = v.length === 4 && v.every((i) => i.length === 4 && i.every((j) => Number.isInteger(j)));
			return { success, message: `Parameter 'shape' must be a 4x4 matrix of integers` };
		},
		default: [
			[0, 0, 0, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
		],
	},
	angles: {
		type: "array",
		default: [],
		verifier: (v) => {
			const success = v.every((i) => Number.isInteger(i));
			return { success, message: `Parameter 'angles' must be an array of integers` };
		},
	},
	animationInterval: {
		type: "number",
		default: 500,
		verifier: (v) => {
			const success = Number.isInteger(v) && v > 0;
			return { success, message: `Parameter 'animationInterval' must be an integer greater than 0` };
		},
	},
};

/**
 * @typedef {object} BlockVariantConfig
 * @property {string} parentId The parent block
 * @property {string} suffix Suffix to parent id for this variant
 * @property {string} [imagePath=""] Path to the blocks image relative to your mod folder
 * @property {boolean} [hasHoverUI=false] Whether this block has a UI when hovered on
 * @property {shapeSchema} shape shape of block
 * @property {number[]} [angles=[]] Angles the block can be dragged at and placed at
 * @property {number} [animationInterval=500] How fast your block's animation cycles frames
 */

const blockVariantSchema = {
	parentId: { type: "string" },
	suffix: { type: "string" },
	imagePath: { type: "string", default: "" },
	hasHoverUI: { type: "boolean", default: false },
	shape: {
		type: "array",
		verifier: (v) => {
			const success = v.length === 4 && v.every((i) => i.length === 4 && i.every((j) => Number.isInteger(j)));
			return { success, message: `Parameter 'shape' must be a 4x4 matrix of integers` };
		},
	},
	angles: {
		type: "array",
		default: [],
		verifier: (v) => {
			const success = v.every((i) => Number.isInteger(i));
			return { success, message: `Parameter 'angles' must be an array of integers` };
		},
	},
	animationInterval: {
		type: "number",
		default: 500,
		verifier: (v) => {
			const success = Number.isInteger(v) && v > 0;
			return { success, message: `Parameter 'animationInterval' must be an integer greater than 0` };
		},
	},
};

class BlocksModule {
	#registry = corelib.enums.createRegistry({
		name: "Block",
		intIdStart: 99,
		bundleMap: {
			main: "d",
			sim: "h",
			manager: "h",
		},
	});

	getBlock(/** @type {string} */ blockID) {
		let blockData = this.#registry.entries?.[blockID];
		if (!blockData) return log("error", "corelib", `Could not find block with id: ${blockID}`);
		return blockData;
	}

	register(/** @type {BlockConfig} */ config) {
		const validConfig = validateInput(config, blockSchema);

		let fullImagePath = this.getFullImagePath(validConfig.sourceMod, validConfig.imagePath);
		const entry = { isVariant: false, variants: [], fullImagePath, ...validConfig };

		if (validConfig.tickInterval != null) {
			corelib.schedules.register(`block-tick-${validConfig.id}`, validConfig.tickInterval);
		}

		this.#registry.register(validConfig.id, entry);
	}

	registerVariant(/** @type {BlockVariantConfig} */ config) {
		const validConfig = validateInput(config, blockVariantSchema);

		if (!this.#registry.entries.hasOwnProperty(validConfig.parentId)) {
			return log("error", "corelib", `Parent block name: "${validConfig.parentId}" for variant "${validConfig.parentId}${validConfig.suffix}" not found!`);
		}

		let id = validConfig.parentId + validConfig.suffix;
		let parentEntry = this.#registry.entries[validConfig.parentId];
		let fullImagePath = this.getFullImagePath(parentEntry.sourceMod, validConfig.imagePath);
		let entry = { isVariant: true, fullImagePath, ...validConfig };
		entry.id = id;

		if (this.#registry.register(id, entry)) {
			parentEntry.variants.push(entry);
		}
	}

	unregister(/** @type {string} */ id) {
		// manually check here since we don't unregister until we unregister variants
		if (!this.#registry.entries[id]) {
			return log("error", "corelib", `Block with id "${id}" does not exist!`);
		}
		if (this.#registry.entries[id].isVariant) {
			return log("error", "corelib", `Block with id "${id}" is a variant and cannot be unregistered directly! Please unregister the parent block instead.`);
		}

		const data = this.#registry.entries[id];

		if (data.tickInterval != null) {
			corelib.schedules.unregister(`block-tick-${data.id}`);
		}

		for (let variant of data.variants) {
			this.#registry.unregister(variant.id);
		}

		this.#registry.unregister(id);
	}

	getFullImagePath(sourceMod, imagePath) {
		let _return = path.join(fluxloaderAPI.getModsPath(), sourceMod, imagePath + ".png").replace(/\\/g, "/");

		if (!fs.existsSync(_return)) {
			log("warn", "corelib", `Image not found: ${_return}`);
			_return = path.join(fluxloaderAPI.getModsPath(), "corelib", "assets/noimage.png").replace(/\\/g, "/");
		}

		return _return;
	}

	getEntries() {
		return this.#registry.entries;
	}

	applyPatches() {
		log("info", "corelib", "Loading block module patches");

		const reduceBlocks = (f) =>
			Object.values(this.#registry.entries)
				.filter((b) => !b.isVariant)
				.reduce((acc, b) => acc + f(b), "");

		const reduceBlockVariants = (b, f) => b.variants.reduce((acc, v) => acc + f(v), "");

		const reduceBlocksAndVariants = (f) => reduceBlocks((b) => f(b) + reduceBlockVariants(b, (v) => f(v)));

		const reduceBlocksWithConfig = (f) =>
			Object.values(this.#registry.entries)
				.filter((b) => !b.isVariant && b.hasConfigMenu)
				.reduce((acc, v) => acc + f(v.id), "");

		const reduceBlocksWithHover = (f) =>
			Object.values(this.#registry.entries)
				.filter((b) => b.hasHoverUI)
				.reduce((acc, v) => acc + f(v.id), "");

		let reduceBlocksWithTicking = (f) =>
			Object.values(this.#registry.entries)
				.filter((t) => t.tickInterval != null)
				.reduce((acc, t) => acc + f(t.id), "");

		const configUIFunction = function () {
			// This function is stringified and templated with __BLOCKID__ then patched into corelib
			// - e.state.session.windows.building.__BLOCKID__Config is the bool for if the config is open
			// - e.state.store.options.__BLOCKID__Config is where the config data is stored
			// - k.__BLOCKID__Config is the key for the config window

			// Extract scope variables we can get when we are passed into the games code
			const data = {
				scale: ip,
				state: e.state,
				showWindow: Ml,
				updateWindow: Al,
				specialUI: US, // I only know of `US.div`, which appears to be a special animated div
				extra: {},
				closeConfig: (config) => {
					e.state.session.windows.building.__BLOCKID__Config = false;
					e.state.session.windows.building.open = false;
					e.state.store.options.__BLOCKID__Config = config;
					e.state.session.building.activeStructureType = d.__BLOCKID__;
					Al(e.state, k.__BLOCKID__Config);
					Al(e.state, k.Management);
					e.state.store.player.hotbar.activeSlotIndex = null;
					e.state.store.player.action = null;
					Al(e.state, k.Hotbar);
				},
			};

			data.showWindow(data.state, k.__BLOCKID__Config);

			// Ref that we put the wrapper div into for click checking
			let targetChecker = React.useRef(null);

			// Run the `block__BLOCKID__PreConfigUI` function if the mod provides it for the `extra` information
			data.extra = globalThis["block__BLOCKID__PreConfigUI"] ? globalThis["block__BLOCKID__PreConfigUI"](data) : {};

			// If the config is not open, return null to not render anything
			if (!data.state.session.windows.building.__BLOCKID__Config) return null;

			return React.createElement(
				"div",
				{
					className: "fixed inset-0 flex items-center justify-center bg-black bg-opacity-50",
					onClick: (check) => {
						// Only closes UI if clicked element was not part of the "targetChecker" menu ref
						targetChecker.current && !targetChecker.current.contains(check.target) && ((data.state.session.windows.building.__BLOCKID__Config = !1), Al(data.state, k.__BLOCKID__Config));
					},
				},
				React.createElement(
					"div",
					{
						ref: targetChecker,
						style: {
							// Overflow is used if either height or width aren't provided
							overflow: "auto",
							height: data.extra.height,
							width: data.extra.width,
							transform: `scale(${data.scale(data.state)})`,
							transformOrigin: "center",
						},
					},
					React.createElement(
						data.specialUI.div,
						{
							initial: { y: 10 },
							animate: { y: 0 },
							transition: { y: { duration: 0.1 } },
							className: "h-full bg-black bg-opacity-85 p-4 shadow-lg ui-box card-2 overflow-y-auto",
						},
						// use the mod provided `block__BLOCKID__ConfigUI` function to get the actual content of the config UI
						globalThis["block__BLOCKID__ConfigUI"] ? globalThis["block__BLOCKID__ConfigUI"](data) : undefined,
					),
				),
			);
		};

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:blockInventory", {
			type: "replace",
			from: `d.Foundation,d.Collector`,
			to: `~` + reduceBlocks((b) => (b.unlockedByDefault ? `,d.${b.id}` : "")),
			token: `~`,
		});

		fluxloaderAPI.setMappedPatch({ "js/bundle.js": [], "js/515.bundle.js": [] }, "corelib:blockShapes", (v) => ({
			type: "replace",
			from: `"grower":[[12,12,12,12],[0,0,0,0],[0,0,0,0],[0,0,0,0]]`,
			to: `~` + reduceBlocksAndVariants((b) => `,"${b.id}":${JSON.stringify(b.shape)}`),
			token: `~`,
		}));

		fluxloaderAPI.setMappedPatch({ "js/bundle.js": ["Vh", "d", "ud"], "js/336.bundle.js": ["n", "l.ev", "u"], "js/546.bundle.js": ["a", "o.ev", "l"] }, "corelib:blockTypeDefinitions", (v1, v2, v3) => ({
			type: "replace",
			from: `${v1}[${v2}.FoundationAngledRight]={shape:${v3}["foundation-triangle-right"]}`,
			to:
				`~` +
				reduceBlocks(
					(b) =>
						`,${v1}[${v2}.${b.id}]={
					${!b.placeableAnywhere ? `shape:${v3}["${b.id}"],` : ``}
					variants:[
						{id:${v2}.${b.id},angles:[${b.angles.join(",")}]}` +
						reduceBlockVariants(b, (v) => `,{id:${v2}.${v.id},angles:[${v.angles.join(",")}]}`) +
						`],
					name:"${b.name}",
					description:"${b.description}",
					singleBuild:${b.singleBuild}
				}` +
						reduceBlockVariants(
							b,
							(v) => `,${v1}[${v2}.${v.id}]={
					shape:${v3}["${v.id}"],
					singleBuild:${b.singleBuild}
				}`,
						),
				),
			token: `~`,
		}));

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:blockImages", {
			type: "replace",
			from: `Rf[d.Foundation]={imageName:"block"}`,
			to: `~` + reduceBlocksAndVariants((b) => `,Rf[d.${b.id}]={imageName:"${b.fullImagePath}",isAbsolute:true}`),
			token: `~`,
		});

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:blockLoadTextures", {
			type: "replace",
			from: `sm("frame_block")`,
			to: `~` + reduceBlocksAndVariants((b) => `,sm("${b.fullImagePath}")`),
			token: `~`,
		});

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:blockDrawTextures", {
			type: "replace",
			from: `if(n.type!==d.Collector)`,
			to:
				reduceBlocksAndVariants(
					(b) =>
						`if(n.type===d.${b.id}){
					l=t.session.rendering.images["${b.fullImagePath}"],(u=e.snapGridCellSize*e.cellSize),(c=Nf(t,n.x*e.cellSize,n.y*e.cellSize));` +
						(b.animationInterval != null
							? `h.drawImage(l.image,l.image.height*(Math.floor(t.store.meta.time/${b.animationInterval})%(l.image.width/l.image.height)),0,l.image.height,l.image.height,c.x,c.y,u,u);`
							: `h.drawImage(l.image,0,0,l.image.width,l.image.height,c.x,c.y,u,u);`) +
						`}else `,
				) + "~",
			token: `~`,
		});

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:blockConfigMenu", {
			type: "replace",
			from: "n.id===d.FilterRight&&(e.session.windows.building.filterConfig=!0,Al(e,k.FilterConfig))",
			to: "~" + reduceBlocksWithConfig((id) => `,n.id===d.${id}&&(e.session.windows.building.${id}Config=!0,Al(e,k.${id}Config))`),
			token: "~",
		});

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:blockOpenConfig", {
			type: "replace",
			from: "t.type===o.Building?t.id===",
			to: "~" + reduceBlocksWithConfig((id) => `d.${id}?((e.session.windows.building.${id}Config=!0),void Al(e,k.${id}Config)):t.id===`),
			token: "~",
		});

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:blockCloseConfig", {
			type: "replace",
			from: `(!e.session.windows.building.filterConfig||(e.session.windows.building.filterConfig=!1,Al(e,k.FilterConfig),e.session.windows.options.open))`,
			to: "~" + reduceBlocksWithConfig((id) => `&&(!e.session.windows.building.${id}Config||(e.session.windows.building.${id}Config=!1,Al(e,k.${id}Config),e.session.windows.options.open))`),
			token: "~",
		});

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:blockDefaultMenus", {
			type: "replace",
			from: `e.session.windows.building.filterConfig=!1;`,
			to: "~Al(e,k.FilterConfig);" + reduceBlocksWithConfig((id) => `e.session.windows.building.${id}Config=!1;Al(e,k.${id}Config);`),
			token: "~",
		});

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:blockSetupReact", {
			type: "replace",
			from: `(0,bm.jsx)(HS,{state:e.state})`,
			to: "~" + reduceBlocksWithConfig((id) => `,(0,bm.jsx)(globalThis["corelib:blockConfigCallback${id}"]=${configUIFunction.toString().replaceAll("__BLOCKID__", id)}, {})`),
			token: "~",
		});

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:blockPlacedConfig", {
			type: "replace",
			from: `h.type===d.GloomEmitter&&(h.filter={density:1e4,mode:"allow"}),`,
			to: "~" + reduceBlocksWithConfig((id) => `h.type===d.${id}&&(h.data=t.store.options.${id}Config),`),
			token: "~",
		});

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:blockCopy", {
			type: "replace",
			from: `t.filter?{filter:JSON.parse(JSON.stringify(t.filter))}:`,
			to: `~t.data?{data:JSON.parse(JSON.stringify(t.data))}:`,
			token: "~",
		});

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:blockPaste", {
			type: "replace",
			from: `(i.copiedStructure.filter&&(h.filter=i.copiedStructure.filter)`,
			to: `~,(i.copiedStructure.data&&(h.data=i.copiedStructure.data))`,
			token: "~",
		});

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:blockPlacementData", {
			type: "replace",
			from: "var l=null!==(s=i.structureConfig)&&void 0!==s?s:Cd(i.structureType,null!==(o=i.angle)&&void 0!==o?o:void 0);",
			to: "~var blockData=i.copiedStructure?.data??t.store.options[d[l.structureType]+'Config'];",
			token: "~",
		});

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:blockHover", {
			type: "replace",
			from: `n=hu[e.groundCellType];`,
			to: "~" + reduceBlocksWithHover((b) => `else if(e.structure.type===d.${b}){return block${b}HoverUI(e)}`),
			token: "~",
		});

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:blockGrabberHover", {
			type: "replace",
			from: `z.type===d.FilterLeft||z.type===d.FilterRight`,
			to: "~" + reduceBlocksWithHover((b) => `||z.type===d.${b}`),
			token: "~",
		});

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:tickingRegister", {
			type: "replace",
			from: "h.type===d.GloomEmitter&&t.store.gloom.emitterPositions.push({x:h.x,y:h.y})",
			to: `~${reduceBlocksWithTicking((id) => `,h.type===d["${id}"]&&t.store.corelib.tickingBlockPositions["${id}"].push({x:h.x,y:h.y})`)}`,
			token: "~",
		});

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:tickingUnregister", {
			type: "replace",
			from: "n.store.gloom.emitterPositions.filter((function(e){return!(e.x===r.x&&e.y===r.y)})))",
			to: `~${reduceBlocksWithTicking((id) => `,(r.type===d["${id}"])&&(n.store.corelib.tickingBlockPositions["${id}"]=n.store.corelib.tickingBlockPositions["${id}"].filter(function(e){return !(e.x===r.x&&e.y===r.y)}))`)}`,
			token: "~",
		});
	}
}

globalThis.BlocksModule = BlocksModule;
