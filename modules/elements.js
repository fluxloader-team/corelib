/** @typedef {import('../entry.electron.js')} */

/**
 * @typedef {object} ElementRegisterConfig
 * @property {string} id
 * @property {string} name
 * @property {[string]} interactsWithHoverText
 * @property {Array<[number, number, number, number]>} colors
 * @property {number} density
 * @property {string} matterType
 * @property {boolean} [addToFilterList=true]
 */
elementRegisterSchema = {
	id: { type: "string" },
	name: { type: "string" },
	interactsWithHoverText: { type: "array", default: [""] },
	colors: {
		type: "array",
		verifier: (v) => {
			return {
				success: v.every(Array.isArray),
				message: `Parameter 'colors' must be an array of rgba colors`,
			};
		},
	},
	density: {
		type: "number",
		verifier: (v) => {
			return {
				success: Number.isInteger(v) && v > 0,
				message: "Parameter 'density' must be an integer > 0",
			};
		},
	},
	matterType: {
		type: "string",
		default: "Solid",
		verifier: (v) => {
			return {
				success: ["Solid", "Liquid", "Particle", "Gas", "Static", "Slushy", "Wisp"].includes(v),
				message: `Parameter 'type' must be one of "Solid", "Liquid", "Particle", "Gas", "Static", "Slushy", "Wisp"`,
			};
		},
	},
	addToFilterList: { type: "boolean", default: true },
};

/**
 * @typedef {object} SoilRegisterConfig
 * @property {string} id
 * @property {string} name
 * @property {Array<[string]>} interactsWithHoverText
 * @property {[number,number,number]} colorHSL
 * @property {number} [hp=1]
 * @property {string} outputElement
 * @property {number} [chanceForOutput=1]
 * @property {boolean} [onlyRocketBreakable=false]
 */
soilRegisterSchema = {
	id: { type: "string" },
	name: { type: "string" },
	interactsWithHoverText: {
		type: "array",
		default: [""],
	},
	colorHSL: {
		type: "array",
		verifier: (v) => {
			return {
				success: v.length == 3,
				message: `Parameter 'colorHSL' must be a HSL array`,
			};
		},
	},
	hp: { type: "number", default: 1 },
	outputElement: { type: "string", default: "false" },
	chanceForOutput: { type: "number", default: 1 },
	onlyRocketBreakable: { type: "boolean", default: false },
};

const saveHasNewStorageType = false;

class ElementsModule {
	elementRegistry = corelib.enums.createRegistry({
		name: "Element",
		intIdStart: 21,
		bundleMap: {
			main: "n",
			sim: "n",
			manager: "a",
		},
	});

	soilRegistry = corelib.enums.createRegistry({
		name: "Soil",
		intIdStart: 31,
		bundleMap: {
			main: "t",
			sim: "a",
			manager: "r",
		},
	});

	registerElement(/** @type {ElementRegisterConfig} */ config) {
		const validConfig = validateInput(config, elementRegisterSchema);
		this.elementRegistry.register(validConfig.id, validConfig);
	}

	registerSoil(/** @type {SoilRegisterConfig} */ config) {
		const validConfig = validateInput(config, soilRegisterSchema);
		this.soilRegistry.register(validConfig.id, validConfig);
	}

	getElementEntries() {
		return this.elementRegistry.entries;
	}

	getSoilEntries() {
		return this.soilRegistry.entries;
	}

