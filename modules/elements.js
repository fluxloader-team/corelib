class ElementsModule {
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

	recipeSchemas = {
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

	registerBasicRecipe(input1, input2, output1, output2, addBothWays) {
		const schemaCheck = { input1, input2, output1, output2, addBothWays };
		let res = InputHandler(schemaCheck, this.recipeSchemas.basic);
		if (!res.success) {
			throw new Error(res.message);
		}
		let data = res.data;
		const add = (from, to) => {
			this.elementReactions.normal[from] ??= [];
			this.elementReactions.normal[from].push([to, data.output1, data.output2]);
		};
		if (data.addBothWays) add(data.input1, data.input2);
		add(data.input2, data.input1);
	}

	registerPressRecipe(input, outputs, requiredVelocity) {
		const schemaCheck = { input, requiredVelocity, outputs };
		let res = InputHandler(schemaCheck, this.recipeSchemas.press);
		if (!res.success) {
			throw new Error(res.message);
		}
		this.elementReactions.press[res.data.input] = [res.data.requiredVelocity, res.data.outputs];
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
