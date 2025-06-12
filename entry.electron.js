const logTag = "BlocksAPI";

class BlockDefinition {
	variants = [];
	constructor(sourceMod, id, name, description, shape, angles) {
		this.sourceMod = sourceMod;
		this.id = id;
		this.name = name;
		this.description = description;
		this.shape = shape;
		this.angles = angles;
		this.image = path.join(fluxloaderAPI.getModsPath(), this.sourceMod, this.id + ".png").replace(/\\/g, "/");
	}

	addVariant(_suffix, _shape, _angles) {
		let v = {
			suffix: _suffix,
			shape: _shape,
			angles: _angles,
		};
		this.variants.push(v);
	}
}

class BlocksAPI {
	constructor() {
		this.blockDefinitions = [];
		this.ids = [];
	}

	addDefinition(sourceMod, id, name, description, shape, angles) {
		log("info", logTag, `Adding Block "${id}" from "${sourceMod}"`);
		var newDef = new BlockDefinition(sourceMod, id, name, description, shape, angles);
		this.blockDefinitions.push(newDef);
	}

	async loadDefinitions() {
		log("info", logTag, `Loading Block Definitions`);

		// Generate the strings to be placed into the game
		let blockTypeString = "";
		let inventoryString = "";
		let blockShapesString = "";
		let placementString = "";
		let imageString = "";
		let loadTextureString = "";
		let drawTextureString = "";
		let i = 99;
		for (const block of this.blockDefinitions) {
			this.ids.push(i);
			log("info", logTag, `${i} >> B ${block.id} > ${block.name} > ${block.description} > ${block.shape}`);
			blockTypeString = blockTypeString + `,V[V.${block.id}=${i}]="${block.id}"`;
			inventoryString = inventoryString + `,d.${block.id}`;
			blockShapesString = blockShapesString + `,"${block.id}":[${block.shape}]`;
			placementString = placementString + `,Vh[d.${block.id}]={shape:ud["${block.id}"],variants:[{id:d.${block.id},angles:${block.angles}}],name:"${block.name}",description:"${block.description}"}`;
			imageString = imageString + `,Rf[d.${block.id}]={imageName:"${block.image}",isAbsolute:true}`;
			loadTextureString = loadTextureString + `,sm("${block.image}")`;
			drawTextureString = drawTextureString + `d.${block.id},`;
			i++;
		}

		// Remove the leading comma from the drawTextureString
		drawTextureString = drawTextureString.substring(0, drawTextureString.length - 1);

		// Create the patches used the compiled strings
		log("info", logTag, `blockTypeString: ${blockTypeString}`);
		log("info", logTag, `inventoryString: ${inventoryString}`);
		log("info", logTag, `blockShapesString: ${blockTypeString}`);
		log("info", logTag, `placementString: ${placementString}`);
		log("info", logTag, `imageString: ${imageString}`);
		log("info", logTag, `loadTextureString: ${loadTextureString}`);
		log("info", logTag, `drawTextureString: ${drawTextureString}`);
		const gamePatches = [
			{
				// Add block types
				type: "replace",
				from: `V[V.GloomEmitter=27]="GloomEmitter"`,
				to: `V[V.GloomEmitter=27]="GloomEmitter"${blockTypeString}`,
				expectedMatches: 1,
			},
			{
				// Add inventory
				type: "replace",
				from: `d.Foundation,d.Collector`,
				to: `d.Foundation${inventoryString},d.Collector`,
				expectedMatches: 1,
			},
			{
				// Add block shapes
				type: "replace",
				from: `"grower":[[12,12,12,12],[0,0,0,0],[0,0,0,0],[0,0,0,0]]`,
				to: `"grower":[[12,12,12,12],[0,0,0,0],[0,0,0,0],[0,0,0,0]]${blockShapesString}`,
				expectedMatches: 1,
			},
			{
				// Add blocks and placement
				type: "replace",
				from: `Vh[d.FoundationAngledRight]={shape:ud["foundation-triangle-right"]}`,
				to: `Vh[d.FoundationAngledRight]={shape:ud["foundation-triangle-right"]}${placementString}`,
				expectedMatches: 1,
			},
			{
				// Add images
				type: "replace",
				from: `Rf[d.Foundation]={imageName:"block"}`,
				to: `Rf[d.Foundation]={imageName:"block"}${imageString}`,
				expectedMatches: 1,
			},
			{
				// Load texture
				type: "replace",
				from: `sm("frame_block")`,
				to: `sm("frame_block")${loadTextureString}`,
				expectedMatches: 1,
			},
			{
				// Draw textures
				type: "replace",
				from: `if(n.type!==d.Collector)`,
				to: `if([${drawTextureString}].includes(n.type)){f=zf[n.type];l=t.session.rendering.images[f.imageName],(u=e.snapGridCellSize * e.cellSize),(c=Nf(t,n.x*e.cellSize,n.y*e.cellSize));h.drawImage(l.image,0,0,e.snapGridCellSize,e.snapGridCellSize,c.x,c.y,u,u);}else if(n.type!==d.Collector)`,
				expectedMatches: 1,
			},
			{
				type: "replace",
				from: `om("img/"`,
				to: `om(e.endsWith(".png") ? e : "img/"`,
			},
		];

		for (const patch of gamePatches) {
			log("info", logTag, `Applying Patch: ${patch.from} >> ${patch.to}`);
			fluxloaderAPI.addPatch("js/bundle.js", patch);
		}
	}
}

globalThis.blocksAPI = new BlocksAPI();

fluxloaderAPI.events.on("fl:all-mods-loaded", () => globalThis.blocksAPI.loadDefinitions());
