class BlocksModule {
	blockRegistry = new DefinitionRegistry("Block", 99);
	idMap = {};

	validateInput() {
		let res = InputHandler(data, {
			sourceMod: { type: "string" },
			id: { type: "string" },
			name: { type: "string" },
			description: { type: "string" },
			shape: {
				type: "object",
				// Ensure shape is a 4x4 matrix of integers
				verifier: (v) => {
					let valid = true;
					valid &&= v.length === 4;
					if (!valid) return false;
					for (const i of v) {
						valid &&= i.length === 4;
						for (const j of i) {
							valid &&= Number.isInteger(j);
						}
					}
					return valid;
				},
			},
			angles: {
				type: "object",
				default: [],
				// Ensure angles is an array of integers
				verifier: (v) => {
					let valid = true;
					for (const i of v) {
						valid &&= Number.isInteger(i);
					}
					return valid;
				},
			},
			imagePath: {
				type: "string",
			},
			singleBuild: {
				type: "boolean",
				default: false,
			},
			hasConfigMenu: {
				type: "boolean",
				default: false,
			},
		});
		if (!res.success) {
			let message = res.error.message;
			if (res.error.argument === "shape" && res.error.message.includes("verifier")) message = "Parameter 'shape' must be a 4x4 matrix of integers";
			if (res.error.argument === "angles") message = "Parameter 'angles' must be an array of integers";
			// Makes mod fail electron entrypoint, instead of failing silently..
			throw new Error(message);
		}
		return res.data;
	}

	blockSchema = {
		sourceMod: { type: "string" },
		id: { type: "string" },
		name: { type: "string" },
		description: { type: "string" },
		shape: {
			type: "object",
			// Ensure shape is a 4x4 matrix of integers
			verifier: (v) => {
				let valid = true;
				valid &&= v.length === 4;
				if (!valid)
					return {
						success: false,
					};
				for (const i of v) {
					valid &&= i.length === 4;
					for (const j of i) {
						valid &&= Number.isInteger(j);
					}
				}
				return {
					success: valid,
					message: `Parameter 'shape' must be a 4x4 matrix of integers`,
				};
			},
		},
		angles: {
			type: "object",
			default: [],
			// Ensure angles is an array of integers
			verifier: (v) => {
				let valid = true;
				for (const i of v) {
					valid &&= Number.isInteger(i);
				}
				return {
					success: valid,
					message: `Parameter 'angles' must be an array of integers`,
				};
			},
		},
		imagePath: {
			type: "string",
			default: "", // Allows using the not provided image
		},
		singleBuild: {
			type: "boolean",
			default: false,
		},
		hasConfigMenu: {
			type: "boolean",
			default: false,
		},
		hasHoverUI: {
			type: "boolean",
			default: false,
		},
		// Determines if a block should be given with no tech unlocked
		// Keep off if you want this unlocked by tech; on if it's unlocked at the start of a new game
		default: {
			type: "boolean",
			default: false,
		},
		animationDelay: {
			type: "number",
			default: 500,
			verifier: (v) => {
				return {
					success: Number.isInteger(v) && v > 0,
					message: `Parameter 'animationDelay' must be an integer greater than 0`,
				};
			},
		},
	};
	register(data) {
		let res = InputHandler(data, this.blockSchema);
		if (!res.success) {
			// Makes mod fail electron entrypoint, instead of failing silently..
			throw new Error(res.message);
		}
		// Use processed data, which includes defaults
		data = res.data;
		let fullImagePath = this._getFullImagePath(data.sourceMod, data.id, data.imagePath);
		this.idMap[data.id] = this.blockRegistry.register({ isVariant: false, variants: [], fullImagePath, ...data });
	}

