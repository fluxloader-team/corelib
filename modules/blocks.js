class BlocksModule {
	blockRegistry = new DefinitionRegistry("Block", 99);
	idMap = {};

	register({ sourceMod, id, name, description, shape, angles = [], imagePath, singleBuild = false }) {
		let fullImagePath = this._getFullImagePath(sourceMod, id, imagePath);
		this.idMap[id] = this.blockRegistry.register({ isVariant: false, sourceMod, id, name, description, shape, angles, variants: [], fullImagePath, singleBuild });
	}

	registerVariant({ parentId, suffix, shape, angles, imagePath }) {
		if (!this.idMap.hasOwnProperty(parentId)) {
			return log("error", "corelib", `Parent block id: "${parentId}" for variant "${parentId}${suffix}"not found!`);
		}

		let id = parentId + suffix;
		let parentBlock = this.blockRegistry.definitions[this.idMap[parentId]];
		let fullImagePath = this._getFullImagePath(parentBlock.sourceMod, id, imagePath);
		this.idMap[id] = this.blockRegistry.register({ isVariant: true, parentId, id, shape, angles, fullImagePath });

		parentBlock.variants.push({ id, shape, angles, fullImagePath });
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
	}
}

globalThis.BlocksModule = BlocksModule;