	applyPatches() {
		log("info", "corelib", "Loading element module patches");
		const reduceElements = (string, registry) => {
			return Object.values(registry).reduce((acc, e) => acc + string(e), "");
		};

		fluxloaderAPI.setMappedPatch({ "js/bundle.js": ["Mh", "n", "h"], "js/336.bundle.js": ["a", "i.RJ", "i.es"], "js/546.bundle.js": ["r", "o.RJ", "o.es"] }, `corelib:elements:elementRegistry`, (registry, elementIds, matterTypes) => ({
			type: "replace",
			from: `${registry}[${elementIds}.Basalt]={name:"Cinder",interactions:["🔥"],density:50,matterType:${matterTypes}.Solid},`,
			to:
				`~` +
				reduceElements(
					(e) => `${registry}[${elementIds}.${e.id}]={name:"${e.name}",interactions:${JSON.stringify(e.interactsWithHoverText)},density:${e.density},matterType:${matterTypes}.${e.matterType}},`,
					this.elementRegistry.entries,
				),
			token: "~",
		}));

		// Why did lantto do this, it seems useless
		fluxloaderAPI.addMappedPatch({ "js/bundle.js": ["o", "n", "k", "r"], "js/336.bundle.js": ["s", "n.RJ", "B", "e"], "js/546.bundle.js": ["s", "a.RJ", "B", "e"] }, (l0, elementIds, colorSmth, gameInstanceState) => ({
			type: "replace",
			from: `[0]:${l0}.type===${elementIds}.Basalt?(${colorSmth}=${gameInstanceState}.session.colors.scheme.element[${elementIds}.Basalt])`,
			to: `~` + reduceElements((e) => `[0]:${l0}.type===${elementIds}.${e.id}?(${colorSmth}=${gameInstanceState}.session.colors.scheme.element[${elementIds}.${e.id}])`, this.elementRegistry.entries),
			token: "~",
		}));

		fluxloaderAPI.setPatch("js/bundle.js", `corelib:elements:filterlist`, {
			type: "replace",
			from: `,n.Basalt`,
			to:
				"~" +
				reduceElements((e) => {
					if (!e.addToFilterList) return "";
					return `,n.${e.id}`;
				}, this.elementRegistry.entries),
			token: "~",
		});
		
		fluxloaderAPI.setPatch("js/bundle.js", `corelib:elements:particleColors`, {
			type: "replace",
			from: `e[n.Basalt]=[pu(0,100,20),pu(3,100,22),pu(7,100,24),pu(10,100,26)]`,
			to: `~` + reduceElements((e) => `,e[n.${e.id}]=${JSON.stringify(e.colors)}`, this.elementRegistry.entries),
			token: "~",
		});

		// Soils
		fluxloaderAPI.setPatch("js/bundle.js", `corelib:elements:soilsBreaksWithoutIt`, {
			type: "replace",
			from: `n,t.Crackstone`,
			to: `~` + reduceElements((e) => `,t.${e.id}`, this.soilRegistry.entries),
			token: "~",
			expectedMatches: 2,
		});

		fluxloaderAPI.setMappedPatch({ "js/336.bundle.js": [], "js/546.bundle.js": [] }, `corelib:elements:soilsRepeated3Times`, () => ({
			type: "regex",
			pattern: `,(\\w+).vZ.Crackstone`,
			replace: `,\$1.vZ.Crackstone` + reduceElements((e) => `,\$1.vZ.${e.id}`, this.soilRegistry.entries),
			expectedMatches: 3,
		}));

		fluxloaderAPI.setMappedPatch({ "js/bundle.js": ["Jl", "t", "n", "K"], "js/515.bundle.js": ["i", "n.vZ", "n.RJ", "a.A"] }, `corelib:elements:soilRegistry`, (registry, soilIds, elementIds, utilFuncts) => ({
			type: "replace",
			from: `${registry}[${soilIds}.Obsidian]={name:"Scoria",interactions:["⛏️","💥"],hp:40,output:{elementType:${elementIds}.Basalt,chance:1},colorHSL:[0,100,15]},`,
			to:
				`~` +
				reduceElements(
					(e) =>
						`${registry}[${soilIds}.${e.id}]={name:"${e.name}",interactions:${JSON.stringify(e.interactsWithHoverText)},hp:${e.hp},output:{elementType:${elementIds}.${e.outputElement},chance:${
							e.chanceForOutput
						}},colorHSL:${JSON.stringify(e.colorHSL)},background:{model:"rgb",fg:${utilFuncts}.HSLToRGBA(${e.colorHSL[0]},${e.colorHSL[1]},${e.colorHSL[2]}),bg:${utilFuncts}.HSLToRGBA(${e.colorHSL[0]},${e.colorHSL[1]},${
							e.colorHSL[2]
						})}},`,
					this.soilRegistry.entries,
				),
			token: "~",
		}));

		fluxloaderAPI.setPatch("js/336.bundle.js", `corelib:elements:onlyRocketBreakable`, {
			type: "replace",
			from: `d===n.vZ.Crackstone&&!i.fromRocketExplosion`,
			to:
				"[n.vZ.Crackstone" +
				reduceElements((e) => {
					if (!e.onlyRocketBreakable) return "";
					return `,n.vZ.${e.id}`;
				}, this.soilRegistry.entries) +
				"].includes(d)&&!i.fromRocketExplosion",
		});

		fluxloaderAPI.setPatch("js/bundle.js", `corelib:elements:noShovelHighlightForUnbreakable`, {
			type: "replace",
			from: `S!==t.Crackstone`,
			to:
				"![t.Crackstone" +
				reduceElements((e) => {
					if (!e.onlyRocketBreakable) return "";
					return `,t.${e.id}`;
				}, this.soilRegistry.entries) +
				"].includes(S)",
		});

		if (saveHasNewStorageType) {
			fluxloaderAPI.setPatch("js/bundle.js", "corelib:readNegitiveValuesInSavedata", {
				type: "replace",
				from: `e>=100?Fh(e-100,n,t)`,
				to: `e<0?Fh(-e,n,t)`,
			});
			fluxloaderAPI.setPatch("js/bundle.js", "corelib:saveNegitiveValuesInSavedata", {
				type: "replace",
				from: `e.type+100`,
				to: `-e.type`,
			});
		}
	}
}

globalThis.ElementsModule = ElementsModule;
