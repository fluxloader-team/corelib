/*
class TechDefinition {
	constructor({ id, name, description, cost, unlocks, parent }) {
		// All variables are required other than cost
		this.id = id;
		this.idNumber = -1;
		this.name = name ?? id;
		this.cost = cost;
		this.description = description ?? name;
		this.unlocks = unlocks ?? {};
		this.parent = parent ?? "Refining1";
	}
}

class TechModule {
	techDefinitions = [];
	newTechnologyArray = [];
	baseTechIds = [];

	setupTech() {
		// Hardcoded from the base game. In the future this should be changed to read from the fluxloaderAPI
		const baseTechsString = `[{id:w.Refining1,name:"Refining 1",description:"Unlocks Shakers that can separate Gold and Slag from Wet Sand. Build diagonally and drop Wet Sand on it.",cost:20,unlocks:{structures:[d.ShakerRight]},children:[{id:w.Logistics1,name:"Logistics 1",description:"Unlocks Conveyor Belts and Launchers.",cost:50,unlocks:{structures:[d.ConveyorRight,d.LauncherUp]},children:[{id:w.Guns1,name:"Guns 1",description:"Unlocks Gun. Damage type: ⛏️",cost:500,unlocks:{items:[l.Gun]},children:[{id:w.Filters1,name:"Filters 1",description:"Unlocks Filters that work like conveyor belts but can allow certain elements to pass through.",cost:100,unlocks:{structures:[d.FilterRight]},children:[{id:w.Pipes1,name:"Pipes 1",description:"Unlocks Pipes, Pumps and Liquid Vents.",cost:2e3,unlocks:{structures:[d.Pipe,d.Pump,d.LiquidVent],items:[l.PipeRemover]},children:[{id:w.Filters2,name:"Filters 2",cost:1e3,unavailable:!0}]}]},{id:w.Refining2,name:"Refining 2",description:"Unlocks Kinetic Slag Press to further process Burnt Slag into more Gold.",cost:1e3,unlocks:{structures:[d.VelocitySoaker]},children:[{id:w.Guns2,name:"Guns 2",description:"Unlocks Rocket Launcher. Damage type: 💥",cost:3e3,unlocks:{items:[l.RocketLauncher]},children:[{id:w.Guns3,name:"Guns 3",cost:1e4,unavailable:!0}]},{id:w.Refining3,name:"Refining 3",description:"Unlocks Planter Boxes.",cost:2e3,unlocks:{structures:[d.Grower]},children:[{id:w.Refining4,name:"Refining 4",description:"Unlocks Flux Emanator to create Fluxite from Voidbloom.",cost:4e3,unlocks:{structures:[d.GloomEmitter]},children:[{id:w.Refining5,name:"Refining 5",cost:7e3,unavailable:!0}]}]}]},{id:w.Tools1,name:"Tools 1",description:"Unlocks Flamethrower to burn Slag, melt Ice and vaporize Water into Steam that rises and becomes rain.",cost:250,unlocks:{items:[l.Flamethrower]},children:[{id:w.Tools2,name:"Tools 2",description:"Unlocks Vacuum to move piles of sand.",cost:500,unlocks:{items:[l.Vacuum]},children:[{id:w.Tools3,name:"Tools 3",description:"Unlocks Cryoblaster to freeze water and solidify lava.",cost:1500,unlocks:{items:[l.Cryoblaster]},children:[{id:w.Tools4,name:"Tools 4",description:"Unlocks Grappling Hook to move around.",cost:3500,unlocks:{items:[l.GrapplingHook]}}]}]},{id:w.Lights1,name:"Lights 1",description:"Unlocks wall-mounted Lights.",cost:750,unlocks:{structures:[d.Light]},children:[{id:w.Drones1,name:"Drones 1",description:"Unlocks drones: Digger and Hauler.",cost:3e3,unlocks:{items:[l.Bouncer,l.Hauler]},children:[{id:w.Drones2,name:"Drones 2",cost:5e3,unavailable:!0}]}]}]}]}]}]}]`;

		// TODO: Reword this comment
		// we do some hacky stuff to make the ids and unlocks parsable as a string, and then do some more hacky stuff when parsing into the bundle
		baseTechsString = baseTechsString.replace(new RegExp(`w\\.([a-zA-Z0-9]+)`, "g"), `"$1"`);
		baseTechsString = baseTechsString.replace(new RegExp(`d\\.([a-zA-Z0-9]+)`, "g"), `"d.$1"`);
		baseTechsString = baseTechsString.replace(new RegExp(`l\\.([a-zA-Z0-9]+)`, "g"), `"l.$1"`);
		const baseTechs = eval(baseTechsString);

		// Recursively register tech from the base techs
		const registerBaseTech = (tech, parent) => {
			this.baseTechIds.push(tech.id);
			this.techDefinitions.push(tech);
			for (const childTech of tech.children ?? []) {
				registerBaseTech(childTech, tech.id);
			}
			tech.children = [];
			tech.parent = parent;
		};
		for (const tech of baseTechs) {
			registerBaseTech(tech);
		}
	}

	register(tech) {
		log("info", "corelib", `Adding Tech "${tech.id}"`);

		// Ensure tech IDs are unique
		for (const existingTech of this.techDefinitions) {
			if (existingTech.id === tech.id) {
				log("error", "corelib", `Tech with id "${tech.id}" was already registered!`);
				return;
			}
		}

		// parse techs so they can be made to strings
		let structures = tech.unlocks?.structures ?? [];
		if (structures) {
			structures = structures.map((structure) => `d.${structure}`);
		}

		// TODO: place
		// let items = tech.unlocks?.items ?? [];
		// if (items) {
		// 	items = items.map((item) => `l.${item}`);
		// }

		this.techDefinitions.push(tech);
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
					log("error", "corelib", `Technology "${tech.id}" tried to have a non existent parent "${tech.parent}"`);
				}
			}
		}

		for (const tech of this.techDefinitions) {
			log("info", "corelib", `Adding Technology "${tech.id}" with id ${tech.idNumber}`);
			if (!this.baseTechIds.includes(tech)) techIdString += `,B[B.${tech.id}=${tech.idNumber}]="${tech.id}"`;
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
			type: "replace",
			from: 'B[B.Guns3=28]="Guns3"',
			to: `~${techIdString}`,
			token: `~`,
		});
		// Add technologies
		fluxloaderAPI.setPatch("js/bundle.js", "corelib:techDefinitions", {
			type: "regex",
			pattern: /\$f=function\(\).*?\},Y/,
			replace: `$f=function(){return${techDefinitionString}},Y`,
		});
	}
}

class ItemDefinition {
	constructor({ id, type, name, description }) {
		this.id = id;
		this.idNumber = -1;
		this.type = type ?? "tool"; // Supports: "weapon" and "tool". In the future maybe support: "consumable"
		this.name = name ?? id;
		this.description = description ?? name;
	}
}

class ItemsModule {
	itemDefinitions = [];

	addItem(item) {
		log("info", "corelib", `Adding Item "${item.id}"`);

		for (const existingItem of this.itemDefinitions) {
			if (existingItem.id === item.id) {
				log("error", "corelib", `Item with id "${block.id}" already exists!`);
				return;
			}
		}

		let itemTypes = ["Tool", "Weapon", "Consumable"];
		if (!itemTypes.includes(item.type)) {
			log("error", "corelib", `Item type "${item.type}" is not recongized. Supported types are: "${itemTypes.join(`", "`)}"`);
			return;
		} else if (item.type === "Consumable") {
			log("warn", "corelib", `Item type "${item.type}" is not fully supported yet, you should use "Tool" or "Weapon" instead.`);
		}

		this.itemDefinitions.push(item);
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
			token: "~",
		});

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:itemDefinitions", {
			type: "replace",
			from: "Df[l.Cryoblaster]=wf,",
			to: `~${itemDefinitionString}`,
			token: "~",
		});
	}
}
*/

