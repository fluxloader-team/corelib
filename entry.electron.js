class TechModule {
	techDefinitions = [];
	baseTechIds = [];
	nextTechIdNumber = 38;

	constructor() {
		// Hardcoded from the base game - in the future this should be changed to read from the fluxloaderAPI
		let baseTechsString = `[{id:w.Refining1,name:"Refining 1",description:"Unlocks Shakers that can separate Gold and Slag from Wet Sand. Build diagonally and drop Wet Sand on it.",cost:20,unlocks:{structures:[d.ShakerRight]},children:[{id:w.Logistics1,name:"Logistics 1",description:"Unlocks Conveyor Belts and Launchers.",cost:50,unlocks:{structures:[d.ConveyorRight,d.LauncherUp]},children:[{id:w.Guns1,name:"Guns 1",description:"Unlocks Gun. Damage type: ⛏️",cost:500,unlocks:{items:[l.Gun]},children:[{id:w.Filters1,name:"Filters 1",description:"Unlocks Filters that work like conveyor belts but can allow certain elements to pass through.",cost:100,unlocks:{structures:[d.FilterRight]},children:[{id:w.Pipes1,name:"Pipes 1",description:"Unlocks Pipes, Pumps and Liquid Vents.",cost:2e3,unlocks:{structures:[d.Pipe,d.Pump,d.LiquidVent],items:[l.PipeRemover]},children:[{id:w.Filters2,name:"Filters 2",cost:1e3,unavailable:!0}]}]},{id:w.Refining2,name:"Refining 2",description:"Unlocks Kinetic Slag Press to further process Burnt Slag into more Gold.",cost:1e3,unlocks:{structures:[d.VelocitySoaker]},children:[{id:w.Guns2,name:"Guns 2",description:"Unlocks Rocket Launcher. Damage type: 💥",cost:3e3,unlocks:{items:[l.RocketLauncher]},children:[{id:w.Guns3,name:"Guns 3",cost:1e4,unavailable:!0}]},{id:w.Refining3,name:"Refining 3",description:"Unlocks Planter Boxes.",cost:2e3,unlocks:{structures:[d.Grower]},children:[{id:w.Refining4,name:"Refining 4",description:"Unlocks Flux Emanator to create Fluxite from Voidbloom.",cost:4e3,unlocks:{structures:[d.GloomEmitter]},children:[{id:w.Refining5,name:"Refining 5",cost:7e3,unavailable:!0}]}]}]},{id:w.Tools1,name:"Tools 1",description:"Unlocks Flamethrower to burn Slag, melt Ice and vaporize Water into Steam that rises and becomes rain.",cost:250,unlocks:{items:[l.Flamethrower]},children:[{id:w.Tools2,name:"Tools 2",description:"Unlocks Vacuum to move piles of sand.",cost:500,unlocks:{items:[l.Vacuum]},children:[{id:w.Tools3,name:"Tools 3",description:"Unlocks Cryoblaster to freeze water and solidify lava.",cost:1500,unlocks:{items:[l.Cryoblaster]},children:[{id:w.Tools4,name:"Tools 4",description:"Unlocks Grappling Hook to move around.",cost:3500,unlocks:{items:[l.GrapplingHook]}}]}]},{id:w.Lights1,name:"Lights 1",description:"Unlocks wall-mounted Lights.",cost:750,unlocks:{structures:[d.Light]},children:[{id:w.Drones1,name:"Drones 1",description:"Unlocks drones: Digger and Hauler.",cost:3e3,unlocks:{items:[l.Bouncer,l.Hauler]},children:[{id:w.Drones2,name:"Drones 2",cost:5e3,unavailable:!0}]}]}]}]}]}]}]`;

		// Convert `b.var` -> `"var"`, `d.var` -> `"d.var"`, `l.var` -> `"l.var"`
		// Later when we evaluate it we update this
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

	register({ id, name, description, cost, unlocks, parent }) {
		log("debug", "corelib", `Adding Tech "${tech.id}"`);

		// Ensure tech ids are unique
		for (const existingTech of this.techDefinitions) {
			if (existingTech.id === tech.id) {
				log("error", "corelib", `Tech with id "${tech.id}" was already registered!`);
				return;
			}
		}

		// Assign it the next tech id
		const idNumber = this.nextTechIdNumber++;

		// The root tech must atleast be Refining1
		if (!parent) parent = "Refining1";

		this.techDefinitions.push({ id, idNumber, name, description, cost, unlocks, parent });
	}

	loadTechPatches() {
		log("debug", "corelib", "Loading technology patches");

		// Convert the big list of tech into a nested list structure
		let nestedTechDefinitions = [];
		for (const tech of this.techDefinitions) {
			tech.children ??= [];
			if (!tech.parent) {
				nestedTechDefinitions.push(tech);
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

		let techIdString = "";
		for (const tech of this.techDefinitions) {
			log("debug", "corelib", `Adding Technology "${tech.id}" with id ${tech.idNumber}`);
			if (!this.baseTechIds.includes(tech)) techIdString += `,B[B.${tech.id}=${tech.idNumber}]="${tech.id}"`;
			tech.id = `w.${tech.id}`;
			// delete tech.parent;
			delete tech.idNumber;
		}

		// This is the inverse of what we do to the raw string in the constructor
		let techDefinitionString = JSON.stringify(nestedTechDefinitions);
		techDefinitionString = techDefinitionString.replace(new RegExp(`"w\\.([a-zA-Z0-9]+)"`, "g"), `w.$1`);
		techDefinitionString = techDefinitionString.replace(new RegExp(`"d\\.([a-zA-Z0-9]+)"`, "g"), `d.$1`);
		techDefinitionString = techDefinitionString.replace(new RegExp(`"l\\.([a-zA-Z0-9]+)"`, "g"), `l.$1`);

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:techIds", {
			type: "replace",
			from: 'B[B.Guns3=28]="Guns3"',
			to: `~${techIdString}`,
			token: `~`,
		});

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:techDefinitions", {
			type: "regex",
			pattern: /\$f=function\(\).*?\},Y/,
			replace: `$f=function(){return${techDefinitionString}},Y`,
		});
	}
}