	variantSchema = {
		parentId: {
			type: "string",
		},
		suffix: {
			type: "string",
		},
		shape: {
			type: "object",
			// Ensure shape is a 4x4 matrix of integers
			verifier: (v) => {
				let valid = true;
				valid &&= v.length === 4;
				if (!valid)
					return {
						success: false,
					};
				for (const i of v) {
					valid &&= i.length === 4;
					for (const j of i) {
						valid &&= Number.isInteger(j);
					}
				}
				return {
					success: valid,
					message: `Parameter 'shape' must be a 4x4 matrix of integers`,
				};
			},
		},
		angles: {
			type: "object",
			default: [],
			// Ensure angles is an array of integers
			verifier: (v) => {
				let valid = true;
				for (const i of v) {
					valid &&= Number.isInteger(i);
				}
				return {
					success: valid,
					message: `Parameter 'angles' must be an array of integers`,
				};
			},
		},
		imagePath: {
			type: "string",
			default: "", // Allows using the not provided image
		},
		hasHoverUI: {
			type: "boolean",
			default: false,
		},
		animationDelay: {
			type: "number",
			default: 500,
			verifier: (v) => {
				return {
					success: Number.isInteger(v) && v > 0,
					message: `Parameter 'animationDelay' must be an integer greater than 0`,
				};
			},
		},
	};
	registerVariant(data) {
		let res = InputHandler(data, this.variantSchema);
		if (!res.success) {
			// Makes mod fail electron entrypoint, instead of failing silently..
			throw new Error(res.message);
		}
		// Use processed data, which includes defaults
		data = res.data;
		if (!this.idMap.hasOwnProperty(data.parentId)) {
			return log("error", "corelib", `Parent block id: "${data.parentId}" for variant "${data.parentId}${data.suffix}"not found!`);
		}

		let id = data.parentId + data.suffix;
		let parentBlock = this.blockRegistry.definitions[this.idMap[data.parentId]];
		let fullImagePath = this._getFullImagePath(parentBlock.sourceMod, id, data.imagePath);
		this.idMap[id] = this.blockRegistry.register({ isVariant: true, fullImagePath, ...data });

		parentBlock.variants.push({ fullImagePath, ...data });
	}

	unregister(id) {
		if (!this.idMap.hasOwnProperty(id)) {
			return log("error", "corelib", `Block with id "${id}" not found! Unable to unregister.`);
		}

		if (this.blockRegistry.definitions[this.idMap[id]].isVariant) {
			return log("error", "corelib", `Block with id "${id}" is a variant and cannot be unregistered directly! Please unregister the parent block instead.`);
		}

		for (let variant of this.blockRegistry.definitions[this.idMap[id]].variants) {
			this.blockRegistry.unregister(this.idMap[variant.id]);
			delete this.idMap[variant.id];
		}

		this.blockRegistry.unregister(this.idMap[id]);
		delete this.idMap[id];
	}

	_getFullImagePath = function (sourceMod, id, imagePath) {
		let _return = path.join(fluxloaderAPI.getModsPath(), sourceMod, (imagePath || id) + ".png").replace(/\\/g, "/");

		if (!fs.existsSync(_return)) {
			_return = path.join(fluxloaderAPI.getModsPath(), "corelib", "assets/noimage.png").replace(/\\/g, "/");
		}

		return _return;
	};

