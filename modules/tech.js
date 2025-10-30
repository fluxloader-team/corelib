

/**
 * @typedef {object} techUnlocks
 * @property {string[]} [structures] - array of structure ids to give
 * @property {string[]} [item] - array of item ids to give
 */

/**
 * @typedef {object} techSchema
 * @property {string} id - id of the tech
 * @property {string} name - name of the tech
 * @property {string} description - description of the tech
 * @property {techUnlocks} [unlocks={}] - what this tech unlocks
 * @property {string} [parent="Refining1"] - id of the parent tech
 * @property {number} cost - cost of the tech
 */
const techSchema = {
	id: { type: "string" },
	name: { type: "string" },
	description: { type: "string" },
	unlocks: { type: "object", default: {} }, // game accepts `structures[]` and/or `items[]`
	parent: { type: "string", default: "Refining1" },
	cost: {
		type: "number",
		verifier: (v) => {
			return {
				success: Number.isInteger(v) && v >= 0,
				message: "Parameter 'cost' must be an integer >= 0",
			};
		},
	},
};

class TechModule {
	/**@private*/
	registry = corelib.enums.createRegistry({
		name: "Tech",
		intIdStart: 38,
		bundleMap: { main: "w", sim: "b", manager: "R" },
	});

	/**@private*/
	baseTechs = {};