class ItemsModule {
	itemDefinitions = [];
	nextIdNumber = 25;

	register({ id, type, name, description }) {
		log("debug", "corelib", `Adding Item "${id}"`);

		// Ensure item ids are unique
		for (const existingItem of this.itemDefinitions) {
			if (existingItem.id === id) {
				log("error", "corelib", `Item with id "${id}" already exists!`);
				return;
			}
		}

		// Assign it the next item id number
		const idNumber = this.nextIdNumber++;

		// Ensure item type is valid
		let validTypes = ["Tool", "Weapon", "Consumable"];
		if (!validTypes.includes(type)) {
			log("error", "corelib", `Item type "${type}" is not recongized. Supported types are: "${validTypes.join(`", "`)}"`);
			return;
		}
		if (type === "Consumable") {
			log("warn", "corelib", `Item type "${type}" is not fully supported yet, you should use "Tool" or "Weapon" instead.`);
		}

		this.itemDefinitions.push({ id, idNumber, type, name, description });
	}

	applyPatches() {
		log("debug", "corelib", "Loading item patches");

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

class BlocksModule {
	blockDefinitions = [];
	nextIdNumber = 99;

	register({ sourceMod, id, name, description, shape, angles, imagePath }) {
		// Ensure block ids are unique
		for (const existingBlock of this.blockDefinitions) {
			if (existingBlock.id === id) {
				log("error", "corelib", `Block with id "${id}" already exists!`);
				return;
			}
		}

		// Assign it the next block id number
		const idNumber = this.nextIdNumber++;

		// Resolve image paths to each mods folder
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
		this.tech = new TechModule();
		this.items = new ItemsModule();
	}

	async applyPatches() {
		log("debug", "corelib", "Loading all corelib patches");
		this.applyCorePatches();
		this.blocks.applyPatches();
		this.tech.loadTechPatches();
		this.items.applyPatches();
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