	applyPatches() {
		log("info", "corelib", "Loading block patches");

		const reduceBlocks = (f) => {
			return Object.values(this.blockRegistry.definitions)
				.filter((b) => !b.isVariant)
				.reduce((acc, b) => acc + f(b), "");
		};

		const reduceBlockVariants = (b, f) => {
			return b.variants.reduce((acc, v) => acc + f(v), "");
		};

		fluxloaderAPI.setMappedPatch({ "js/bundle.js": ["V"], "js/336.bundle.js": ["e"], "js/546.bundle.js": ["e"] }, "corelib:blockTypes", (v1) => ({
			type: "replace",
			from: `${v1}[${v1}.GloomEmitter=27]="GloomEmitter"`,
			to: `~` + reduceBlocks((b) => `,${v1}[${v1}.${b.id}=${this.idMap[b.id]}]="${b.id}"` + reduceBlockVariants(b, (v) => `,${v1}[${v1}.${v.id}=${this.idMap[v.id]}]="${v.id}"`)),
			token: `~`,
		}));

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:blockInventory", {
			type: "replace",
			from: `d.Foundation,d.Collector`,
			// Only include blocks that have the `default` property
			to: `~` + reduceBlocks((b) => (b.default ? `,d.${b.id}` : "")),
			token: `~`,
		});

		fluxloaderAPI.setMappedPatch({ "js/bundle.js": [], "js/515.bundle.js": [] }, "corelib:blockShapes", (v) => ({
			type: "replace",
			from: `"grower":[[12,12,12,12],[0,0,0,0],[0,0,0,0],[0,0,0,0]]`,
			to: `~` + reduceBlocks((b) => `,"${b.id}":${JSON.stringify(b.shape)}` + reduceBlockVariants(b, (v) => `,"${v.id}":${JSON.stringify(v.shape)}`)),
			token: `~`,
		}));

		fluxloaderAPI.setMappedPatch({ "js/bundle.js": ["Vh", "d", "ud"], "js/336.bundle.js": ["n", "l.ev", "u"], "js/546.bundle.js": ["a", "o.ev", "l"] }, "corelib:blockTypeDefinitions", (v1, v2, v3) => ({
			type: "replace",
			from: `${v1}[${v2}.FoundationAngledRight]={shape:${v3}["foundation-triangle-right"]}`,
			to:
				`~` +
				reduceBlocks(
					(b) =>
						`,${v1}[${v2}.${b.id}]={shape:${v3}["${b.id}"],variants:[{id:${v2}.${b.id},angles:[${b.angles.join(",")}]}` +
						reduceBlockVariants(b, (v) => `,{id:${v2}.${v.id},angles:[${v.angles.join(",")}]}`) +
						`],name:"${b.name}",description:"${b.description}",singleBuild:${b.singleBuild}}` +
						reduceBlockVariants(b, (v) => `,${v1}[${v2}.${v.id}]={shape:${v3}["${v.id}"]}`),
				),
			token: `~`,
		}));

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:blockImages", {
			type: "replace",
			from: `Rf[d.Foundation]={imageName:"block"}`,
			to: `~` + reduceBlocks((b) => `,Rf[d.${b.id}]={imageName:"${b.fullImagePath}",isAbsolute:true}` + reduceBlockVariants(b, (v) => `,Rf[d.${v.id}]={imageName:"${v.fullImagePath}",isAbsolute:true}`)),
			token: `~`,
		});

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:blockLoadTextures", {
			type: "replace",
			from: `sm("frame_block")`,
			to: `~` + reduceBlocks((b) => `,sm("${b.fullImagePath}")` + reduceBlockVariants(b, (v) => `,sm("${v.fullImagePath}")`)),
			token: `~`,
		});

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:blockDrawTextures", {
			type: "replace",
			from: `if(n.type!==d.Collector)`,
			to:
				reduceBlocks(
					(b) =>
						`if(n.type===d.${b.id}){l=t.session.rendering.images["${b.fullImagePath}"],(u=e.snapGridCellSize*e.cellSize),(c=Nf(t,n.x*e.cellSize,n.y*e.cellSize));h.drawImage(l.image,l.image.height*(Math.floor(t.store.meta.time/${
							b.animationDelay || 500
						})%(l.image.width/l.image.height)),0,l.image.height,l.image.height,c.x,c.y,u,u);}else ` +
						reduceBlockVariants(
							b,
							(v) =>
								`if(n.type===d.${b.id}){l=t.session.rendering.images["${
									v.fullImagePath
								}"],(u=e.snapGridCellSize*e.cellSize),(c=Nf(t,n.x*e.cellSize,n.y*e.cellSize));h.drawImage(l.image,l.image.height*(Math.floor(t.store.meta.time/${
									v.animationDelay || 500
								})%(l.image.width/l.image.height)),0,l.image.height,l.image.height,c.x,c.y,u,u);}else `,
						),
				) + "~",
			token: `~`,
		});

		let blocksWithConfig = Object.values(this.blockRegistry.definitions)
			.filter((b) => !b.isVariant && b.hasConfigMenu)
			.map((v) => v.id);

		const reduceBlocksWithConfig = (f) => {
			return blocksWithConfig.reduce((acc, v) => acc + f(v), "");
		};

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

		const configUIFunction = function () {
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
			let targetChecker = React.useRef(null);
			// pre UI render - by mod that registered the block
			data.extra = globalThis["block__BLOCKID__PreConfigUI"] ? globalThis["block__BLOCKID__PreConfigUI"](data) : {};
			if (!data.state.session.windows.building.__BLOCKID__Config) return null;
			return React.createElement(
				"div",
				{
					className: "fixed inset-0 flex items-center justify-center bg-black bg-opacity-50",
					onClick: (check) => {
						// Only closes UI if clicked element was not part of the menu
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
						// use UI returned by mod
						globalThis["block__BLOCKID__ConfigUI"] ? globalThis["block__BLOCKID__ConfigUI"](data) : undefined,
					),
				),
			);
		};

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

		let blocksWithHover = Object.values(this.blockRegistry.definitions)
			.filter((b) => b.hasHoverUI)
			.map((v) => v.id);

		const reduceBlocksWithHover = (f) => {
			return blocksWithHover.reduce((acc, v) => acc + f(v), "");
		};

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
	}
}

globalThis.BlocksModule = BlocksModule;
