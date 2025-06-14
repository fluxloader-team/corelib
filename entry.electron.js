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

class TechDefinition {
	constructor({id, name, description, unlocks, parent}) {
		this.id = id;
		this.idNumber = -1;
		this.name = name ?? id;
		this.description = description ?? name;
		this.unlocks = unlocks ?? {};
		if (parent) this.parent = parent;
	}
}

//required properties for objects
//block: sourceMod, id, name, description, shape, angles, imagePath
//tech: id, name, description, unlocks, parent
//item: WIP

// do not give a technology a parent to have it top level
// (at least for now) treat base game technologies like they're custom techonologies


class CoreLib {
	blockDefinitions = [];
	techDefinitions = [];
	itemDefinitions = [];
	newTechnologyArray = [];

	constructor() {
		// do read file stuff when tom exposes it, but Im doing this for now, when making it find "$f=" for start of minified tech definitions

		// ripped from the raw bundle
		let baseTechs = `[{id:w.Refining1,name:"Refining 1",description:"Unlocks Shakers that can separate Gold and Slag from Wet Sand. Build diagonally and drop Wet Sand on it.",cost:20,unlocks:{structures:[d.ShakerRight]},children:[{id:w.Logistics1,name:"Logistics 1",description:"Unlocks Conveyor Belts and Launchers.",cost:50,unlocks:{structures:[d.ConveyorRight,d.LauncherUp]},children:[{id:w.Guns1,name:"Guns 1",description:"Unlocks Gun. Damage type: ⛏️",cost:500,unlocks:{items:[l.Gun]},children:[{id:w.Filters1,name:"Filters 1",description:"Unlocks Filters that work like conveyor belts but can allow certain elements to pass through.",cost:100,unlocks:{structures:[d.FilterRight]},children:[{id:w.Pipes1,name:"Pipes 1",description:"Unlocks Pipes, Pumps and Liquid Vents.",cost:2e3,unlocks:{structures:[d.Pipe,d.Pump,d.LiquidVent],items:[l.PipeRemover]},children:[{id:w.Filters2,name:"Filters 2",cost:1e3,unavailable:!0}]}]},{id:w.Refining2,name:"Refining 2",description:"Unlocks Kinetic Slag Press to further process Burnt Slag into more Gold.",cost:1e3,unlocks:{structures:[d.VelocitySoaker]},children:[{id:w.Guns2,name:"Guns 2",description:"Unlocks Rocket Launcher. Damage type: 💥",cost:3e3,unlocks:{items:[l.RocketLauncher]},children:[{id:w.Guns3,name:"Guns 3",cost:1e4,unavailable:!0}]},{id:w.Refining3,name:"Refining 3",description:"Unlocks Planter Boxes.",cost:2e3,unlocks:{structures:[d.Grower]},children:[{id:w.Refining4,name:"Refining 4",description:"Unlocks Flux Emanator to create Fluxite from Voidbloom.",cost:4e3,unlocks:{structures:[d.GloomEmitter]},children:[{id:w.Refining5,name:"Refining 5",cost:7e3,unavailable:!0}]}]}]},{id:w.Tools1,name:"Tools 1",description:"Unlocks Flamethrower to burn Slag, melt Ice and vaporize Water into Steam that rises and becomes rain.",cost:250,unlocks:{items:[l.Flamethrower]},children:[{id:w.Tools2,name:"Tools 2",description:"Unlocks Vacuum to move piles of sand.",cost:500,unlocks:{items:[l.Vacuum]},children:[{id:w.Tools3,name:"Tools 3",description:"Unlocks Cryoblaster to freeze water and solidify lava.",cost:1500,unlocks:{items:[l.Cryoblaster]},children:[{id:w.Tools4,name:"Tools 4",description:"Unlocks Grappling Hook to move around.",cost:3500,unlocks:{items:[l.GrapplingHook]}}]}]},{id:w.Lights1,name:"Lights 1",description:"Unlocks wall-mounted Lights.",cost:750,unlocks:{structures:[d.Light]},children:[{id:w.Drones1,name:"Drones 1",description:"Unlocks drones: Digger and Hauler.",cost:3e3,unlocks:{items:[l.Bouncer,l.Hauler]},children:[{id:w.Drones2,name:"Drones 2",cost:5e3,unavailable:!0}]}]}]}]}]}]}]`;
		
		// we do some hacky stuff to make the ids and unlocks parsable as a string, and then do some more hacky stuff when parsing into the bundle
		let techEnumerators = ['w', 'l', 'd']
		for (let enumerator of techEnumerators) {
			let regex = new RegExp(`${enumerator}\\.([a-zA-Z0-9]+)`, "g");
			baseTechs = baseTechs.replace(regex, `"${enumerator}.$1"`);
		}

		function registerBaseTech(tech, parent) {
			this.techDefinitions.push(tech);
			for (const childTech of tech.children ?? []) {
				registerBaseTech(childTech, tech);
			}
			tech.children = [];
			if (parent) {
				tech.parent = parent;
			}
		}
		for (const tech of baseTechs) {
			registerBaseTech(tech);
		}
	}