	constructor() {
		// Hardcoded from the base game - in the future this should be changed to read from the fluxloaderAPI
		let baseTechsString = `[{id:w.Refining1,name:"Refining 1",description:"Unlocks Shakers that can separate Gold and Slag from Wet Sand. Build diagonally and drop Wet Sand on it.",cost:20,unlocks:{structures:[d.ShakerRight]},children:[{id:w.Logistics1,name:"Logistics 1",description:"Unlocks Conveyor Belts and Launchers.",cost:50,unlocks:{structures:[d.ConveyorRight,d.LauncherUp]},children:[{id:w.Guns1,name:"Guns 1",description:"Unlocks Gun. Damage type: ⛏️",cost:500,unlocks:{items:[l.Gun]},children:[{id:w.Filters1,name:"Filters 1",description:"Unlocks Filters that work like conveyor belts but can allow certain elements to pass through.",cost:100,unlocks:{structures:[d.FilterRight]},children:[{id:w.Pipes1,name:"Pipes 1",description:"Unlocks Pipes, Pumps and Liquid Vents.",cost:2e3,unlocks:{structures:[d.Pipe,d.Pump,d.LiquidVent],items:[l.PipeRemover]},children:[{id:w.Filters2,name:"Filters 2",cost:1e3,unavailable:!0}]}]},{id:w.Refining2,name:"Refining 2",description:"Unlocks Kinetic Slag Press to further process Burnt Slag into more Gold.",cost:1e3,unlocks:{structures:[d.VelocitySoaker]},children:[{id:w.Guns2,name:"Guns 2",description:"Unlocks Rocket Launcher. Damage type: 💥",cost:3e3,unlocks:{items:[l.RocketLauncher]},children:[{id:w.Guns3,name:"Guns 3",cost:1e4,unavailable:!0}]},{id:w.Refining3,name:"Refining 3",description:"Unlocks Planter Boxes.",cost:2e3,unlocks:{structures:[d.Grower]},children:[{id:w.Refining4,name:"Refining 4",description:"Unlocks Flux Emanator to create Fluxite from Voidbloom.",cost:4e3,unlocks:{structures:[d.GloomEmitter]},children:[{id:w.Refining5,name:"Refining 5",cost:7e3,unavailable:!0}]}]}]},{id:w.Tools1,name:"Tools 1",description:"Unlocks Flamethrower to burn Slag, melt Ice and vaporize Water into Steam that rises and becomes rain.",cost:250,unlocks:{items:[l.Flamethrower]},children:[{id:w.Tools2,name:"Tools 2",description:"Unlocks Vacuum to move piles of sand.",cost:500,unlocks:{items:[l.Vacuum]},children:[{id:w.Tools3,name:"Tools 3",description:"Unlocks Cryoblaster to freeze water and solidify lava.",cost:1500,unlocks:{items:[l.Cryoblaster]},children:[{id:w.Tools4,name:"Tools 4",description:"Unlocks Grappling Hook to move around.",cost:3500,unlocks:{items:[l.GrapplingHook]}}]}]},{id:w.Lights1,name:"Lights 1",description:"Unlocks wall-mounted Lights.",cost:750,unlocks:{structures:[d.Light]},children:[{id:w.Drones1,name:"Drones 1",description:"Unlocks drones: Digger and Hauler.",cost:3e3,unlocks:{items:[l.Bouncer,l.Hauler]},children:[{id:w.Drones2,name:"Drones 2",cost:5e3,unavailable:!0}]}]}]}]}]}]}]`;

		// Convert w.var -> "var", d.var -> "d.var", l.var -> "l.var"
		// Later when we evaluate it we update this back to what it was
		baseTechsString = baseTechsString.replace(new RegExp(`w\\.([a-zA-Z0-9]+)`, "g"), `"$1"`);
		baseTechsString = baseTechsString.replace(new RegExp(`d\\.([a-zA-Z0-9]+)`, "g"), `"d.$1"`);
		baseTechsString = baseTechsString.replace(new RegExp(`l\\.([a-zA-Z0-9]+)`, "g"), `"l.$1"`);

		const baseTechs = eval(baseTechsString);

		log("debug", "corelib", `Registering base tech`);

		// Recursively register tech from the base techs
		const registerBaseTech = (tech, parent) => {
			this.baseTechs[tech.id] = tech;
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

	/**
	 * Register a new tech
	 * @param {techSchema} inputData 
	 */
	register(inputData /* techSchema */) {
		const data = validateInput(inputData, techSchema);

		if (Object.keys(data.unlocks).length === 0) delete data.unlocks;

		this.registry.register(data.id, data);
	}

	/**
	 * Unregister a tech
	 * @param {string} id - The tech to unregister
	 */
	unregister(id) {
		this.registry.unregister(id);
	}

	/**@private*/
	applyPatches() {
		log("info", "corelib", "Loading technology module patches");

		let techList = Object.values(this.baseTechs).concat(Object.values(this.registry.entries));

		// Convert the big list of tech into a nested list structure
		let nestedTechDefinitions = [];
		techList.forEach((tech) => (tech.children = []));
		for (const tech of techList) {
			tech.children ??= [];
			if (!tech.parent) {
				nestedTechDefinitions.push(tech);
			} else {
				let parent = techList.find((otherTech) => {
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

		// This is the inverse of what we do to the raw string in the constructor
		let techDefinitionString = JSON.stringify(nestedTechDefinitions);
		techDefinitionString = techDefinitionString.replace(new RegExp(`"id":"([a-zA-Z0-9_]+)"`, "g"), `"id":w.$1`);
		techDefinitionString = techDefinitionString.replace(new RegExp(`"d\\.([a-zA-Z0-9_]+)"`, "g"), `d.$1`);
		techDefinitionString = techDefinitionString.replace(new RegExp(`"l\\.([a-zA-Z0-9_]+)"`, "g"), `l.$1`);

		const styleFilePath = path.join(fluxloaderAPI.getModsPath(), "corelib", "assets/tech.css");
		fluxloaderAPI.setPatch("index.html", "corelib:tech:addStyles", {
			type: "replace",
			from: "<title>Sandustry Demo</title>",
			to: `$<link rel="stylesheet" type="text/css" href="${styleFilePath}" />`,
			token: "$",
		});

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:tech:definitions", {
			type: "regex",
			pattern: /\$f=function\(\).*?\},Y/,
			replace: `$f=function(){return${techDefinitionString}},Y`,
		});

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:tech:setLineCSS", {
			type: "replace",
			from: 'i_({},t.id===w.Guns1&&t.status!==S.Unknown&&t.status!==S.Visible?{width:"545px",marginLeft:"-63px"}:{})',
			to: "i_({},t.status!==S.Unknown&&t.status!==S.Visible?corelib.hooks.getLineStyle(t):{})",
		});

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:tech:UIScrollImprovements1", {
			type: "replace",
			from: `,style:{width:t.id===w.Refining1?"608px":null}`,
			to: "",
		});
		fluxloaderAPI.setPatch("js/bundle.js", "corelib:tech:UIScrollImprovements2", {
			type: "replace",
			from: `{className:"overflow-auto pl-2 relative"},`,
			to: "",
		});
		fluxloaderAPI.setPatch("js/bundle.js", "corelib:tech:UIScrollImprovements3", {
			type: "replace",
			from: `{className:"flex-grow overflow-auto"}`,
			to: `{className:"flex-grow overflow-auto relative"}`,
		});
		fluxloaderAPI.setPatch("js/bundle.js", "corelib:tech:UIScrollImprovements4", {
			type: "replace",
			from: `{className:"flex justify-end"},`,
			to: `{className:"flex"},`,
		});
		// Make the connector coming off any node half the length
		fluxloaderAPI.setPatch("js/bundle.js", "corelib:techUI-shortenConnector", {
			type: "replace",
			from: "w-px h-8 bg-gray-400",
			to: "w-px h-4 bg-gray-400",
		});
		// Add the other half of the connector above each node
		fluxloaderAPI.setPatch("js/bundle.js", "corelib:techUI-addConnectors", {
			type: "replace",
			from: "children:l(e)",
			// Insert the connector element right before any children
			to: 'children:[(0,bm.jsx)("div",{className:"w-px h-4 bg-gray-400"})].concat(l(e))',
		});
	}
}

globalThis.TechModule = TechModule;
