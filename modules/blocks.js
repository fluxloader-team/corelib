class BlocksModule {
	blockDefinitions = [];
	nextIDNumber = 99;

	register({ sourceMod, id, name, description, shape, angles, imagePath }) {
		// Ensure block ids are unique
		for (const existingBlock of this.blockDefinitions) {
			if (existingBlock.id === id) {
				log("error", "corelib", `Block with id "${id}" already exists!`);
				return;
			}
		}

		// Assign it the next block id number
		const idNumber = this.nextIDNumber++;

		// Resolve image paths to each mods folder
		let fullImagePath;
		if (imagePath) fullImagePath = path.join(fluxloaderAPI.getModsPath(), sourceMod, imagePath + ".png").replace(/\\/g, "/");
		else fullImagePath = path.join(fluxloaderAPI.getModsPath(), "corelib", "assets/noimage.png").replace(/\\/g, "/");

		this.blockDefinitions.push({ sourceMod, id, idNumber, name, description, shape, angles, fullImagePath });
	}

	applyPatches() {
		log("debug", "corelib", "Loading block patches");

		const reduceBlocks = (f) => {
			return this.blockDefinitions.reduce((acc, b) => acc + f(b), "");
		};

		fluxloaderAPI.setMappedPatch({ "js/bundle.js": ["V"], "js/336.bundle.js": ["e"], "js/546.bundle.js": ["e"] }, "corelib:blockTypes", (v1) => ({
			type: "replace",
			from: `${v1}[${v1}.GloomEmitter=27]="GloomEmitter"`,
			to: `~` + reduceBlocks((b) => `,${v1}[${v1}.${b.id}=${b.idNumber}]="${b.id}"`),
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
			to: `~` + reduceBlocks((b) => `,"${b.id}":[${b.shape}]`),
			token: `~`,
		}));

		fluxloaderAPI.setMappedPatch({ "js/bundle.js": ["Vh", "d", "ud"], "js/336.bundle.js": ["n", "l.ev", "u"], "js/546.bundle.js": ["a", "o.ev", "l"] }, "corelib:blockTypes", (v1, v2, v3) => ({
			type: "replace",
			from: `${v1}[${v2}.FoundationAngledRight]={shape:${v3}["foundation-triangle-right"]}`,
			to: `~` + reduceBlocks((b) => `,${v1}[${v2}.${b.id}]={shape:${v3}["${b.id}"],variants:[{id:${v2}.${b.id},angles:${b.angles}}],name:"${b.name}",description:"${b.description}"}`),
			token: `~`,
		}));

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:blockImages", {
			type: "replace",
			from: `Rf[d.Foundation]={imageName:"block"}`,
			to: `~` + reduceBlocks((b) => `,Rf[d.${b.id}]={imageName:"${b.fullImagePath}",isAbsolute:true}`),
			token: `~`,
		});

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:blockLoadTextures", {
			type: "replace",
			from: `sm("frame_block")`,
			to: `~` + reduceBlocks((b) => `,sm("${b.fullImagePath}")`),
			token: `~`,
		});

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:blockDrawTextures", {
			type: "replace",
			from: `if(n.type!==d.Collector)`,
			to:
				"if([" +
				reduceBlocks((b) => `d.${b.id},`) +
				"].includes(n.type)){f=zf[n.type];l=t.session.rendering.images[f.imageName],(u=e.snapGridCellSize * e.cellSize),(c=Nf(t,n.x*e.cellSize,n.y*e.cellSize));h.drawImage(l.image,0,0,e.snapGridCellSize,e.snapGridCellSize,c.x,c.y,u,u);}else ~",
			token: `~`,
		});
	}
}

globalThis.BlocksModule = BlocksModule;