	addTech(tech) {
		log("info", "corelib", `Adding Tech "${tech.id}' with parent "${tech.parent}"`)

		for (const existingTech of this.techDefinitions) {
			if (existingTech.id === tech.id) {
				log("error", "corelib", `Tech with id "${tech.id}" was already registered!`);
				return;
			}
		}

		// parse techs so they can be made to strings
		tech.id = `w.${tech.id}`;
		let structures = tech.unlocks?.structures ?? [];
			if (structures) {
				structures = structures.map(structure => `d.${structure}`);
			}
		let items = tech.unlocks?.items ?? [];
			if (items) {
				items = items.map(item => `l.${item}`);
			}

		this.techDefinitions.push(tech);
	}

	addItem(item) {
		log("info", "corelib", `Adding Item "${item.id}"`);

		for (const existingItem of this.itemDefinitions) {
			if (existingItem.id === item.id) {
				log("error", "corelib", `Item with id "${block.id}" already exists!`);
				return;
			}
		}

		this.itemDefinitions.push(item);
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
		log("info", "corelib", "Loading patches");

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
			to: `d.Foundation${inventoryString},d.Collector`
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

		let initialTechId = 38;

		for (let tech of this.techDefinitions) tech.idNumber = initialTechId++;

		let techIdString = "";

		for (const tech of this.techDefinitions) {
			techIdString += `,B[B.${tech.id}=${tech.idNumber}]="${tech.id}"`;
			tech.children ??= [];
			if (!tech.parent) {
				this.newTechnologyArray.push(tech);
			} else {
				let parent = this.techDefinitions.find((otherTech) => {
					return otherTech.id == tech.parent;
				});
				if (parent) {
					parent.children ??= [];
					parent.children.push(tech);
				} else {
					log("error", "corelib", `Technology "${tech.id}" tried to have a non existent parent "${tech.parent}"`)
				}
			}
		}

		let techDefinitionString = this.newTechnologyArray.toString();

		let techEnumerators = ['w', 'l', 'd']
		for (let enumerator of techEnumerators) {
			let regex = new RegExp(`"${enumerator}\\.([a-zA-Z0-9]+)"`, "g");
			baseTechs = baseTechs.replace(regex, `${enumerator}.$1`);
		}


		// Add technology ids
		fluxloaderAPI.setPatch("js/bundle.js", "corelib:techIds", {
			type:"replace",
			from: 'B[B.Guns3=28]="Guns3"',
			to: `B[B.Guns3=28]="Guns3"${techIdString}`
		})
		// Add technologies
		fluxloaderAPI.setPatch("js/bundle.js", "corelib:techDefinitions", {
			type: "regex",
			from: /\$f=function\(\).*?\},Y/,
			to: `$f=function(){return${techDefinitionString}},Y`,
		})
	}
}

globalThis.BlockDefinition = BlockDefinition;
globalThis.techDefinition = techDefinition;
globalThis.corelib = new CoreLib();

fluxloaderAPI.events.on("fl:all-mods-loaded", () => globalThis.corelib.loadPatches());
includeVMScript("js/example/entry.electron.js")