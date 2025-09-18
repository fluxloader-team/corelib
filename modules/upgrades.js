class UpgradesModule {
	upgrades = {};

	constructor() {
		// Hardcoded from the base game - in the future this should be changed to read from the fluxloaderAPI
		let baseUpgradesString = `[{name:"Tools",id:"tools",items:[{name:"Grabber",id:"grabber",upgrades:[{name:"Material Scanner",id:"scanner",description:"Shows more information about materials when hovering",maxLevel:2,costs:[100]},{name:"Hydro Sponge",id:"waterGrab",description:"Pick up water (above ground only)",maxLevel:2,costs:[200],oneOff:!0}]},{name:"Jetpack",id:"jetpack",upgrades:[{name:"Thrust Amplifier",id:"speed",description:"Increases flight and movement speed",maxLevel:1,costs:[]}]},{name:"Flamethrower",id:"flamethrower",requirement:{item:l.Flamethrower},upgrades:[{name:"Extended Range",id:"range",description:"Increases the range of the flames (+25% per level)",maxLevel:3,costs:[800,1200]}]}]},{name:"Weapons",id:"weapons",items:[{name:"Shovel",id:"shovel",upgrades:[{name:"Quick Dig",id:"speed",description:"Reduces digging cooldown",maxLevel:4,costs:[500,500,500]}]},{name:"Gun",id:"gun",requirement:{item:l.Gun},upgrades:[{name:"Rapid Fire",id:"speed",description:"Increases firing rate",maxLevel:4,costs:[500,500,500]},{name:"Triple Burst",id:"bullets",description:"Increases bullets per shot (x3)",maxLevel:2,costs:[1e3],oneOff:!0}]},{name:"Rocket Launcher",id:"rocketLauncher",requirement:{item:l.RocketLauncher},upgrades:[{name:"Quick-Load System",id:"reload",description:"Reduces reload time",maxLevel:3,costs:[500,500]},{name:"Extended Magazine",id:"maxAmmo",description:"Increases max ammo",maxLevel:3,costs:[500,500]},{name:"Incendiary Warhead",id:"napalm",description:"Launches a napalm rocket that explodes into a fireball",maxLevel:2,costs:[1e3],oneOff:!0}]}]},{name:"Drones",id:"drones",requirement:{tech:w.Drones1},items:[{name:"Hauler",id:"hauler",requirement:{item:l.Hauler},upgrades:[{name:"Drone Fleet",id:"maxDrones",description:"Increases the maximum number of hauler drones (+2)",maxLevel:6,costs:[1e3,2e3,3e3,4e3,5e3]},{name:"Quantum Propulsion",id:"speed",description:"Increases drone movement speed (+25% per level)",maxLevel:4,costs:[1500,2e3,2500]}]},{name:"Digger",id:"digger",requirement:{item:l.Bouncer},upgrades:[{name:"Rapid Deployment",id:"cooldown",description:"Reduces the cooldown between launching diggers",maxLevel:4,costs:[1e3,1500,2e3]},{name:"Reinforced Hull",id:"hp",description:"Increases the number of bedrock hits before destruction",maxLevel:6,costs:[800,1200,1600,2e3,2500]}]}]}]`;

		// Convert `w.var` -> `"var"` and `l.var` -> `"var"`
		// Later when we evaluate it we update this
		baseUpgradesString = baseUpgradesString.replace(new RegExp(`w\\.([a-zA-Z0-9]+)`, "g"), `"$1"`);
		baseUpgradesString = baseUpgradesString.replace(new RegExp(`l\\.([a-zA-Z0-9]+)`, "g"), `"$1"`);

		const baseUpgrades = eval(baseUpgradesString);

		for (const tab of baseUpgrades) {
			this.registerTab(tab); // Only needs id and name
			for (const category of tab.items) {
				this.registerCategory({ tabID: tab.id, ...category });
				for (const upgrade of category.upgrades) {
					this.registerUpgrade({ tabID: tab.id, categoryID: category.id, ...upgrade });
				}
			}
		}
	}

	// Tabs on the left (e.g. Tools, Weapons, etc.)
	tabSchema = {
		id: {
			type: "string",
		},
		name: {
			type: "string",
		},
		requirement: {
			type: "object",
			default: {},
			verifier: (v) => {
				return {
					success: Object.keys(v).length === 0 || Object.keys(v).includes("tech") || Object.keys(v).includes("item") || Object.keys(v).includes("building"),
					message: "Parameter 'requirement' must have at least one key of ['tech', 'item', 'building']",
				};
			},
		},
	};
	registerTab(data) {
		log("debug", "corelib", `Adding upgrade tab "${data.id}"`); // Using unverified id..

		let res = InputHandler(data, this.tabSchema);
		if (!res.success) {
			// Makes mod fail electron entrypoint, instead of failing silently..
			throw new Error(res.message);
		}
		// Use processed data, which includes defaults
		data = res.data;

		if (Object.keys(data.requirement).length === 0) delete data.requirement;

		this.upgrades[data.id] = { ...data, items: {} };
	}

	// Sections inside the tabs (e.g. Weapons -> Shovel, Gun, etc.)
	categorySchema = {
		tabID: {
			type: "string",
		},
		id: {
			type: "string",
		},
		name: {
			type: "string",
		},
		requirement: {
			type: "object",
			default: {},
			verifier: (v) => {
				return {
					success: Object.keys(v).length === 0 || Object.keys(v).includes("tech") || Object.keys(v).includes("item") || Object.keys(v).includes("building"),
					message: "Parameter 'requirement' must have at least one key of ['tech', 'item', 'building']",
				};
			},
		},
	};
	registerCategory(data) {
		log("debug", "corelib", `Adding upgrade category "${data.id}" under tab "${data.tabID}"`); // Using unverified ids..

		let res = InputHandler(data, this.categorySchema);
		if (!res.success) {
			// Makes mod fail electron entrypoint, instead of failing silently..
			throw new Error(res.message);
		}
		// Use processed data, which includes defaults
		data = res.data;

		if (!this.upgrades.hasOwnProperty(data.tabID)) {
			log("warn", "corelib", `Tried to register upgrade "${data.id}" under non-existent tab "${data.tabID}"`);
			return;
		}

		if (Object.keys(data.requirement).length === 0) delete data.requirement;

		this.upgrades[data.tabID].items[data.id] = { ...data, upgrades: {} };
	}

	// Upgrades under specific categories (e.g. Weapons -> Gun -> Speed, Bullets )
	// - costs is an array of integers representing the cost, in fluxite, for each level of the upgrade
	// - maxLevel is an integer that must be one more than the length of costs (highest level of the upgrade)
	// - oneOff is a boolean representing if the upgrade can only be bought once (creates a checkbox in game)
	upgradeSchema = {
		tabID: {
			type: "string",
		},
		categoryID: {
			type: "string",
		},
		id: {
			type: "string",
		},
		name: {
			type: "string",
		},
		description: {
			type: "string",
		},
		requirement: {
			type: "object",
			default: {},
			verifier: (v) => {
				return {
					success: Object.keys(v).length === 0 || Object.keys(v).includes("tech") || Object.keys(v).includes("item") || Object.keys(v).includes("building"),
					message: "Parameter 'requirement' must have at least one key of ['tech', 'item', 'building']",
				};
			},
		},
		maxLevel: {
			type: "number",
			verifier: (v) => {
				return {
					success: Number.isInteger(v) && v > 0,
					message: "Parameter 'maxLevel' must be an integer > 0",
				};
			},
		},
		costs: {
			type: "object",
			verifier: (v) => {
				let valid = Array.isArray(v);
				if (valid) {
					for (const x of v) {
						valid &&= Number.isInteger(x) && x >= 0;
					}
				}
				return {
					success: valid,
					message: "Parameter 'cost' must be an array of integers >= 0",
				};
			},
		},
		oneOff: {
			type: "boolean",
			default: false,
		},
	};
	registerUpgrade(data) {
		log("debug", "corelib", `Adding upgrade "${data.id}" under category "${data.categoryID}", tab "${data.tabID}"`); // Using unverified ids..

		let res = InputHandler(data, this.upgradeSchema);
		if (!res.success) {
			// Makes mod fail electron entrypoint, instead of failing silently..
			throw new Error(res.message);
		}
		// Use processed data, which includes defaults
		data = res.data;

		if (!this.upgrades.hasOwnProperty(data.tabID)) {
			log("warn", "corelib", `Tried to register upgrade "${data.id}" under non-existent tab "${data.tabID}"`);
			return;
		}
		if (!this.upgrades[data.tabID].items.hasOwnProperty(data.categoryID)) {
			log("warn", "corelib", `Tried to register upgrade "${data.id}" under non-existent category "${data.categoryID}"`);
			return;
		}

		if (data.maxLevel !== data.costs.length + 1) {
			log("warn", "corelib", `Max level of an upgrade should be one more than the number of costs`);
			// Won't return.. just a slight warning for now ig
		}

		if (Object.keys(data.requirement).length === 0) delete data.requirement;

		this.upgrades[data.tabID].items[data.categoryID].upgrades[data.id] = data;
	}

	unregisterTab(id) {
		if (!this.upgrades.hasOwnProperty(id)) {
			log("warn", "corelib", `Tried to unregister non-existent upgrade category "${id}"`);
			return;
		}
		delete this.upgrades[id];
	}

	unregisterCategory(tabID, id) {
		if (!this.upgrades.hasOwnProperty(tabID)) {
			log("warn", "corelib", `Tried to unregister upgrade "${id}" from non-existent tab "${tabID}"`);
			return;
		}
		if (!this.upgrades[tabID].items.hasOwnProperty(id)) {
			log("warn", "corelib", `Tried to unregister non-existent upgrade category "${id}"`);
			return;
		}
		delete this.upgrades[tabID].items[id];
	}

	unregisterUpgrade(tabID, categoryID, id) {
		if (!this.upgrades.hasOwnProperty(tabID)) {
			log("warn", "corelib", `Tried to unregister upgrade "${id}" from non-existent tab "${tabID}"`);
			return;
		}
		if (!this.upgrades[tabID].items.hasOwnProperty(categoryID)) {
			log("warn", "corelib", `Tried to unregister upgrade "${id}" from non-existent category "${categoryID}"`);
			return;
		}
		delete this.upgrades[tabID].items[categoryID].upgrades[id];
	}

	applyPatches() {
		let nestedUpgradeDefinitions = [];
		// Merged into game's upgrades data to add new upgrades even in old saves
		let updates = {};
		for (let tab of Object.values(this.upgrades)) {
			let newTab = { ...tab };
			newTab.items = [];
			for (let category of Object.values(tab.items)) {
				updates[category.id] = {};
				for (const upgrade of Object.values(category.upgrades)) {
					updates[category.id][upgrade.id] = { level: 1, availableLevel: 1 };
				}
				newTab.items.push({ ...category, upgrades: Object.values(category.upgrades) });
			}
			nestedUpgradeDefinitions.push(newTab);
		}
		updates.shovel.momentum = { level: 1, availableLevel: 1 }; // Really lantto?
		// This is the inverse of what we do to the raw string in the constructor
		let upgradeDefinitionString = JSON.stringify(nestedUpgradeDefinitions);
		upgradeDefinitionString = upgradeDefinitionString.replace(new RegExp(`"tech":"([a-zA-Z0-9_]+)"`, "g"), `"tech":w.$1`);
		upgradeDefinitionString = upgradeDefinitionString.replace(new RegExp(`"item":"([a-zA-Z0-9_]+)"`, "g"), `"item":l.$1`);
		fluxloaderAPI.setPatch("js/bundle.js", "corelib:upgradeDefinitions", {
			type: "regex",
			pattern: /Wu=\[.+?\],Xu=/,
			replace: `Wu=${upgradeDefinitionString},Xu=`,
		});
		fluxloaderAPI.setPatch("js/bundle.js", "corelib:upgradeUpdating", {
			type: "replace",
			from: "return[2,s];",
			to: `const newData=${JSON.stringify(
				updates
			)};for(const category of Object.keys(newData)){if(!s.upgrades.hasOwnProperty(category))s.upgrades[category]={};for(const upgrade of Object.keys(newData[category])){if(!s.upgrades[category].hasOwnProperty(upgrade))s.upgrades[category][upgrade]=newData[category][upgrade];}};~`,
			token: "~",
		});
		fluxloaderAPI.setPatch("js/bundle.js", "corelib:upgradeTemplate", {
			type: "regex",
			pattern: "upgrades:\\{grabber:\\{.+?},hints",
			replace: `upgrades:${JSON.stringify(updates)},hints`,
		});
	}
}

globalThis.UpgradesModule = UpgradesModule;
