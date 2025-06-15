/*	NOTES

dont try to use items, I am working on them and htis is the basic setup, they will very much prolly not work but this is the base I'm building off of
tech should work
scripts will be added to blocks api after stblade merges and I get a new thing for that

*/

class BlockDefinition {
	constructor({sourceMod, id, name, description, shape, angles, imagePath}) {
		this.sourceMod = sourceMod;
		this.id = id;
		this.idNumber = -1;
		this.name = name;
		this.description = description;
		this.shape = shape;
		this.angles = angles;
		// a placeholder for the image path if they don't provide one, I know I don't need the braces but I feel like somebody could get confused if I didn't
		if (imagePath) {
			this.image = path.join(fluxloaderAPI.getModsPath(), this.sourceMod, imagePath + ".png").replace(/\\/g, "/");
		} else {
			this.image = path.join(fluxloaderAPI.getModsPath(), "corelib", "noimage.png").replace(/\\/g, "/");
		}
	}
}

class TechDefinition {
	constructor({id, name, description, cost, unlocks, parent}) {
		this.id = id;
		this.idNumber = -1;
		this.name = name ?? id;
		if (cost) this.cost = cost; // I found out cost is technically optional
		this.description = description ?? name;
		this.unlocks = unlocks ?? {};
		this.parent = parent ?? "Refining1"; // tried, you can not have a top level tech above Refining1, probably because of parenting and how it shows? Probably could if you made it by default unlocked but for now yeah just this
	}
}

