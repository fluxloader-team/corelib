/** @typedef {import('../entry.electron.js')} */

elementSchema = {
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

soilSchema = {
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
	outputElement: { type: "string" },
	chanceForOutput: { type: "number", default: 1 },
};

const saveHasNewStorageType = false;

function cyrb53(str, seed = 0) {
	let h1 = 0xdeadbeef ^ seed,
		h2 = 0x41c6ce57 ^ seed;
	for (let i = 0, ch; i < str.length; i++) {
		ch = str.charCodeAt(i);
		h1 = Math.imul(h1 ^ ch, 2654435761);
		h2 = Math.imul(h2 ^ ch, 1597334677);
	}
	h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
	h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
	h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
	h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

	return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

function sortRegistryIds(registry, startingId) {
	const items = Object.values(registry);
	items.sort((a, b) => a.numericHash - b.numericHash);
	items.forEach((item, index) => {
		item.numericId = index + startingId;
	});
}

class ElementsModule {
	elementRegistry = {};
	soilRegistry = {};

	registerElement(inputData) {
		const data = validateInput(inputData, elementSchema, true).data;
		data.numericHash = cyrb53(data.id);
		this.elementRegistry[data.id] = data;
	}

	registerSoil(inputData) {
		const data = validateInput(inputData, soilSchema, true).data;
		data.numericHash = cyrb53(data.id);
		this.soilRegistry[data.id] = data;
	}

	applyPatches() {
		log("info", "corelib", "Loading element module patches");
		const reduceElements = (string, registry) => {
			return Object.values(registry).reduce((acc, e) => acc + string(e), "");
		};
		sortRegistryIds(this.elementRegistry, 25);
		sortRegistryIds(this.soilRegistry, 31);

		fluxloaderAPI.setMappedPatch({ "js/bundle.js": ["Mh", "n", "h"], "js/336.bundle.js": ["a", "i.RJ", "i.es"], "js/546.bundle.js": ["r", "o.RJ", "o.es"] }, `corelib:elements:elementRegistry`, (l0, l1, l2) => ({
			type: "replace",
			from: `${l0}[${l1}.Basalt]={name:"Cinder",interactions:["🔥"],density:50,matterType:${l2}.Solid},`,
			to: `~` + reduceElements((e) => `${l0}[${l1}.${e.id}]={name:"${e.name}",interactions:${JSON.stringify(e.interactsWithHoverText)},density:${e.density},matterType:${l2}.${e.matterType}},`, this.elementRegistry),
			token: "~",
		}));
		fluxloaderAPI.setMappedPatch({ "js/bundle.js": ["$"], "js/336.bundle.js": ["e"], "js/546.bundle.js": ["e"] }, `corelib:elements:elementIdRegistry`, (l0) => ({
			type: "replace",
			from: `,${l0}[${l0}.Basalt=20]="Basalt"`,
			to: `~` + reduceElements((e) => `,${l0}[${l0}.${e.id}=${e.numericId}]="${e.id}"`, this.elementRegistry),
			token: "~",
		}));
		// Why did lantto do this, it seems useless
		fluxloaderAPI.addMappedPatch({ "js/bundle.js": ["o", "n", "k", "r"], "js/336.bundle.js": ["s", "n.RJ", "B", "e"], "js/546.bundle.js": ["s", "a.RJ", "B", "e"] }, (l0, l1, l2, l3) => ({
			type: "replace",
			from: `[0]:${l0}.type===${l1}.Basalt?(${l2}=${l3}.session.colors.scheme.element[${l1}.Basalt])`,
			to: `~` + reduceElements((e) => `[0]:${l0}.type===${l1}.${e.id}?(${l2}=${l3}.session.colors.scheme.element[${l1}.${e.id}])`, this.elementRegistry),
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
				}, this.elementRegistry),
			token: "~",
		});
		fluxloaderAPI.setPatch("js/bundle.js", `corelib:elements:particleColors`, {
			type: "replace",
			from: `e[n.Basalt]=[pu(0,100,20),pu(3,100,22),pu(7,100,24),pu(10,100,26)]`,
			to: `~` + reduceElements((e) => `,e[n.${e.id}]=${JSON.stringify(e.colors)}`, this.elementRegistry),
			token: "~",
		});

		//soils
		fluxloaderAPI.setMappedPatch({ "js/bundle.js": ["Y"], "js/336.bundle.js": ["e"], "js/546.bundle.js": ["e"] }, `corelib:elements:soils-idRegistry`, (l) => ({
			type: "replace",
			from: `${l}[${l}.Crackstone=30]="Crackstone"`,
			to: `~` + reduceElements((e) => `,${l}[${l}.${e.id}=${e.numericId}]="${e.id}"`, this.soilRegistry),
			token: "~",
		}));
		fluxloaderAPI.setPatch("js/bundle.js", `corelib:elements:soils-BreaksWithoutIt`, {
			type: "replace",
			from: `n,t.Crackstone`,
			to: `~` + reduceElements((e) => `,t.${e.id}`, this.soilRegistry),
			token: "~",
			expectedMatches: 2,
		});

		fluxloaderAPI.setMappedPatch({ "js/336.bundle.js": [], "js/546.bundle.js": [] }, `corelib:elements:soils-repeated3Times`, () => ({
			type: "regex",
			pattern: `,(\\w+).vZ.Crackstone`,
			replace: `,\$1.vZ.Crackstone` + reduceElements((e) => `,\$1.vZ.${e.id}`, this.soilRegistry),
			expectedMatches: 3,
		}));

		fluxloaderAPI.setMappedPatch({ "js/bundle.js": ["Jl", "t", "n"], "js/515.bundle.js": ["i", "n.vZ", "n.RJ"] }, `corelib:elements:soilRegistry`, (l0, l1, l2) => ({
			type: "replace",
			from: `${l0}[${l1}.Obsidian]={name:"Scoria",interactions:["⛏️","💥"],hp:40,output:{elementType:${l2}.Basalt,chance:1},colorHSL:[0,100,15]},`,
			to:
				`~` +
				reduceElements(
					(e) =>
						`${l0}[${l1}.${e.id}]={name:"${e.name}",interactions:${JSON.stringify(e.interactsWithHoverText)},hp:${e.hp},output:{elementType:${l2}.${e.outputElement},chance:${e.chanceForOutput}},colorHSL:${JSON.stringify(
							e.colorHSL
						)}},`,
					this.soilRegistry
				),
			token: "~",
		}));
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
