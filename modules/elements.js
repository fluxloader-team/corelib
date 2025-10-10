const recipeSchemas = {
	basic: {
		input1: {
			type: "string",
		},
		input2: {
			type: "string",
		},
		output1: {
			type: "string",
		},
		output2: {
			type: "string",
			default: "Empty",
		},
		addBothWays: {
			type: "boolean",
			default: true,
		},
	},
	press: {
		input: {
			type: "string",
		},
		requiredVelocity: {
			type: "number",
			default: 200,
		},
		outputs: {
			type: "array",
			verifier: (v) => {
				return {
					//didn't know every had a value, thanks again chatgpt
					success: v.every((item) => Array.isArray(item) && typeof item[0] === "string" && typeof item[1] === "number"),
					message: `Parameter 'outputs' must be an array of arrays with the output in the first and the chance in the second`,
				};
			},
		},
	},
	burn: {},
	shake: {},
};

class ElementsModule {
	elementRegistry = {};
	soilRegistry = {};

	elementReactions = {
		normal: {},
		press: {},
		shaker: {},
		burn: {},
	};

	otherFeatures = {
		planterAllows: [],
		shakerAllows: [],
		conveyorBeltIgnores: [],
	};

	constructor() {
		this.registerBasicRecipe("Sand", "Water", "WetSand", "WetSand");
		this.registerBasicRecipe("Spore", "Water", "WetSpore");
		this.registerBasicRecipe("Lava", "Water", "Steam", "Lava");
		this.registerBasicRecipe("Flame", "Water", "Steam", "Steam");
		this.registerBasicRecipe("Petalium", "Sandium", "Gloom", "Gloom");
		this.registerPressRecipe("BurntSlag", [
			["Spore", 1],
			["Gold", 1],
		]);
		this.registerConveyorBeltIgnores("Water");
		this.registerConveyorBeltIgnores("Steam");
		this.registerConveyorBeltIgnores("Lava");
		this.registerConveyorBeltIgnores("Fire");
	}

	registerBasicRecipe(input1, input2, output1, output2, addBothWays /* recipeSchema.basic */) {
		const schemaCheck = { input1, input2, output1, output2, addBothWays };
		data = validateInput(schemaCheck, this.recipeSchemas.basic, true).data;
		const add = (from, to) => {
			this.elementReactions.normal[from] ??= [];
			this.elementReactions.normal[from].push([to, data.output1, data.output2]);
		};
		if (data.addBothWays) add(data.input1, data.input2);
		add(data.input2, data.input1);
	}

	registerPressRecipe(input, outputs, requiredVelocity /* recipeSchema.press */) {
		const schemaCheck = { input, outputs, requiredVelocity };
		data = validateInput(schemaCheck, this.recipeSchemas.press, true).data;
		this.elementReactions.press[data.input] = [data.requiredVelocity, data.outputs];
	}

	registerConveyorBeltIgnores(id) {
		this.otherFeatures.conveyorBeltIgnores.push(id);
	}

	unregisterBasicRecipe(element1, element2, removeBothWays = true) {
		const removeBasicRecipe = (input1, input2) => {
			if (!this.elementReactions.normal[input1]) return log("error", "corelib", `Could not unregister recipe between ${element1} and ${element2}! The reaction doesn't exist.`);
			this.elementReactions.normal[input1] = this.elementReactions.normal[input1].filter(([target]) => target !== input2);
			if (this.elementReactions.normal[input1].length === 0) delete this.elementReactions.normal[input1];
		};
		if (removeBothWays) removeBasicRecipe(element1, element2);
		removeBasicRecipe(element2, element1);
	}

	unregisterPressRecipe(id) {
		if (!this.elementReactions.press[id]) return log("error", "corelib", `Press recipe with id "${id}" not found! Unable to unregister.`);
		delete this.elementReactions.press[id];
	}

	unregisterConveyorBeltIgnores(id) {
		const index = this.otherFeatures.conveyorBeltIgnores.indexOf(id);
		if (index > -1) {
			array.splice(index, 1);
		}
	}

