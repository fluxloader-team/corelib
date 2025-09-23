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
		interval: {
			type: "number",
			default: 0 // means no ticking 
		}
	};
	register(data) {
		let res = InputHandler(data, this.blockSchema);
		if (!res.success) {
			// Makes mod fail electron entrypoint, instead of failing silently..
			throw new Error(res.message);
		}
		// Use processed data, which includes defaults
		data = res.data;
		if (data.interval > 0) {
			// format in events is corelib:schedules-_tickingBlock-{id}, may want to improve this but it seems fine to me for internal naming and is verbose like the rest of corelib
			globalThis.corelib.schedules.register({id:`_tickingBlock-${data.id}`, interval: data.interval});
		}
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
			to: `~` + reduceBlocks((b) => `,d.${b.id}`),
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
						reduceBlockVariants(b, (v) => `,${v1}[${v2}.${v.id}]={shape:${v3}["${v.id}"]}`)
				),
			token: `~`,
		}));

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:blockImages", {
			type: "replace",
			from: `Rf[d.Foundation]={imageName:"block"}`,
			to:
				`~` +
				reduceBlocks(
					(b) =>
						`,Rf[d.${b.id}]={imageName:"${b.fullImagePath}",isAbsolute:true,size: {
                width: 4 * e.cellSize,
                height: 4 * e.cellSize
            }}` +
						reduceBlockVariants(
							b,
							(v) => `,Rf[d.${v.id}]={imageName:"${v.fullImagePath}",isAbsolute:true,size: {
                width: 4 * e.cellSize,
                height: 4 * e.cellSize
            }}`
						)
				),
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
				"if([" +
				reduceBlocks((b) => `d.${b.id},` + reduceBlockVariants(b, (v) => `d.${v.id},`)) +
				`].includes(n.type)){f=zf[n.type];l=t.session.rendering.images[f.imageName],(u=e.snapGridCellSize * e.cellSize),(c=Nf(t,n.x*e.cellSize,n.y*e.cellSize));h.drawImage(l.image,l.image.height*(t.shared.conveyorBeltsAnimationIndex[0]%(l.image.width/l.image.height)),0,l.image.height,l.image.height,c.x,c.y,u,u);}else ~`,
			token: `~`,
		});

		let blocksWithConfig = Object.values(this.blockRegistry.definitions)
			.filter((b) => !b.isVariant && b.hasConfigMenu)
			.map((v) => v.id);

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:blockConfigMenu", {
			type: "replace",
			from: "n.id===d.FilterRight&&(e.session.windows.building.filterConfig=!0,Al(e,k.FilterConfig))",
			to: "~" + blocksWithConfig.map((id) => `,n.id===d.${id}&&(e.session.windows.building.${id}Config=!0,Al(e,k.${id}Config))`),
			token: "~",
		});

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:blockOpenConfig", {
			type: "replace",
			from: "t.type===o.Building?t.id===",
			to: "~" + blocksWithConfig.map((id) => `d.${id}?((e.session.windows.building.${id}Config=!0),void Al(e,k.${id}Config)):t.id===`),
			token: "~",
		});

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:blockCloseConfig", {
			type: "replace",
			from: `(!e.session.windows.building.filterConfig||(e.session.windows.building.filterConfig=!1,Al(e,k.FilterConfig),e.session.windows.options.open))`,
			to: "~" + blocksWithConfig.map((id) => `&&(!e.session.windows.building.${id}Config||(e.session.windows.building.${id}Config=!1,Al(e,k.${id}Config),e.session.windows.options.open))`),
			token: "~",
		});

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:blockDefaultMenus", {
			type: "replace",
			from: `e.session.windows.building.filterConfig=!1;`,
			to: "~Al(e,k.FilterConfig);" + blocksWithConfig.map((id) => `e.session.windows.building.${id}Config=!1;Al(e,k.${id}Config);`),
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
							height: data.extra.height || 600,
							width: data.extra.width || 300,
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
						globalThis["block__BLOCKID__ConfigUI"] ? globalThis["block__BLOCKID__ConfigUI"](data) : undefined
					)
				)
			);
		};

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:blockSetupReact", {
			type: "replace",
			from: `(0,bm.jsx)(HS,{state:e.state})`,
			to: "~" + blocksWithConfig.map((id) => `,(0,bm.jsx)(globalThis["corelib:blockConfigCallback${id}"]=${configUIFunction.toString().replaceAll("__BLOCKID__", id)}, {})`),
			token: "~",
		});

		// get ticking blocks
		let reduceTicking = (f) => {
			return Object.values(this.blockRegistry.definitions)
			.filter((t) => t.interval > 0)
			.reduce((acc, t) => acc + f(t.id), "");
		}
		
		fluxloaderAPI.setPatch("js/bundle.js", "corelib:tickingDeleteCache", {
			type: "replace",
			from: "n.store.gloom.emitterPositions.filter((function(e){return!(e.x===r.x&&e.y===r.y)})))",
			to: `~${reduceTicking((id) => `,(r.type===d[${id}])&&(n.store.corelibCache[${id}]=n.store.corelibCache[${id}].filter(function(e){return !(e.x===r.x&&e.y===r.y)}))`)}`,
			token: "~"
		});
		
		fluxloaderAPI.setPatch("js/bundle.js", "corelib:tickingAddCache", {
			type: "replace",
			from: "h.type===d.GloomEmitter&&t.store.gloom.emitterPositions.push({x:h.x,y:h.y})",
			to: `~${reduceTicking((id) => `,h.type===d[${id}]&&t.store.corelibCache[${id}].push({x:h.x,y:h.y})`)}`,
			token: "~"
		});
	}
}

globalThis.BlocksModule = BlocksModule;