class itemDefinition {
	constructor({id, type, name, description}) {
		this.id = id;
		this.idNumber = -1;
		// used types are weapon and tool, there is consumable but gotta figure out how supported that is
		this.type = type ?? "tool";
		this.name = name ?? id;
		this.description = description ?? name;
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
	baseTechIds = [];

	constructor() {
		// do read file stuff when tom exposes it, but Im doing this for now, when making it find "$f=" for start of minified tech definitions

		// ripped from the raw bundle
		let baseTechsString = `[{id:w.Refining1,name:"Refining 1",description:"Unlocks Shakers that can separate Gold and Slag from Wet Sand. Build diagonally and drop Wet Sand on it.",cost:20,unlocks:{structures:[d.ShakerRight]},children:[{id:w.Logistics1,name:"Logistics 1",description:"Unlocks Conveyor Belts and Launchers.",cost:50,unlocks:{structures:[d.ConveyorRight,d.LauncherUp]},children:[{id:w.Guns1,name:"Guns 1",description:"Unlocks Gun. Damage type: ⛏️",cost:500,unlocks:{items:[l.Gun]},children:[{id:w.Filters1,name:"Filters 1",description:"Unlocks Filters that work like conveyor belts but can allow certain elements to pass through.",cost:100,unlocks:{structures:[d.FilterRight]},children:[{id:w.Pipes1,name:"Pipes 1",description:"Unlocks Pipes, Pumps and Liquid Vents.",cost:2e3,unlocks:{structures:[d.Pipe,d.Pump,d.LiquidVent],items:[l.PipeRemover]},children:[{id:w.Filters2,name:"Filters 2",cost:1e3,unavailable:!0}]}]},{id:w.Refining2,name:"Refining 2",description:"Unlocks Kinetic Slag Press to further process Burnt Slag into more Gold.",cost:1e3,unlocks:{structures:[d.VelocitySoaker]},children:[{id:w.Guns2,name:"Guns 2",description:"Unlocks Rocket Launcher. Damage type: 💥",cost:3e3,unlocks:{items:[l.RocketLauncher]},children:[{id:w.Guns3,name:"Guns 3",cost:1e4,unavailable:!0}]},{id:w.Refining3,name:"Refining 3",description:"Unlocks Planter Boxes.",cost:2e3,unlocks:{structures:[d.Grower]},children:[{id:w.Refining4,name:"Refining 4",description:"Unlocks Flux Emanator to create Fluxite from Voidbloom.",cost:4e3,unlocks:{structures:[d.GloomEmitter]},children:[{id:w.Refining5,name:"Refining 5",cost:7e3,unavailable:!0}]}]}]},{id:w.Tools1,name:"Tools 1",description:"Unlocks Flamethrower to burn Slag, melt Ice and vaporize Water into Steam that rises and becomes rain.",cost:250,unlocks:{items:[l.Flamethrower]},children:[{id:w.Tools2,name:"Tools 2",description:"Unlocks Vacuum to move piles of sand.",cost:500,unlocks:{items:[l.Vacuum]},children:[{id:w.Tools3,name:"Tools 3",description:"Unlocks Cryoblaster to freeze water and solidify lava.",cost:1500,unlocks:{items:[l.Cryoblaster]},children:[{id:w.Tools4,name:"Tools 4",description:"Unlocks Grappling Hook to move around.",cost:3500,unlocks:{items:[l.GrapplingHook]}}]}]},{id:w.Lights1,name:"Lights 1",description:"Unlocks wall-mounted Lights.",cost:750,unlocks:{structures:[d.Light]},children:[{id:w.Drones1,name:"Drones 1",description:"Unlocks drones: Digger and Hauler.",cost:3e3,unlocks:{items:[l.Bouncer,l.Hauler]},children:[{id:w.Drones2,name:"Drones 2",cost:5e3,unavailable:!0}]}]}]}]}]}]}]`;
		
		// we do some hacky stuff to make the ids and unlocks parsable as a string, and then do some more hacky stuff when parsing into the bundle
		
		baseTechsString = baseTechsString.replace(new RegExp(`w\\.([a-zA-Z0-9]+)`, "g"), `"$1"`);
		baseTechsString = baseTechsString.replace(new RegExp(`d\\.([a-zA-Z0-9]+)`, "g"), `"d.$1"`);
		baseTechsString = baseTechsString.replace(new RegExp(`l\\.([a-zA-Z0-9]+)`, "g"), `"l.$1"`);
		const baseTechs = eval(baseTechsString);

		const registerBaseTech = (tech, parent) => {
			this.baseTechIds.push(tech.id);
			this.techDefinitions.push(tech);
			for (const childTech of tech.children ?? []) {
				registerBaseTech(childTech, tech.id);
			}
			tech.children = [];
			tech.parent = parent;
		}
		for (const tech of baseTechs) {
			registerBaseTech(tech);
		}
	}

	addTech(tech) {
		log("info", "corelib", `Adding Tech "${tech.id}"`)

		for (const existingTech of this.techDefinitions) {
			if (existingTech.id === tech.id) {
				log("error", "corelib", `Tech with id "${tech.id}" was already registered!`);
				return;
			}
		}

		// parse techs so they can be made to strings
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

		let itemTypes = ["Tool", "Weapon", "Consumable"]
		if (!itemTypes.includes(item.type)) {
			log("error", "corelib", `Item type "${item.type}" is not recongized. Supported types are: "${itemTypes.join(`", "`)}"`);
			return;
		} else if (item.type === "Consumable") {
			log("warn", "corelib", `Item type "${item.type}" is not fully supported yet, you should use "Tool" or "Weapon" instead.`);
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

		this.loadBlockPatches();
		this.loadTechPatches();
		this.loadItemPatches();
		this.loadRawAPIPatches();

		log("info", "corelib", "Finished loading patches");
	}

	loadBlockPatches() {
		log("info", "corelib", "Loading block patches");

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
	}

	loadItemPatches() {
		log("info", "corelib", "Loading item patches");
		
		let initialItemId = 25;
		
		for (let item of this.itemDefinitions) item.idNumber = initialItemId++;

		let itemIdString = "";
		let itemDefinitionString = "";

		for (const item of this.itemDefinitions) {
			itemIdString += `,H[H.${item.id}=${item.idNumber}]="${item.id}"`;
			itemDefinitionString += `DF[l.${item.id}]= function() {
				return {
					id: l.${item.id},
					itemType: a.${item.type},
					name: "${item.name}",
					description: "${item.description}",
				}
			}
			`;
		}


		fluxloaderAPI.setPatch("js/bundle.js", "corelib:itemIds", {
			type: "replace",
			from: `H[H.Cryoblaster=15]="Cryoblaster",`,
			to: `~${itemIdString}`,
			token: "~"
		})

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:itemDefinitions", {
			type: "replace",
			from: "Df[l.Cryoblaster]=wf,",
			to: `~${itemDefinitionString}`,
			token: "~"
		})
	}