	applyPatches() {
		//I wrote some of it then fed it into chatgpt to tell me what I did wrong
		const getBasicRecipesToPatch = (registry, objectPrefix) => {
			//Would like it on one line but prettier
			const listToReturn = Object.entries(registry).map(
				([key, values]) =>
					`${objectPrefix}[n.RJ.${key}]=[` +
					values
						.map(
							(v) =>
								`[${v
									.filter(Boolean)
									.map((x) => `n.RJ.${x}`)
									.join(",")}]`,
						)
						.join(",") +
					`]`,
			);
			return listToReturn.join(",");
		};
		const getPressRecipesToPatch = (registry, objectPrefix) => {
			const listToReturn = Object.entries(registry).map(([key, values]) => `${objectPrefix}[n.RJ.${key}]=[${values[0]},[${values[1].map(([output, chance]) => `[n.RJ.${output},${chance}]`).join(",")}]]`);
			return listToReturn.join(",");
		};
		const simpleAppend = (array, prefix) => {
			//thanks ChatGPT
			return array.reduce((previousOutputs, currentValue, index) => previousOutputs + (index ? ", " : "") + prefix + currentValue, "");
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
							e.colorHSL,
						)}},`,
					this.soilRegistry,
				),
			token: "~",
		}));

		//reactions
		fluxloaderAPI.setPatch("js/515.bundle.js", "corelib:elements:basicReactionsList", {
			type: "replace",
			from: `c=((i={})[n.RJ.Water]=[[n.RJ.Sand,n.RJ.WetSand],[n.RJ.Spore,n.RJ.WetSpore],[n.RJ.Lava,n.RJ.Steam],[n.RJ.Flame,n.RJ.Steam]],i[n.RJ.Sand]=[[n.RJ.Water,n.RJ.WetSand]],i[n.RJ.Spore]=[[n.RJ.Water,n.RJ.WetSpore]],i[n.RJ.Lava]=[[n.RJ.Water,n.RJ.Steam]],i[n.RJ.Flame]=[[n.RJ.Water,n.RJ.Steam]],i[n.RJ.Sandium]=[[n.RJ.Petalium,n.RJ.Gloom]],i[n.RJ.Petalium]=[[n.RJ.Sandium,n.RJ.Gloom]],i)`,
			to: `c=((i={}),${getBasicRecipesToPatch(this.elementReactions.normal, "i")},i)`,
		});
		fluxloaderAPI.setPatch("js/515.bundle.js", "corelib:elements:basicReactionsFunctionChange", {
			type: "replace",
			from: `[t.type,r.type].includes(n.RJ.Spore)?(0,a.Jx)(e,r.x,r.y,n.vZ.Empty):[t.type,r.type].includes(n.RJ.Lava)?(0,a.Jx)(e,r.x,r.y,(0,o.n)(n.RJ.Lava,r.x,r.y)):(0,a.Jx)(e,r.x,r.y,(0,o.n)(i[1],r.x,r.y))`,
			to: `i[2]?(0,a.Jx)(e,r.x,r.y,(0,o.n)(i[2],r.x,r.y)):(0,a.Jx)(e,r.x,r.y,n.vZ.Empty)`,
		});

		fluxloaderAPI.setPatch("js/515.bundle.js", "corelib:elements:Press", {
			type: "replace",
			from: `s=function(e,t,r){return!(r!==n.vZ.VelocitySoaker||t.type!==n.RJ.BurntSlag||t.velocity.y<200||!h(e,t.x,t.y,n.RJ.Spore)||((0,l.Nz)(e,t),h(e,t.x,t.y,n.RJ.Gold),e.environment.postMessage([n.dD.PlaySound,[{id:"coin",opts:{volume:.2,fadeOut:a.A.getRandomFloatBetween(.1,2),playbackRate:a.A.getRandomFloatBetween(.5,1.5)},modulateDistance:{x:t.x*i.A.cellSize,y:t.y*i.A.cellSize}}]]),0))}`,
			to: `pressRecipes=(function(){var press={};${getPressRecipesToPatch(
				this.elementReactions.press,
				"press",
				"press",
			)};return press;})(),s=function(e,t,r){const recipe=pressRecipes[t.type];if(r!==n.vZ.VelocitySoaker||!recipe||t.velocity.y<recipe[0]){return false;}const outputs=recipe[1];let posY = outputs.length; for(const[outputId,chance]of outputs){if(Math.random()<chance){posY--;h(e,t.x,t.y+posY,outputId);}}(0,l.Nz)(e,t);if(outputs.some(([outputId,_])=>outputId===n.RJ.Gold)){e.environment.postMessage([n.dD.PlaySound,[{id:"coin",opts:{volume:.2,fadeOut:a.A.getRandomFloatBetween(.1,2),playbackRate:a.A.getRandomFloatBetween(.5,1.5)},modulateDistance:{x:t.x*i.A.cellSize,y:t.y*i.A.cellSize}}]])}return true;}`,
		});

		fluxloaderAPI.setPatch("js/336.bundle.js", "corelib:conveyorBeltIgnores", {
			type: "replace",
			from: `d=[a.RJ.Water,a.RJ.Steam,a.RJ.Lava`,
			to: `d=[${simpleAppend(this.otherFeatures.conveyorBeltIgnores, "a.RJ.")}`,
		});
	}
}

globalThis.ElementsModule = ElementsModule;
