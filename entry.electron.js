class BlockDefinition {
	constructor(sourceMod, id, name, description, shape, angles, imagePath) {
		this.sourceMod = sourceMod;
		this.id = id;
		this.idNumber = -1;
		this.name = name;
		this.description = description;
		this.shape = shape;
		this.angles = angles;
		this.image = path.join(fluxloaderAPI.getModsPath(), this.sourceMod, imagePath + ".png").replace(/\\/g, "/");
	}
}

class CoreLib {
	constructor() {
		this.blockDefinitions = [];
	}

	addBlock(block) {
		log("info", "corelib", `Adding Block "${block.id}" from "${block.sourceMod}"`);

		for (const existingBlock of this.blockDefinitions) {
			if (existingBlock.id === block.id) {
				log("error", "corelib", `Block with id "${block.id}" already exists!`);
				return;
			}
		}

		this.blockDefinitions.push(block);
	}

	async loadPatches() {
		log("info", "corelib", "Loading block definition patches");

		// Assign id numbers to each block
		let initialBlockID = 99;
		for (let block of this.blockDefinitions) block.idNumber = initialBlockID++;

		// Generate the strings for the patches
		let blockTypeString = "";
		let inventoryString = "";
		let blockShapesString = "";
		let placementString = "";
		let imageString = "";
		let loadTextureString = "";
		let drawTextureString = "";

		for (const block of this.blockDefinitions) {
			blockTypeString += `,V[V.${block.id}=${block.idNumber++}]="${block.id}"`;
			inventoryString += `,d.${block.id}`;
			blockShapesString += `,"${block.id}":[${block.shape}]`;
			placementString += `,Vh[d.${block.id}]={shape:ud["${block.id}"],variants:[{id:d.${block.id},angles:${block.angles}}],name:"${block.name}",description:"${block.description}"}`;
			imageString += `,Rf[d.${block.id}]={imageName:"${block.image}",isAbsolute:true}`;
			loadTextureString += `,sm("${block.image}")`;
			drawTextureString += `d.${block.id},`;
		}

		// Remove the leading comma from the drawTextureString
		drawTextureString = drawTextureString.substring(0, drawTextureString.length - 1);

		// Add the patches using the new strings
		fluxloaderAPI.setPatch("js/bundle.js", "corelib:blockTypes", {
			type: "replace",
			from: `V[V.GloomEmitter=27]="GloomEmitter"`,
			to: `~${blockTypeString}`,
			token: `~`,
		});
        
		// Add inventory
		fluxloaderAPI.setPatch("js/bundle.js", "corelib:blockInventory", {
			type: "replace",
			from: `d.Foundation,d.Collector`,
			to: `d.Foundation${inventoryString},d.Collector`,
			token: `~`,
		});
		// Add block shapes
		fluxloaderAPI.setPatch("js/bundle.js", "corelib:blockShapes", {
			type: "replace",
			from: `"grower":[[12,12,12,12],[0,0,0,0],[0,0,0,0],[0,0,0,0]]`,
			to: `~${blockShapesString}`,
			token: `~`,
		});
		// Add blocks and placement
		fluxloaderAPI.setPatch("js/bundle.js", "corelib:blockPlacements", {
			type: "replace",
			from: `Vh[d.FoundationAngledRight]={shape:ud["foundation-triangle-right"]}`,
			to: `~${placementString}`,
			token: `~`,
		});
		// Add images
		fluxloaderAPI.setPatch("js/bundle.js", "corelib:blockImages", {
			type: "replace",
			from: `Rf[d.Foundation]={imageName:"block"}`,
			to: `~${imageString}`,
			token: `~`,
		});
		// Load texture
		fluxloaderAPI.setPatch("js/bundle.js", "corelib:blockLoadTextures", {
			type: "replace",
			from: `sm("frame_block")`,
			to: `~${loadTextureString}`,
			token: `~`,
		});
		// Draw textures
		fluxloaderAPI.setPatch("js/bundle.js", "corelib:blockDrawTextures", {
			type: "replace",
			from: `if(n.type!==d.Collector)`,
			to: `if([${drawTextureString}].includes(n.type)){f=zf[n.type];l=t.session.rendering.images[f.imageName],(u=e.snapGridCellSize * e.cellSize),(c=Nf(t,n.x*e.cellSize,n.y*e.cellSize));h.drawImage(l.image,0,0,e.snapGridCellSize,e.snapGridCellSize,c.x,c.y,u,u);}else ~`,
			token: `~`,
		});
		// Make image loading use absolute path
		fluxloaderAPI.setPatch("js/bundle.js", "corelib:absoluteImages", {
			type: "replace",
			from: `om("img/"`,
			to: `om(e.endsWith(".png") ? e : "img/"`,
		});
	}
}

globalThis.BlockDefinition = BlockDefinition;
globalThis.corelib = new CoreLib();

fluxloaderAPI.events.on("fl:all-mods-loaded", () => globalThis.corelib.loadPatches());