class BlocksModule {
	blockDefinitions = [];
	blockIDNumber = 99;

	register({ sourceMod, id, name, description, shape, angles, imagePath }) {
		for (const existingBlock of this.blockDefinitions) {
			if (existingBlock.id === id) {
				log("error", "corelib", `Block with id "${id}" already exists!`);
				return;
			}
		}

		const idNumber = this.blockIDNumber++;
		 
		let fullImagePath;
		if (imagePath) fullImagePath = path.join(fluxloaderAPI.getModsPath(), sourceMod, imagePath + ".png").replace(/\\/g, "/");
		else fullImagePath = path.join(fluxloaderAPI.getModsPath(), "corelib", "noimage.png").replace(/\\/g, "/");

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

class CoreLib {
	blocks = null;

	constructor() {
		this.blocks = new BlocksModule();
	}

	async applyPatches() {
		log("debug", "corelib", "Loading all corelib patches");
		this.applyCorePatches();
		this.blocks.applyPatches();
		log("debug", "corelib", "Finished loading patches");
	}

	applyCorePatches() {
		log("debug", "corelib", "Loading expose patches");

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:absoluteImages", {
			type: "replace",
			from: `om("img/"`,
			to: `om(e.endsWith(".png") ? e : "img/"`,
		});

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:expose", {
			type: "replace",
			from: `e.fps;function Af`,
			to: `
globalThis.corelib.exposed.function = {kf,Cf,Ef,Tf,_f,Sf,wf,bf,xf,vf,gf,
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
globalThis.corelib.exposed.variable = {Ed,nd,Xh,Wh,Hh,Gh,jh,wh,vc,oc,Yu,Xu,Wu,Gu,Mu,Au,wu,mu,hu};
globalThis.corelib.exposed.named.function = {clearCell: (x, y) => {ud(fluxloaderAPI.gameWorld.state, y ? {x, y} : {x: x.x, y: x.y})},
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
		});
	}
}

globalThis.corelib = new CoreLib();

fluxloaderAPI.events.on("fl:all-mods-loaded", () => globalThis.corelib.applyPatches());

includeVMScript("example/entry.electron.js");
