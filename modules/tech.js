class TechModule {
	techRegistry = new DefinitionRegistry("Tech", 38);
	baseTechIDs = [];

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
			this.baseTechIDs.push(tech.id);
			this.techRegistry.register(tech);
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

		// The root tech must atleast be Refining1
		if (!parent) parent = "Refining1";

		this.techRegistry.register({ id, idNumber, name, description, cost, unlocks, parent });
	}

	unregister(id) {
		let numericID = this.idMap[id];
		delete this.idMap[id];
		this.techRegistry.unregister(numericID);
	}

	loadTechPatches() {
		log("debug", "corelib", "Loading technology patches");

		// Convert the big list of tech into a nested list structure
		let nestedTechDefinitions = [];
		for (const tech of Object.values(this.techRegistry.definitions)) {
			tech.children ??= [];
			if (!tech.parent) {
				nestedTechDefinitions.push(tech);
			} else {
				let parent = Object.values(this.techRegistry.definitions).find((otherTech) => {
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

		let techIDString = "";
		for (const tech of Object.values(this.techRegistry.definitions)) {
			log("debug", "corelib", `Adding Technology "${tech.id}" with id ${tech.idNumber}`);
			if (!this.baseTechIDs.includes(tech)) techIDString += `,B[B.${tech.id}=${tech.idNumber}]="${tech.id}"`;
			tech.id = `w.${tech.id}`;
			// delete tech.parent;
			delete tech.idNumber;
		}

		// This is the inverse of what we do to the raw string in the constructor
		let techDefinitionString = JSON.stringify(nestedTechDefinitions);
		techDefinitionString = techDefinitionString.replace(new RegExp(`"w\\.([a-zA-Z0-9]+)"`, "g"), `w.$1`);
		techDefinitionString = techDefinitionString.replace(new RegExp(`"d\\.([a-zA-Z0-9]+)"`, "g"), `d.$1`);
		techDefinitionString = techDefinitionString.replace(new RegExp(`"l\\.([a-zA-Z0-9]+)"`, "g"), `l.$1`);

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:techIDs", {
			type: "replace",
			from: 'B[B.Guns3=28]="Guns3"',
			to: `~${techIDString}`,
			token: `~`,
		});

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:techDefinitions", {
			type: "regex",
			pattern: /\$f=function\(\).*?\},Y/,
			replace: `$f=function(){return${techDefinitionString}},Y`,
		});
	}
}

globalThis.TechModule = TechModule;