	loadTechPatches() {
		log("info", "corelib", "Loading technology patches");

		let initialTechId = 38;

		for (let tech of this.techDefinitions) tech.idNumber = initialTechId++;

		let techIdString = "";

		for (const tech of this.techDefinitions) {
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

		for (const tech of this.techDefinitions) {
			log("info", "corelib", `Adding Technology "${tech.id}" with id ${tech.idNumber}`);
			if (!this.baseTechIds.includes(tech))
			techIdString += `,B[B.${tech.id}=${tech.idNumber}]="${tech.id}"`;
			tech.id = `w.${tech.id}`;
			//delete tech.parent;
			delete tech.idNumber;
		}

		let techDefinitionString = JSON.stringify(this.newTechnologyArray);

		techDefinitionString = techDefinitionString.replace(new RegExp(`"w\\.([a-zA-Z0-9]+)"`, "g"), `w.$1`);
		techDefinitionString = techDefinitionString.replace(new RegExp(`"d\\.([a-zA-Z0-9]+)"`, "g"), `d.$1`);
		techDefinitionString = techDefinitionString.replace(new RegExp(`"l\\.([a-zA-Z0-9]+)"`, "g"), `l.$1`);


		// Add technology ids
		fluxloaderAPI.setPatch("js/bundle.js", "corelib:techIds", {
			type:"replace",
			from: 'B[B.Guns3=28]="Guns3"',
			to: `~${techIdString}`,
			token: `~`,
		})
		// Add technologies
		fluxloaderAPI.setPatch("js/bundle.js", "corelib:techDefinitions", {
			type: "regex",
			pattern: /\$f=function\(\).*?\},Y/,
			replace: `$f=function(){return${techDefinitionString}},Y`,
		})
	}

	loadRawAPIPatches() {
		log("info", "corelib", "Loading raw API patches");

		// we just do multiline because the bundle can handle that and it's easier to read and type
		// if anybody wants, I can give you the file where I transcribed this so you can finish the rest of the raw api references cus I gave up after the first 100 or so
		fluxloaderAPI.setPatch("js/bundle.js", "corelib:rawAPIReferences", {
			type: "replace",
			from: `e.fps;function Af`,
			to: `
globalThis.rawAPI.function = {kf,Cf,Ef,Tf,_f,Sf,wf,bf,xf,vf,gf,
df,hf,cf,uf,lf,af,of,sf,rf,nf,tf,
ef,Jd,Qd,Zd,Kd,qd,Yd,$d,Xd,Wd,Hd,
Vd,Gd,Ud,jd,zd,Od,Bd,Ld,Nd,Fd,Dd,
Id,Rd,Pd,Md,Ad,kd,Cd,Td,_d,Sd,wd,
bd,xd,vd,yd,gd,ld,ad,od,sd,id,rd,
td,ed,Jh,Qh,Zh,Kh,qh,Yh,$h,zh,Qh,
Bh,Lh,Nh,Fh,Dh,Ih,Rh,Ah,kh,Eh,Th,
_h,bh,xh,vh,yh,gh,ch,lh,ah,ih,nh,
th,eh,Jc,Qc,qc,Yc,$c,Xc,Wc,Hc,Vc,
Gc,Uc,jc,zc,Oc,Bc,Lc,Nc,Fc,Dc,Ic,
Rc,Pc,Mc,Ac,kc,Ec,wc,bc,xc,yc,gc,
mc,pc,fc,dc,hc,cc,uc,lc,tc,ec,Ju,
Qu,Zu,Ku,$u,Hu,Vu,Uu,ju,zu,Ou,Lu,
Nu,Fu,Du,Iu,Ru,Pu,ku,Eu,Tu,_u,Su,
bu,xu,vu,yu,gu,pu,fu,du,lu,au,ou,
ru,nu,tu,eu,Ql,Zl,Kl,ql,Yl,$l,Ul,
jl,zl,Ol,Bl,Ll,Nl,Fl,Dl,Il,Rl,Pl,
Ml,Al};
globalThis.rawAPI.variable = {Ed,nd,Xh,Wh,Hh,Gh,jh,wh,vc,oc,Yu,Xu,Wu,Gu,Mu,Au,wu,mu,hu};
globalThis.rawAPI.named.function = {clearCell: (x, y) => {ud(fluxloaderAPI.gameWorld.state, y ? {x, y} : {x: x.x, y: x.y})},
setCell: (x, y, element) => {Od(fluxloaderAPI.gameWorld.state, x, y, element)},
makePixel: (x, y, element) => {return Fh(element, x, y, undefined)},
multiplyVector: (vector, mutliplier) => {return yc(vector, mutliplier)},
checkCellsEqual: (element1, element2) => {return Kd(element1, element2)},
checkClearOfDynamic: (x, y) => {tf(fluxloaderAPI.gameWorld.state, x, y)},
GetStaticCell: (x, y) => {return sf(fluxloaderAPI.gameWorld.state, x, y)},
}
fluxloaderAPI.events.tryTrigger("cl:raw-api-setup");
~`,
			token: `~`,
		})
	}
}

globalThis.BlockDefinition = BlockDefinition;
globalThis.TechDefinition = TechDefinition;
globalThis.itemDefinition = itemDefinition;
globalThis.corelib = new CoreLib();

fluxloaderAPI.events.on("fl:all-mods-loaded", () => globalThis.corelib.loadPatches());
includeVMScript("example/entry.electron.js")