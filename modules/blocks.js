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
	recipe: { type: "function", default: null },
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

	recipes = {};

	constructor() {
		this.recipes["Grower"] = corelib.exposed.raw.r(2127).$;
	}
	register(/** @type {BlockConfig} */ config) {
		const validConfig = validateInput(config, blockSchema);

		let fullImagePath = this.getFullImagePath(validConfig.sourceMod, validConfig.imagePath);
		const entry = { isVariant: false, variants: [], fullImagePath, ...validConfig };

		if (validConfig.tickInterval != null) {
			corelib.schedules.register(`block-tick-${validConfig.id}`, validConfig.tickInterval);
		}

		this.#registry.register(validConfig.id, entry);
		if (validConfig.recipe) this.recipes[validConfig.id] = validConfig.recipe;
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

	doBlockRecipes(x, y, element, collidingBlock) {
		return this.recipes?.[corelib.exposed.blocks[collidingBlock.type]]?.(x, y, element, collidingBlock, fluxloaderAPI.gameInstanceState);
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
						globalThis["block__BLOCKID__ConfigUI"] ? globalThis["block__BLOCKID__ConfigUI"](data) : undefined
					)
				)
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
					shape:${v3}["${b.id}"],
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
				}`
						)
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
						`}else `
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
		}); /*
		fluxloaderAPI.setPatch("js/515.bundle.js", "corelib:slushyImprovement", {
			type: "replace",
			from: `var g=function(e,t,r){var c=e.store;if(!t.hasBeenUpdated&&(0,o.Do)(c,t.x,t.y)&&!(0,s.v)(e,t)){var y=!1,v=d.A.get(e.session,"structures",Math.floor(t.x/n.A.snapGridCellSize)*n.A.snapGridCellSize,Math.floor(t.y/n.A.snapGridCellSize)*n.A.snapGridCellSize);v&&(y=v.filter||v.queued),y&&v.filter&&(t.velocity.y=t.minVelocity.y);var g=(0,o.tT)(c,t.x,t.y+1),S=(0,o.OA)(g),A=(0,u.uQ)(e,t,t.x,t.y+1,y),M=!A.authorized,R=i.Both,F=(0,o.Ol)(g);if(S||M||(0,o.W)(g,a.vZ.Block))return t.isFreeFalling=!1,t.velocity.y=t.minVelocity.y,t.velocity.x*=.7,(0,l.Fy)(c,t),S&&!n.A.useMultithreading&&((0,h.c)(e,t,g,v.type),(0,o.Y$)(e,t.x,t.y)),void(0,x.$)(e,t);if(A.authorized&&A.isFilter&&(R=i.None),F||((0,o.W)(g,a.vZ.SlidingBlockLeft)?R=i.Left:(0,o.W)(g,a.vZ.SlidingBlockRight)&&(R=i.Right)),t.threshold.y+=t.velocity.y*r,t.velocity.y+=n.A.gravity*r,t.threshold.y<1)return t.isFreeFalling&&(0,o.Y$)(e,t.x,t.y),void(F||R===i.None||(R!==i.Left&&R!==i.Both||(0,o.lV)(e,t.x-1,t.y+1)&&(0,o.Y$)(e,t.x,t.y),R!==i.Right&&R!==i.Both||(0,o.lV)(e,t.x+1,t.y+1)&&(0,o.Y$)(e,t.x,t.y)));var C=Math.floor(t.threshold.y);if(t.threshold.y=t.threshold.y%1,F){var J=!1,k=t.y+1;if(C>1)for(var z=t.y+C,b=t.y+2;b<=z;b+=1){var L=(0,o.tT)(c,t.x,b),T=(0,o.Ol)(L),B=(0,u.uQ)(e,t,t.x,b,y),w=B.authorized;if(!T||!w){T||(M=!w,g=L),J=!0,!w||B.isFilter||!T&&((0,o.OA)(L)||(0,o.W)(L,a.vZ.Block))?R=i.None:T||((0,o.W)(L,a.vZ.SlidingBlockLeft)?R=i.Left:(0,o.W)(g,a.vZ.SlidingBlockRight)&&(R=i.Right));break}k++}if((0,o.L3)(e,t,t.x,k),!J)return void(t.isFreeFalling=!0)}if((!g||M||!m(e,t,g))&&!((0,f.v)(e,t,g)||M&&(0,x.$)(e,t))){if(t.isFreeFalling){var G=Math.abs(t.velocity.y)/5;G*=.8+.4*Math.random(),0===t.velocity.x&&(t.velocity.x=2*(Math.random()-.5)),t.velocity.x=t.velocity.x<0?-G:G}if(t.isFreeFalling=!1,t.velocity.y*=.95,t.velocity.y<t.minVelocity.y&&(t.velocity.y=t.minVelocity.y),t.threshold.x+=t.velocity.x*r,t.velocity.x*=.95,R!==i.None&&p(e,t,R))t.isFreeFalling=!0;else{if(t.velocity.x<6&&t.velocity.x>-6)return t.velocity.x=0,void(t.threshold.x=0);if(t.threshold.x<1&&t.threshold.x>-1)(0,o.Y$)(e,t.x,t.y);else{var E=t.threshold.x<0?Math.ceil(t.threshold.x):Math.floor(t.threshold.x);t.threshold.x=t.threshold.x%1;for(var I,N,W=t.x+E,Z=t.x,O=t.y;Z!==W&&(Z+=E<0?-1:1,(0,o.lV)(e,Z,O)&&(0,u.xR)(e,t,Z,O,y));)(0,o.lV)(e,Z,O+1)&&(0,u.xR)(e,t,Z,O+1,y)&&(O+=1),I=Z,N=O;I&&(0,o.L3)(e,t,I,N)}}}}}`,
			to: ``,

		});
		fluxloaderAPI.setPatch("js/515.bundle.js", "corelib:wispImprovement", {
			type: "replace",
			from: `var g=function(e,t,r){var c=e.store;if(!t.hasBeenUpdated&&(0,o.Do)(c,t.x,t.y)){if((0,o.Ol)((0,o.tT)(c,t.x,t.y+1))&&!d.A.get(e.session,"structures",Math.floor(t.x/n.A.snapGridCellSize)*n.A.snapGridCellSize,Math.floor((t.y+1)/n.A.snapGridCellSize)*n.A.snapGridCellSize)){var y=.5+Math.random();if(t.velocity.y=Math.min(t.velocity.y+1*n.A.gravity*y*r,6),0===t.velocity.x&&(t.velocity.x=Math.random()>.5?8:-8),Math.random()<.1&&(t.velocity.x*=-1,Math.random()<.3&&(t.velocity.y*=.5)),t.threshold.x+=t.velocity.x*r,t.threshold.y+=t.velocity.y*r,Math.abs(t.threshold.x)>=1){var v=t.threshold.x<0?Math.ceil(t.threshold.x):Math.floor(t.threshold.x);t.threshold.x=t.threshold.x%1;var g=t.x+v,S=d.A.get(e.session,"structures",Math.floor(g/n.A.snapGridCellSize)*n.A.snapGridCellSize,Math.floor(t.y/n.A.snapGridCellSize)*n.A.snapGridCellSize);if((0,o.lV)(e,g,t.y)&&!S)return void(0,o.L3)(e,t,g,t.y)}}else t.velocity.x=0,t.velocity.y=t.minVelocity.y;if(!(0,s.v)(e,t)){var A=!1,M=d.A.get(e.session,"structures",Math.floor(t.x/n.A.snapGridCellSize)*n.A.snapGridCellSize,Math.floor(t.y/n.A.snapGridCellSize)*n.A.snapGridCellSize);M&&(A=M.filter||M.queued),A&&M.filter&&(t.velocity.y=t.minVelocity.y);var R=(0,o.tT)(c,t.x,t.y+1),F=(0,o.OA)(R),C=(0,u.uQ)(e,t,t.x,t.y+1,A),J=!C.authorized,k=i.Both,z=(0,o.Ol)(R);if(F||J||(0,o.W)(R,a.vZ.Block))return t.isFreeFalling=!1,t.velocity.y=t.minVelocity.y,t.velocity.x=0,(0,l.Fy)(c,t),F&&!n.A.useMultithreading&&((0,h.c)(e,t,R,M.type),(0,o.Y$)(e,t.x,t.y)),void(0,x.$)(e,t);if(C.authorized&&C.isFilter&&(k=i.None),z||((0,o.W)(R,a.vZ.SlidingBlockLeft)?k=i.Left:(0,o.W)(R,a.vZ.SlidingBlockRight)&&(k=i.Right)),t.threshold.y+=t.velocity.y*r,t.velocity.y+=n.A.gravity*r,t.threshold.y<1)return t.isFreeFalling&&(0,o.Y$)(e,t.x,t.y),void(z||k===i.None||(k!==i.Left&&k!==i.Both||(0,o.lV)(e,t.x-1,t.y+1)&&(0,o.Y$)(e,t.x,t.y),k!==i.Right&&k!==i.Both||(0,o.lV)(e,t.x+1,t.y+1)&&(0,o.Y$)(e,t.x,t.y)));var b=Math.floor(t.threshold.y);if(t.threshold.y=t.threshold.y%1,z){var L=!1,T=t.y+1;if(b>1)for(var B=t.y+b,w=t.y+2;w<=B;w+=1){var G=(0,o.tT)(c,t.x,w),E=(0,o.Ol)(G),I=(0,u.uQ)(e,t,t.x,w,A),N=I.authorized;if(!E||!N){E||(J=!N,R=G),L=!0,!N||I.isFilter||!E&&((0,o.OA)(G)||(0,o.W)(G,a.vZ.Block))?k=i.None:E||((0,o.W)(G,a.vZ.SlidingBlockLeft)?k=i.Left:(0,o.W)(R,a.vZ.SlidingBlockRight)&&(k=i.Right));break}T++}if((0,o.L3)(e,t,t.x,T),!L)return void(t.isFreeFalling=!0)}if((!R||J||!m(e,t,R))&&!(0,f.v)(e,t,R))if(J&&(0,x.$)(e,t))console.log("gro second case... necessary to keep this?");else{if(t.isFreeFalling){var W=Math.abs(t.velocity.y)/10;0===t.velocity.x&&(t.velocity.x=Math.random()>=.5?1:-1),t.velocity.x=t.velocity.x<0?-W:W}if(t.isFreeFalling=!1,t.velocity.y*=.9,t.velocity.y<t.minVelocity.y&&(t.velocity.y=t.minVelocity.y),t.threshold.x+=t.velocity.x*r,t.velocity.x*=.9,k!==i.None&&p(e,t,k))t.isFreeFalling=!0;else{if(t.velocity.x<6&&t.velocity.x>-6)return t.velocity.x=0,void(t.threshold.x=0);if(t.threshold.x<1&&t.threshold.x>-1)(0,o.Y$)(e,t.x,t.y);else{var Z=t.threshold.x<0?Math.ceil(t.threshold.x):Math.floor(t.threshold.x);t.threshold.x=t.threshold.x%1;for(var O,D,V=t.x+Z,P=t.x,H=t.y;P!==V&&(P+=Z<0?-1:1,(0,o.lV)(e,P,H)&&(0,u.xR)(e,t,P,H,A));)(0,o.lV)(e,P,H+1)&&(0,u.xR)(e,t,P,H+1,A)&&(H+=1),O=P,D=H;O&&(0,o.L3)(e,t,O,D)}}}}}}`,
			to: ``,
		});
		fluxloaderAPI.setPatch("js/515.bundle.js", "corelib:solidImprovement", {
			type: "replace",
			from: `var p=function(e,t,r){var c=e.store;if(!t.hasBeenUpdated&&(0,o.Do)(c,t.x,t.y)&&!(0,s.v)(e,t)){var y=!1,v=d.A.get(e.session,"structures",Math.floor(t.x/n.A.snapGridCellSize)*n.A.snapGridCellSize,Math.floor(t.y/n.A.snapGridCellSize)*n.A.snapGridCellSize);v&&(y=v.filter||v.queued),y&&v.filter&&(t.velocity.y=t.minVelocity.y);var g=(0,o.tT)(c,t.x,t.y+1),p=(0,o.OA)(g),A=(0,u.uQ)(e,t,t.x,t.y+1,y),M=!A.authorized,R=i.Both,F=(0,o.Ol)(g);if(p||M||(0,o.W)(g,a.vZ.Block))return t.isFreeFalling=!1,t.velocity.y=t.minVelocity.y,t.velocity.x=0,(0,l.Fy)(c,t),p&&!n.A.useMultithreading&&((0,h.c)(e,t,g,v.type),(0,o.Y$)(e,t.x,t.y)),void(0,x.$)(e,t);if(A.authorized&&A.isFilter&&(R=i.None),F||((0,o.W)(g,a.vZ.SlidingBlockLeft)?R=i.Left:(0,o.W)(g,a.vZ.SlidingBlockRight)&&(R=i.Right)),t.threshold.y+=t.velocity.y*r,t.velocity.y+=n.A.gravity*r,t.threshold.y<1)return t.isFreeFalling&&(0,o.Y$)(e,t.x,t.y),void(F||R===i.None||(R!==i.Left&&R!==i.Both||(0,o.lV)(e,t.x-1,t.y+1)&&(0,o.Y$)(e,t.x,t.y),R!==i.Right&&R!==i.Both||(0,o.lV)(e,t.x+1,t.y+1)&&(0,o.Y$)(e,t.x,t.y)));var C=Math.floor(t.threshold.y);if(t.threshold.y=t.threshold.y%1,F){var J=!1,k=t.y+1;if(C>1)for(var z=t.y+C,b=t.y+2;b<=z;b+=1){var L=(0,o.tT)(c,t.x,b),T=(0,o.Ol)(L),B=(0,u.uQ)(e,t,t.x,b,y),w=B.authorized;if(!T||!w){T||(M=!w,g=L),J=!0,!w||B.isFilter||!T&&((0,o.OA)(L)||(0,o.W)(L,a.vZ.Block))?R=i.None:T||((0,o.W)(L,a.vZ.SlidingBlockLeft)?R=i.Left:(0,o.W)(g,a.vZ.SlidingBlockRight)&&(R=i.Right));break}k++}if((0,o.L3)(e,t,t.x,k),!J)return void(t.isFreeFalling=!0)}if((!g||M||!S(e,t,g))&&!(0,f.v)(e,t,g))if(M&&(0,x.$)(e,t))console.log("gro second case... necessary to keep this?");else{if(t.isFreeFalling){var G=Math.abs(t.velocity.y)/10;0===t.velocity.x&&(t.velocity.x=Math.random()>=.5?1:-1),t.velocity.x=t.velocity.x<0?-G:G}if(t.isFreeFalling=!1,t.velocity.y*=.9,t.velocity.y<t.minVelocity.y&&(t.velocity.y=t.minVelocity.y),t.threshold.x+=t.velocity.x*r,t.velocity.x*=.9,R!==i.None&&m(e,t,R))t.isFreeFalling=!0;else{if(t.velocity.x<6&&t.velocity.x>-6)return t.velocity.x=0,void(t.threshold.x=0);if(t.threshold.x<1&&t.threshold.x>-1)(0,o.Y$)(e,t.x,t.y);else{var E=t.threshold.x<0?Math.ceil(t.threshold.x):Math.floor(t.threshold.x);t.threshold.x=t.threshold.x%1;for(var I,N,W=t.x+E,Z=t.x,O=t.y;Z!==W&&(Z+=E<0?-1:1,(0,o.lV)(e,Z,O)&&(0,u.xR)(e,t,Z,O,y));)(0,o.lV)(e,Z,O+1)&&(0,u.xR)(e,t,Z,O+1,y)&&(O+=1),I=Z,N=O;I&&(0,o.L3)(e,t,I,N)}}}}}`,
			to: ``,
		});
		fluxloaderAPI.setPatch("js/515.bundle.js", "corelib:liquidImprovement", {
			type: "replace",
			from: `v=function(e,t,r){var a=e.store;if(!t.hasBeenUpdated&&(0,l.Do)(a,t.x,t.y)){var o=!1,s=d.A.get(e.session,"structures",Math.floor(t.x/i.A.snapGridCellSize)*i.A.snapGridCellSize,Math.floor(t.y/i.A.snapGridCellSize)*i.A.snapGridCellSize);if(s&&(o=s.queued),t.movesOnSameYAxis.count>1e3)return i.A.useMultithreading&&e.shared.reservoir[0]++,void(0,l.Nz)(e,t);if(t.threshold.y+=t.velocity.y*r,t.velocity.y+=i.A.gravity*r,t.threshold.y<1)if(t.isFreeFalling)try{(0,l.Y$)(e,t.x,t.y)}catch(e){console.log("Error in reportToChunkAtCellPos",e,JSON.stringify(t))}else p(e,t);else{var h=Math.floor(t.threshold.y);t.threshold.y=t.threshold.y%1;var c=(0,l.tT)(a,t.x,t.y+1);if(!f(e,t.x,t.y+1,o))if((0,l.Ol)(c)){var y=t.y+1;if(h>1)for(var v=t.y+h,m=t.y+2;m<=v;m+=1){var S=(0,l.tT)(a,t.x,m);if(!(0,l.Ol)(S))break;y++}t.isFreeFalling=!0;try{(0,l.L3)(e,t,t.x,y)}catch(e){}}else t.isFreeFalling&&t.type===n.RJ.Water&&(0,u.$T)(e,t.x*i.A.cellSize,t.y*i.A.cellSize,u.c6.Water),x(e,t,c,t.x,t.y+1)||(t.isFreeFalling=!1,t.velocity.y*=.9,t.velocity.y<t.minVelocity.y&&(t.velocity.y=t.minVelocity.y),g(e,t)||p(e,t,!0))}}}`,
			to: ``,
		});
		fluxloaderAPI.setPatch("js/515.bundle.js", "corelib:gasImprovement", {
			type: "replace",
			from: `y=function(e,t,r){var o=e.store;if(!t.hasBeenUpdated&&(0,l.Do)(o,t.x,t.y))if(t.movesOnSameYAxis.count>1e3)(0,a.qL)(t,n.RJ.Steam)?(0,l.Jx)(e,t.x,t.y,(0,a.n)(n.RJ.Water,t.x,t.y)):(0,l.Nz)(e,t);else if(t.threshold.y+=t.velocity.y*r,t.velocity.y+=i.A.upflow*r,t.threshold.y>-1)t.isFreeFalling?(0,l.Y$)(e,t.x,t.y):v(e,t);else{var s=Math.ceil(t.threshold.y);t.threshold.y=t.threshold.y%1;var h={x:t.x,y:t.y-1};if(!(h.y<0)){var c=(0,l.tT)(o,h.x,h.y);if((0,l.Ol)(c)){var y=t.y-1;if(s>1)for(var x=t.y-s,g=t.y-2;g<=x;g-=1){var p=(0,l.tT)(o,t.x,g);if(!(0,l.Ol)(p))break;y--}if(t.isFreeFalling=!0,t.y<100&&t.type===n.RJ.Steam){if(e.shared.reservoir[0]>0){e.shared.reservoir[0]--;try{(0,l.Jx)(e,t.x,y,(0,a.n)(n.RJ.Water,t.x,y)),(0,l.Jx)(e,t.x,t.y,(0,a.n)(n.RJ.Water,t.x,t.y)),u||(e.environment.postMessage([n.dD.ForceCompleteObjective,"let_it_rain"]),u=!0)}catch(e){console.log("Gas reservoir out of bounds issue happened",t,s,y)}return}return(0,l.L3)(e,t,t.x,y),void(0,l.Jx)(e,t.x,t.y,(0,a.n)(n.RJ.Water,t.x,t.y))}(0,l.L3)(e,t,t.x,y)}else d(e,t,c,h.x,h.y)||(t.isFreeFalling=!1,t.velocity.y*=.9,t.velocity.y>t.minVelocity.y&&(t.velocity.y=t.minVelocity.y),f(e,t)||v(e,t,!0))}}}`,
			to: ``,
		});*/
	}
}

globalThis.BlocksModule = BlocksModule;

/*
//slushy
var g=function(e,t,r){var c=e.store;if(!t.hasBeenUpdated&&(0,o.Do)(c,t.x,t.y)&&!(0,s.v)(e,t)){var y=!1,v=d.A.get(e.session,"structures",Math.floor(t.x/n.A.snapGridCellSize)*n.A.snapGridCellSize,Math.floor(t.y/n.A.snapGridCellSize)*n.A.snapGridCellSize);v&&(y=v.filter||v.queued),y&&v.filter&&(t.velocity.y=t.minVelocity.y);var g=(0,o.tT)(c,t.x,t.y+1),S=(0,o.OA)(g),A=(0,u.uQ)(e,t,t.x,t.y+1,y),M=!A.authorized,R=i.Both,F=(0,o.Ol)(g);if(S||M||(0,o.W)(g,a.vZ.Block))return t.isFreeFalling=!1,t.velocity.y=t.minVelocity.y,t.velocity.x*=.7,(0,l.Fy)(c,t),S&&!n.A.useMultithreading&&((0,h.c)(e,t,g,v.type),(0,o.Y$)(e,t.x,t.y)),void(0,x.$)(e,t);if(A.authorized&&A.isFilter&&(R=i.None),F||((0,o.W)(g,a.vZ.SlidingBlockLeft)?R=i.Left:(0,o.W)(g,a.vZ.SlidingBlockRight)&&(R=i.Right)),t.threshold.y+=t.velocity.y*r,t.velocity.y+=n.A.gravity*r,t.threshold.y<1)return t.isFreeFalling&&(0,o.Y$)(e,t.x,t.y),void(F||R===i.None||(R!==i.Left&&R!==i.Both||(0,o.lV)(e,t.x-1,t.y+1)&&(0,o.Y$)(e,t.x,t.y),R!==i.Right&&R!==i.Both||(0,o.lV)(e,t.x+1,t.y+1)&&(0,o.Y$)(e,t.x,t.y)));var C=Math.floor(t.threshold.y);if(t.threshold.y=t.threshold.y%1,F){var J=!1,k=t.y+1;if(C>1)for(var z=t.y+C,b=t.y+2;b<=z;b+=1){var L=(0,o.tT)(c,t.x,b),T=(0,o.Ol)(L),B=(0,u.uQ)(e,t,t.x,b,y),w=B.authorized;if(!T||!w){T||(M=!w,g=L),J=!0,!w||B.isFilter||!T&&((0,o.OA)(L)||(0,o.W)(L,a.vZ.Block))?R=i.None:T||((0,o.W)(L,a.vZ.SlidingBlockLeft)?R=i.Left:(0,o.W)(g,a.vZ.SlidingBlockRight)&&(R=i.Right));break}k++}if((0,o.L3)(e,t,t.x,k),!J)return void(t.isFreeFalling=!0)}if((!g||M||!m(e,t,g))&&!((0,f.v)(e,t,g)||M&&(0,x.$)(e,t))){if(t.isFreeFalling){var G=Math.abs(t.velocity.y)/5;G*=.8+.4*Math.random(),0===t.velocity.x&&(t.velocity.x=2*(Math.random()-.5)),t.velocity.x=t.velocity.x<0?-G:G}if(t.isFreeFalling=!1,t.velocity.y*=.95,t.velocity.y<t.minVelocity.y&&(t.velocity.y=t.minVelocity.y),t.threshold.x+=t.velocity.x*r,t.velocity.x*=.95,R!==i.None&&p(e,t,R))t.isFreeFalling=!0;else{if(t.velocity.x<6&&t.velocity.x>-6)return t.velocity.x=0,void(t.threshold.x=0);if(t.threshold.x<1&&t.threshold.x>-1)(0,o.Y$)(e,t.x,t.y);else{var E=t.threshold.x<0?Math.ceil(t.threshold.x):Math.floor(t.threshold.x);t.threshold.x=t.threshold.x%1;for(var I,N,W=t.x+E,Z=t.x,O=t.y;Z!==W&&(Z+=E<0?-1:1,(0,o.lV)(e,Z,O)&&(0,u.xR)(e,t,Z,O,y));)(0,o.lV)(e,Z,O+1)&&(0,u.xR)(e,t,Z,O+1,y)&&(O+=1),I=Z,N=O;I&&(0,o.L3)(e,t,I,N)}}}}}

//wisp
var g=function(e,t,r){var c=e.store;if(!t.hasBeenUpdated&&(0,o.Do)(c,t.x,t.y)){if((0,o.Ol)((0,o.tT)(c,t.x,t.y+1))&&!d.A.get(e.session,"structures",Math.floor(t.x/n.A.snapGridCellSize)*n.A.snapGridCellSize,Math.floor((t.y+1)/n.A.snapGridCellSize)*n.A.snapGridCellSize)){var y=.5+Math.random();if(t.velocity.y=Math.min(t.velocity.y+1*n.A.gravity*y*r,6),0===t.velocity.x&&(t.velocity.x=Math.random()>.5?8:-8),Math.random()<.1&&(t.velocity.x*=-1,Math.random()<.3&&(t.velocity.y*=.5)),t.threshold.x+=t.velocity.x*r,t.threshold.y+=t.velocity.y*r,Math.abs(t.threshold.x)>=1){var v=t.threshold.x<0?Math.ceil(t.threshold.x):Math.floor(t.threshold.x);t.threshold.x=t.threshold.x%1;var g=t.x+v,S=d.A.get(e.session,"structures",Math.floor(g/n.A.snapGridCellSize)*n.A.snapGridCellSize,Math.floor(t.y/n.A.snapGridCellSize)*n.A.snapGridCellSize);
	if((0,o.lV)(e,g,t.y)&&!S)return void(0,o.L3)(e,t,g,t.y)}}else t.velocity.x=0,t.velocity.y=t.minVelocity.y;
	if(!(0,s.v)(e,t)){var A=!1,M=d.A.get(e.session,"structures",Math.floor(t.x/n.A.snapGridCellSize)*n.A.snapGridCellSize,Math.floor(t.y/n.A.snapGridCellSize)*n.A.snapGridCellSize);
		M&&(A=M.filter||M.queued),A&&M.filter&&(t.velocity.y=t.minVelocity.y);
		var R=(0,o.tT)(c,t.x,t.y+1),F=(0,o.OA)(R),C=(0,u.uQ)(e,t,t.x,t.y+1,A),J=!C.authorized,k=i.Both,z=(0,o.Ol)(R);
		if (corelib.blocks.doBlockRecipes(t.x,t.y,t,R)) return true
		if(F||J||(0,o.W)(R,a.vZ.Block))return t.isFreeFalling=!1,t.velocity.y=t.minVelocity.y,t.velocity.x=0,(0,l.Fy)(c,t),F&&!n.A.useMultithreading&&((0,h.c)(e,t,R,M.type),(0,o.Y$)(e,t.x,t.y)),void(0,x.$)(e,t);if(C.authorized&&C.isFilter&&(k=i.None),z||((0,o.W)(R,a.vZ.SlidingBlockLeft)?k=i.Left:(0,o.W)(R,a.vZ.SlidingBlockRight)&&(k=i.Right)),t.threshold.y+=t.velocity.y*r,t.velocity.y+=n.A.gravity*r,t.threshold.y<1)return t.isFreeFalling&&(0,o.Y$)(e,t.x,t.y),void(z||k===i.None||(k!==i.Left&&k!==i.Both||(0,o.lV)(e,t.x-1,t.y+1)&&(0,o.Y$)(e,t.x,t.y),k!==i.Right&&k!==i.Both||(0,o.lV)(e,t.x+1,t.y+1)&&(0,o.Y$)(e,t.x,t.y)));var b=Math.floor(t.threshold.y);if(t.threshold.y=t.threshold.y%1,z){var L=!1,T=t.y+1;if(b>1)for(var B=t.y+b,w=t.y+2;w<=B;w+=1){var G=(0,o.tT)(c,t.x,w),E=(0,o.Ol)(G),I=(0,u.uQ)(e,t,t.x,w,A),N=I.authorized;if(!E||!N){E||(J=!N,R=G),L=!0,!N||I.isFilter||!E&&((0,o.OA)(G)||(0,o.W)(G,a.vZ.Block))?k=i.None:E||((0,o.W)(G,a.vZ.SlidingBlockLeft)?k=i.Left:(0,o.W)(R,a.vZ.SlidingBlockRight)&&(k=i.Right));break}T++}if((0,o.L3)(e,t,t.x,T),!L)return void(t.isFreeFalling=!0)}if((!R||J||!m(e,t,R))&&!(0,f.v)(e,t,R))if(t.isFreeFalling){var W=Math.abs(t.velocity.y)/10;0===t.velocity.x&&(t.velocity.x=Math.random()>=.5?1:-1),t.velocity.x=t.velocity.x<0?-W:W}if(t.isFreeFalling=!1,t.velocity.y*=.9,t.velocity.y<t.minVelocity.y&&(t.velocity.y=t.minVelocity.y),t.threshold.x+=t.velocity.x*r,t.velocity.x*=.9,k!==i.None&&p(e,t,k))t.isFreeFalling=!0;else{if(t.velocity.x<6&&t.velocity.x>-6)return t.velocity.x=0,void(t.threshold.x=0);if(t.threshold.x<1&&t.threshold.x>-1)(0,o.Y$)(e,t.x,t.y);else{var Z=t.threshold.x<0?Math.ceil(t.threshold.x):Math.floor(t.threshold.x);t.threshold.x=t.threshold.x%1;for(var O,D,V=t.x+Z,P=t.x,H=t.y;P!==V&&(P+=Z<0?-1:1,(0,o.lV)(e,P,H)&&(0,u.xR)(e,t,P,H,A));)(0,o.lV)(e,P,H+1)&&(0,u.xR)(e,t,P,H+1,A)&&(H+=1),O=P,D=H;O&&(0,o.L3)(e,t,O,D)}}}}}
//solid

var p=function(e,t,r){var c=e.store;if(!t.hasBeenUpdated&&(0,o.Do)(c,t.x,t.y)&&!(0,s.v)(e,t)){var y=!1,v=d.A.get(e.session,"structures",Math.floor(t.x/n.A.snapGridCellSize)*n.A.snapGridCellSize,Math.floor(t.y/n.A.snapGridCellSize)*n.A.snapGridCellSize);v&&(y=v.filter||v.queued),y&&v.filter&&(t.velocity.y=t.minVelocity.y);var g=(0,o.tT)(c,t.x,t.y+1),p=(0,o.OA)(g),A=(0,u.uQ)(e,t,t.x,t.y+1,y),M=!A.authorized,R=i.Both,F=(0,o.Ol)(g);if(p||M||(0,o.W)(g,a.vZ.Block))return t.isFreeFalling=!1,t.velocity.y=t.minVelocity.y,t.velocity.x=0,(0,l.Fy)(c,t),p&&!n.A.useMultithreading&&((0,h.c)(e,t,g,v.type),(0,o.Y$)(e,t.x,t.y)),void(0,x.$)(e,t);if(A.authorized&&A.isFilter&&(R=i.None),F||((0,o.W)(g,a.vZ.SlidingBlockLeft)?R=i.Left:(0,o.W)(g,a.vZ.SlidingBlockRight)&&(R=i.Right)),t.threshold.y+=t.velocity.y*r,t.velocity.y+=n.A.gravity*r,t.threshold.y<1)return t.isFreeFalling&&(0,o.Y$)(e,t.x,t.y),void(F||R===i.None||(R!==i.Left&&R!==i.Both||(0,o.lV)(e,t.x-1,t.y+1)&&(0,o.Y$)(e,t.x,t.y),R!==i.Right&&R!==i.Both||(0,o.lV)(e,t.x+1,t.y+1)&&(0,o.Y$)(e,t.x,t.y)));var C=Math.floor(t.threshold.y);if(t.threshold.y=t.threshold.y%1,F){var J=!1,k=t.y+1;if(C>1)for(var z=t.y+C,b=t.y+2;b<=z;b+=1){var L=(0,o.tT)(c,t.x,b),T=(0,o.Ol)(L),B=(0,u.uQ)(e,t,t.x,b,y),w=B.authorized;if(!T||!w){T||(M=!w,g=L),J=!0,!w||B.isFilter||!T&&((0,o.OA)(L)||(0,o.W)(L,a.vZ.Block))?R=i.None:T||((0,o.W)(L,a.vZ.SlidingBlockLeft)?R=i.Left:(0,o.W)(g,a.vZ.SlidingBlockRight)&&(R=i.Right));break}k++}if((0,o.L3)(e,t,t.x,k),!J)return void(t.isFreeFalling=!0)}if((!g||M||!S(e,t,g))&&!(0,f.v)(e,t,g))if(M&&(0,x.$)(e,t))console.log("gro second case... necessary to keep this?");else{if(t.isFreeFalling){var G=Math.abs(t.velocity.y)/10;0===t.velocity.x&&(t.velocity.x=Math.random()>=.5?1:-1),t.velocity.x=t.velocity.x<0?-G:G}if(t.isFreeFalling=!1,t.velocity.y*=.9,t.velocity.y<t.minVelocity.y&&(t.velocity.y=t.minVelocity.y),t.threshold.x+=t.velocity.x*r,t.velocity.x*=.9,R!==i.None&&m(e,t,R))t.isFreeFalling=!0;else{if(t.velocity.x<6&&t.velocity.x>-6)return t.velocity.x=0,void(t.threshold.x=0);if(t.threshold.x<1&&t.threshold.x>-1)(0,o.Y$)(e,t.x,t.y);else{var E=t.threshold.x<0?Math.ceil(t.threshold.x):Math.floor(t.threshold.x);t.threshold.x=t.threshold.x%1;for(var I,N,W=t.x+E,Z=t.x,O=t.y;Z!==W&&(Z+=E<0?-1:1,(0,o.lV)(e,Z,O)&&(0,u.xR)(e,t,Z,O,y));)(0,o.lV)(e,Z,O+1)&&(0,u.xR)(e,t,Z,O+1,y)&&(O+=1),I=Z,N=O;I&&(0,o.L3)(e,t,I,N)}}}}}
//liquid

v=function(e,t,r){var a=e.store;if(!t.hasBeenUpdated&&(0,l.Do)(a,t.x,t.y)){var o=!1,s=d.A.get(e.session,"structures",Math.floor(t.x/i.A.snapGridCellSize)*i.A.snapGridCellSize,Math.floor(t.y/i.A.snapGridCellSize)*i.A.snapGridCellSize);if(s&&(o=s.queued),t.movesOnSameYAxis.count>1e3)return i.A.useMultithreading&&e.shared.reservoir[0]++,void(0,l.Nz)(e,t);if(t.threshold.y+=t.velocity.y*r,t.velocity.y+=i.A.gravity*r,t.threshold.y<1)if(t.isFreeFalling)try{(0,l.Y$)(e,t.x,t.y)}catch(e){console.log("Error in reportToChunkAtCellPos",e,JSON.stringify(t))}else p(e,t);else{var h=Math.floor(t.threshold.y);t.threshold.y=t.threshold.y%1;var c=(0,l.tT)(a,t.x,t.y+1);if(!f(e,t.x,t.y+1,o))if((0,l.Ol)(c)){var y=t.y+1;if(h>1)for(var v=t.y+h,m=t.y+2;m<=v;m+=1){var S=(0,l.tT)(a,t.x,m);if(!(0,l.Ol)(S))break;y++}t.isFreeFalling=!0;try{(0,l.L3)(e,t,t.x,y)}catch(e){}}else t.isFreeFalling&&t.type===n.RJ.Water&&(0,u.$T)(e,t.x*i.A.cellSize,t.y*i.A.cellSize,u.c6.Water),x(e,t,c,t.x,t.y+1)||(t.isFreeFalling=!1,t.velocity.y*=.9,t.velocity.y<t.minVelocity.y&&(t.velocity.y=t.minVelocity.y),g(e,t)||p(e,t,!0))}}}
//gas

y=function(e,t,r){var o=e.store;if(!t.hasBeenUpdated&&(0,l.Do)(o,t.x,t.y))if(t.movesOnSameYAxis.count>1e3)(0,a.qL)(t,n.RJ.Steam)?(0,l.Jx)(e,t.x,t.y,(0,a.n)(n.RJ.Water,t.x,t.y)):(0,l.Nz)(e,t);else if(t.threshold.y+=t.velocity.y*r,t.velocity.y+=i.A.upflow*r,t.threshold.y>-1)t.isFreeFalling?(0,l.Y$)(e,t.x,t.y):v(e,t);else{var s=Math.ceil(t.threshold.y);t.threshold.y=t.threshold.y%1;var h={x:t.x,y:t.y-1};if(!(h.y<0)){var c=(0,l.tT)(o,h.x,h.y);if((0,l.Ol)(c)){var y=t.y-1;if(s>1)for(var x=t.y-s,g=t.y-2;g<=x;g-=1){var p=(0,l.tT)(o,t.x,g);if(!(0,l.Ol)(p))break;y--}if(t.isFreeFalling=!0,t.y<100&&t.type===n.RJ.Steam){if(e.shared.reservoir[0]>0){e.shared.reservoir[0]--;try{(0,l.Jx)(e,t.x,y,(0,a.n)(n.RJ.Water,t.x,y)),(0,l.Jx)(e,t.x,t.y,(0,a.n)(n.RJ.Water,t.x,t.y)),u||(e.environment.postMessage([n.dD.ForceCompleteObjective,"let_it_rain"]),u=!0)}catch(e){console.log("Gas reservoir out of bounds issue happened",t,s,y)}return}return(0,l.L3)(e,t,t.x,y),void(0,l.Jx)(e,t.x,t.y,(0,a.n)(n.RJ.Water,t.x,t.y))}(0,l.L3)(e,t,t.x,y)}else d(e,t,c,h.x,h.y)||(t.isFreeFalling=!1,t.velocity.y*=.9,t.velocity.y>t.minVelocity.y&&(t.velocity.y=t.minVelocity.y),f(e,t)||v(e,t,!0))}}}
//*/
