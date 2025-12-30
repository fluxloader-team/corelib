/** @typedef {import('../entry.electron.js')} */

/**
 * @typedef {object} BasicRecipeRegisterConfig
 * @property {string} inputTop The element on the top input
 * @property {string} inputBottom The element on the bottom input
 * @property {string} outputTop The element to output on the top
 * @property {string} [outputBottom="Empty"] The element to output on the bottom
 * @property {boolean} [bothWays=true] Whether to register the recipe both ways
 */
const basicRecipeRegisterSchema = {
	inputTop: { type: "string" },
	inputBottom: { type: "string" },
	outputTop: { type: "string" },
	outputBottom: { type: "string", default: "Empty" },
	bothWays: { type: "boolean", default: true },
};

/**
 * @typedef {object} BasicRecipeUnregisterConfig
 * @property {string} inputTop The element on the top input
 * @property {string} inputBottom The element on the bottom input
 * @property {boolean} [bothWays=true] Whether to unregister the recipe both ways
 */
const basicRecipeUnregisterSchema = {
	inputTop: { type: "string" },
	inputBottom: { type: "string" },
	bothWays: { type: "boolean", default: true },
};

/**
 * @typedef {object} PressRecipeRegisterConfig
 * @property {string} input The element to input
 * @property {number} [requiredVelocity=200] The required velocity to trigger the recipe
 * @property {Array<[string, number]>} outputs An array of arrays, each containing the output element and the chance (0-1) to produce it
 */
const pressRecipeRegisterSchema = {
	input: { type: "string" },
	requiredVelocity: { type: "number", default: 200 },
	outputs: {
		type: "array",
		verifier: (v) => {
			return {
				success: v.every((item) => Array.isArray(item) && typeof item[0] === "string" && typeof item[1] === "number"),
				message: `Parameter 'outputs' must be an array of arrays with the output in the first and the chance in the second`,
			};
		},
	},
};

/**
 * @typedef {object} PressRecipeUnregisterConfig
 * @property {string} input The input element
 */
const pressRecipeUnregisterSchema = {
	input: { type: "string" },
};

/**
 * @typedef {object} ShakerRecipeRegisterConfig
 * @property {string} input The element to input
 * @property {Array<[string, number]>} [outputAbove=[[]]] An array of arrays, each containing the output element and the chance (0-1) to produce it above the shaker
 * @property {Array<[string, number]>} [outputBelow=[[]]] An array of arrays, each containing the output element and the chance (0-1) to produce it below the shaker
 */
const shakerRecipeRegisterSchema = {
	input: { type: "string" },
	outputAbove: {
		type: "array",
		verifier: (v) => {
			return {
				success: v.every((item) => Array.isArray(item) && typeof item[0] === "string" && typeof item[1] === "number"),
				message: `Parameter 'outputAboveShaker' must be an array of arrays with the output in the first and the chance in the second`,
			};
		},
		default: [[]],
	},
	outputBelow: {
		type: "array",
		verifier: (v) => {
			return {
				success: v.every((item) => Array.isArray(item) && typeof item[0] === "string" && typeof item[1] === "number"),
				message: `Parameter 'outputBelowShaker' must be an array of arrays with the output in the first and the chance in the second`,
			};
		},
		default: [[]],
	},
};

/**
 * @typedef {object} ShakerRecipeUnregisterConfig
 * @property {string} input The input element
 */
const shakerRecipeUnregisterSchema = {
	input: { type: "string" },
};

/**
 * @typedef {object} GrowerRecipeRegisterConfig
 * @property {string} input The element to input
 * @property {string} output The element to output
 * @property {number} [chance=1] The chance (0-1) to produce the output
 */
const growerRecipeRegisterSchema = {
	input: { type: "string" },
	output: { type: "string" },
	chance: { type: "number", default: 1 },
};

/**
 * @typedef {object} GrowerRecipeUnregisterConfig
 * @property {string} input The input element
 */
const growerRecipeUnregisterSchema = {
	input: { type: "string" },
};

class ElementsModule {
	#recipes = { basic: {}, press: {}, grower: {}, shaker: {} };
	#otherFeatures = { conveyorBeltIgnores: [] };

	constructor() {
		this.registerBasicRecipe({ inputTop: "Sand", inputBottom: "Water", outputTop: "WetSand", outputBottom: "WetSand" });
		this.registerBasicRecipe({ inputTop: "Spore", inputBottom: "Water", outputTop: "WetSpore" });
		this.registerBasicRecipe({ inputTop: "Lava", inputBottom: "Water", outputTop: "Steam", outputBottom: "Lava" });
		this.registerBasicRecipe({ inputTop: "Flame", inputBottom: "Water", outputTop: "Steam", outputBottom: "Steam" });
		this.registerBasicRecipe({ inputTop: "Petalium", inputBottom: "Sandium", outputTop: "Gloom", outputBottom: "Gloom" });
		this.registerPressRecipe({
			input: "BurntSlag",
			outputs: [
				["Spore", 1],
				["Gold", 1],
			],
		});
		this.registerGrowerRecipe({ input: "WetSpore", output: "Seed" });
		this.registerShakerRecipe({ input: "WetSand", outputAbove: [["Slag", 1]], outputBelow: [["Gold", 0.25]] });
		this.registerConveyorBeltIgnores("Water");
		this.registerConveyorBeltIgnores("Steam");
		this.registerConveyorBeltIgnores("Lava");
		this.registerConveyorBeltIgnores("Fire");
	}

	getRecipe(type, inputId) {
		let recipe = this.#recipes?.[type]?.[inputId];
		if (!recipe) return log("error", "corelib", `Could not find recipe with type: ${type} and input: ${inputId}`);
		return recipe;
	}

	registerBasicRecipe(/** @type {BasicRecipeRegisterConfig} */ config) {
		const validConfig = validateInput(config, basicRecipeRegisterSchema);
		const add = (from, to) => {
			this.#recipes.basic[from] ??= [];
			this.#recipes.basic[from].push([to, validConfig.outputTop, validConfig.outputBottom]);
		};
		if (validConfig.bothWays) add(validConfig.inputTop, validConfig.inputBottom);
		add(validConfig.inputBottom, validConfig.inputTop);
	}

	unregisterBasicRecipe(/** @type {BasicRecipeUnregisterConfig} */ config) {
		const validConfig = validateInput(config, basicRecipeUnregisterSchema);
		const removeBasicRecipe = (inputTop, inputBottom) => {
			if (!this.#recipes.basic[inputTop]) return log("error", "corelib", `Could not unregister basic recipe with elements "${element1}" and "${element2}"!`);
			this.#recipes.basic[inputTop] = this.#recipes.basic[inputTop].filter(([target]) => target !== inputBottom);
			if (this.#recipes.basic[inputTop].length === 0) delete this.#recipes.basic[inputTop];
		};
		if (validConfig.bothWays) removeBasicRecipe(validConfig.element1, validConfig.element2);
		removeBasicRecipe(validConfig.element2, validConfig.element1);
	}

	registerPressRecipe(/** @type {PressRecipeRegisterConfig} */ config) {
		const validConfig = validateInput(config, pressRecipeRegisterSchema);
		this.#recipes.press[validConfig.input] = [validConfig.requiredVelocity, validConfig.outputs];
	}

	unregisterPressRecipe(/** @type {PressRecipeUnregisterConfig} */ config) {
		const validConfig = validateInput(config, pressRecipeUnregisterSchema);
		if (!this.#recipes.press[validConfig.input]) return log("error", "corelib", `Could not unregister unknown press recipe with id "${validConfig.input}"!`);
		delete this.#recipes.press[validConfig.input];
	}

	registerShakerRecipe(/** @type {ShakerRecipeRegisterConfig} */ config) {
		const validConfig = validateInput(config, shakerRecipeRegisterSchema);
		this.#recipes.shaker[validConfig.input] = [validConfig.outputAbove, validConfig.outputBelow];
	}

	unregisterShakerRecipe(/** @type {ShakerRecipeUnregisterConfig} */ config) {
		const validConfig = validateInput(config, shakerRecipeRegisterSchema);
		if (!this.#recipes.shaker[validConfig.input]) return log("error", "corelib", `Could not unregister unknown shaker recipe with id "${validConfig.input}"!`);
		delete this.#recipes.shaker[validConfig.input];
	}

	registerGrowerRecipe(/** @type {GrowerRecipeRegisterConfig} */ config) {
		const validConfig = validateInput(config, growerRecipeRegisterSchema);
		this.#recipes.grower[validConfig.input] = [validConfig.output, validConfig.chance];
	}

	unregisterGrowerRecipe(/** @type {GrowerRecipeUnregisterConfig} */ config) {
		const validConfig = validateInput(config, growerRecipeUnregisterSchema);
		if (!this.#recipes.grower[validConfig.input]) return log("error", "corelib", `Could not unregister unknown grower recipe with id "${validConfig.input}"!`);
		delete this.#recipes.grower[validConfig.input];
	}

	registerShakerRecipe(/** @type {ShakerRecipeRegisterConfig} */ config) {
		const validConfig = validateInput(config, shakerRecipeRegisterSchema);
		this.#recipes.shaker[validConfig.input] = [validConfig.outputAbove, validConfig.outputBelow];
	}

	unregisterShakerRecipe(/** @type {ShakerRecipeUnregisterConfig} */ config) {
		const validConfig = validateInput(config, shakerRecipeUnregisterSchema);
		if (!this.#recipes.shaker[validConfig.input]) return log("error", "corelib", `Could not unregister unknown shaker recipe with id "${validConfig.input}"!`);
		delete this.#recipes.shaker[validConfig.input];
	}

	registerConveyorBeltIgnores(/** @type {string} */ id) {
		this.#otherFeatures.conveyorBeltIgnores.push(id);
	}

	unregisterConveyorBeltIgnores(/** @type {string} */ id) {
		const index = this.#otherFeatures.conveyorBeltIgnores.indexOf(id);
		if (index == -1) return log("error", "corelib", `Could not unregister unknown conveyorBeltIgnore with id "${id}"!`);
		this.#otherFeatures.conveyorBeltIgnores.splice(index, 1);
	}

	applyPatches() {
		log("info", "corelib", "Loading element module patches");

		const prependJoin = (prefix, array) => array.map((v) => prefix + v).join(", ");

		fluxloaderAPI.setPatch("js/515.bundle.js", "corelib:elements:basicReactionsList", {
			type: "replace",
			from: `c=((i={})[n.RJ.Water]=[[n.RJ.Sand,n.RJ.WetSand],[n.RJ.Spore,n.RJ.WetSpore],[n.RJ.Lava,n.RJ.Steam],[n.RJ.Flame,n.RJ.Steam]],i[n.RJ.Sand]=[[n.RJ.Water,n.RJ.WetSand]],i[n.RJ.Spore]=[[n.RJ.Water,n.RJ.WetSpore]],i[n.RJ.Lava]=[[n.RJ.Water,n.RJ.Steam]],i[n.RJ.Flame]=[[n.RJ.Water,n.RJ.Steam]],i[n.RJ.Sandium]=[[n.RJ.Petalium,n.RJ.Gloom]],i[n.RJ.Petalium]=[[n.RJ.Sandium,n.RJ.Gloom]],i)`,
			to:
				`c=((i={}),` +
				Object.entries(this.#recipes.basic)
					.map(([inputTop, recipe]) => `i[n.RJ.${inputTop}]=[` + recipe.map((v) => `[${prependJoin("n.RJ.", v)}]`).join(",") + `]`)
					.join(",") +
				`,i)`,
		});

		// Remove hardcoded top / bottom seperation and add in custom logic using our recipes
		fluxloaderAPI.setPatch("js/515.bundle.js", "corelib:elements:basicReactionsFunctionChange", {
			type: "replace",
			from: `[t.type,r.type].includes(n.RJ.Spore)?(0,a.Jx)(e,r.x,r.y,n.vZ.Empty)` + `:[t.type,r.type].includes(n.RJ.Lava)?(0,a.Jx)(e,r.x,r.y,(0,o.n)(n.RJ.Lava,r.x,r.y))` + `:(0,a.Jx)(e,r.x,r.y,(0,o.n)(i[1],r.x,r.y))`,
			to: `i[2]?(0,a.Jx)(e,r.x,r.y,(0,o.n)(i[2],r.x,r.y))
					 :(0,a.Jx)(e,r.x,r.y,n.vZ.Empty)`,
		});

		// Overwrite the very hardcoded existing code to use our recipes instead
		fluxloaderAPI.setPatch("js/515.bundle.js", "corelib:elements:Press", {
			type: "replace",
			from: `s=function(e,t,r){return!(r!==n.vZ.VelocitySoaker||t.type!==n.RJ.BurntSlag||t.velocity.y<200||!h(e,t.x,t.y,n.RJ.Spore)||((0,l.Nz)(e,t),h(e,t.x,t.y,n.RJ.Gold),e.environment.postMessage([n.dD.PlaySound,[{id:"coin",opts:{volume:.2,fadeOut:a.A.getRandomFloatBetween(.1,2),playbackRate:a.A.getRandomFloatBetween(.5,1.5)},modulateDistance:{x:t.x*i.A.cellSize,y:t.y*i.A.cellSize}}]]),0))}`,
			to: `pressRecipes=(function(){
					var press={};
					${Object.entries(this.#recipes.press)
						.map(([input, recipe]) => `press[n.RJ.${input}]=[${recipe[0]},[${recipe[1].map(([output, chance]) => `[n.RJ.${output},${chance}]`).join(",")}]]`)
						.join(",")};
					return press;
				})(),
				s=function(x,y,t,buildingAtPos,r,e){
					const recipe=pressRecipes[t.type];
					if(r!==n.vZ.VelocitySoaker||!recipe||t.velocity.y<recipe[0]){return false;}
					const outputs=recipe[1];
					let posY = outputs.length;
					for(const[outputId,chance] of outputs){
						if(Math.random()<chance){
							posY--;
							h(e,t.x,t.y+posY,outputId);
						}
					}(0,l.Nz)(e,t);
					if(outputs.some(([outputId,_])=>outputId===n.RJ.Gold)){
						e.environment.postMessage([n.dD.PlaySound,[{
							id:"coin",
							opts:{volume:.2,fadeOut:a.A.getRandomFloatBetween(.1,2),playbackRate:a.A.getRandomFloatBetween(.5,1.5)},modulateDistance:{x:t.x*i.A.cellSize,y:t.y*i.A.cellSize}
						}]])
					}
					return true;
				}`,
		});

		fluxloaderAPI.setPatch("js/336.bundle.js", "corelib:growerRecipes", {
			type: "replace",
			from: `c=function(e,t){if(t.type!==o.RJ.WetSpore)return!1;var r=(0,l.TR)(e,t.x,t.y+1);return!(!r||r.type!==o.ev.Grower||((0,u.Jx)(e,t.x,t.y,(0,s.n)(o.RJ.Seed,t.x,t.y)),0))`,
			to: `c=function(x,y,t,buildingAtPos,cellBelow,e){
				const growerRecipes = {${Object.entries(this.#recipes.grower)
					.map(([input, [output, chance]]) => `[o.RJ.${input}]: {output: o.RJ.${output}, chance:${chance}}`)
					.join(",")}}
				if (!growerRecipes[t?.type]) return false;
				if (!buildingAtPos || buildingAtPos.type !== o.ev.Grower) return false;
				const { output, chance } = growerRecipes[t.type];
				if (Math.random() < chance) {
					(0, u.Jx)(e, t.x, t.y, (0, s.n)(output, t.x, t.y));
				} else {
					(0, u.Nz)(e, t);
				}
				return true;`,
		});

		fluxloaderAPI.setPatch("js/336.bundle.js", "corelib:shakerRecipes", {
			type: "replace",
			from: `if(1===g&&[n.ev.ShakerLeft,n.ev.ShakerRight].includes(v)&&t.type===n.RJ.WetSand)(0,l.h)(e,t);`,
			to: `const shakerRecipes = {${Object.entries(this.#recipes.shaker)
				.map(
					([input, [outputAbove, outputBelow]]) =>
						`[n.RJ.${input}]: {outputsAbove: [${outputAbove.map(([output, chance]) => `{output: n.RJ.${output}, chance:${chance}}`).join(",")}], outputsBelow:[${outputBelow
							.map(([output, chance]) => `{output: n.RJ.${output}, chance:${chance}}`)
							.join(",")}]}`,
				)
				.join(",")}
				};
				if (1 === g && [n.ev.ShakerLeft, n.ev.ShakerRight].includes(v) && shakerRecipes.hasOwnProperty(t.type)) {
					let trySpawnAroundPos = corelib.exposed.raw.r(421).trySpawnAroundPos
					let currentReaction = shakerRecipes[t.type];
					if ((0, o.lV)(e, t.x, t.y + 2)) {
						(0, o.Nz)(e, { x: t.x, y: t.y });
						for (const result of currentReaction.outputsAbove) {
							if (Math.random() < result.chance) {
								(0, o.MH)(e, t.x, t.y, (0, i.n)(result.output, t.x, t.y));
							}
						}
						for (const result of currentReaction.outputsBelow) {
							if (Math.random() < result.chance) {
								if (!(0,trySpawnAroundPos)(e, t.x, t.y, result.output)) (0, o.MH)(e, t.x, t.y, (0, i.n)(result.output, t.x, t.y + 2));
							}
							if (result.output === n.RJ.Gold) {
								if (e.store.tutorial.active) e.environment.postMessage([n.dD.TutorialStep, n.vJ.RefineGoldWithShaker]);
								e.environment.postMessage([
									n.dD.PlaySound,
									[
										{
											id: "coin",
											opts: { volume: 0.2, fadeOut: s.A.getRandomFloatBetween(0.1, 2), playbackRate: s.A.getRandomFloatBetween(0.5, 1.5) },
											modulateDistance: { x: t.x * a.A.cellSize, y: t.y * a.A.cellSize },
										},
									],
								]);
							}
						}
					}
				}`,
		});

		fluxloaderAPI.setPatch("js/336.bundle.js", "corelib:conveyorBeltIgnores", {
			type: "replace",
			from: `d=[a.RJ.Water,a.RJ.Steam,a.RJ.Lava`,
			to: `d=[${prependJoin("a.RJ.", this.#otherFeatures.conveyorBeltIgnores)}`,
		});
		//all the following patches improve the movement of particles too colide with all recipe blocks
		//used chatgpt for this cuz i don't wanna learn regex, STUPID CHATBOTS CHANGING CODE
		//it basicly replaces all the spots where the grower and press are called with another function
		fluxloaderAPI.setPatch("js/515.bundle.js", "corelib:solidMovementTweaks", {
			type: "regex",
			pattern: "R=i\\.Both,F=\\(0,o\\.Ol\\)\\(g\\);if\\(p\\|\\|M\\|\\|\\(0,o\\.W\\)\\(g,a\\.vZ\\.Block\\)\\)([\\s\\S]*?)if\\(\\(!g\\|\\|M\\|\\|!S\\(e,t,g\\)\\)&&!\\(0,f\\.v\\)\\(e,t,g\\)\\)",
			replace: `R=i.Both,F=(0,o.Ol)(g),blockBelow=(0,corelib.utils.getStructureAtPos)(t.x,t.y+1);if((blockBelow&&(0,corelib.simulation.doBlockRecipes)(t.x,t.y,t,blockBelow,g))||p||M||(0,o.W)(g,a.vZ.Block))$1if((!g||M||!S(e,t,g))&&!(0,corelib.simulation.doBlockRecipes)(t.x,t.y,t,(0,corelib.utils.getStructureAtPos)(t.x,t.y+1),g))`,
		});
		fluxloaderAPI.setPatch("js/515.bundle.js", "corelib:slushyMovementTweaks", {
			type: "regex",
			pattern:
				"S=\\(0,o\\.OA\\)\\(g\\)([\\s\\S]*?)F=\\(0,o\\.Ol\\)\\(g\\);if\\(S\\|\\|M\\|\\|\\(0,o\\.W\\)\\(g,a\\.vZ\\.Block\\)\\)([\\s\\S]*?)if\\(\\(!g\\|\\|M\\|\\|!m\\(e,t,g\\)\\)&&!\\(\\(0,f\\.v\\)\\(e,t,g\\)\\|\\|M&&\\(0,x\\.\\$\\)\\(e,t\\)\\)\\)",
			replace: `S=(0,o.OA)(g)$1F=(0,o.Ol)(g),blockBelow=(0,corelib.utils.getStructureAtPos)(t.x,t.y+1);if((blockBelow&&(0,corelib.simulation.doBlockRecipes)(t.x,t.y,t,blockBelow,g))||S||M||(0,o.W)(g,a.vZ.Block))$2if((!g||M||!m(e,t,g))&&!(0,corelib.simulation.doBlockRecipes)(t.x,t.y,t,(0,corelib.utils.getStructureAtPos)(t.x,t.y+1),g))`,
		});
		fluxloaderAPI.setPatch("js/515.bundle.js", "corelib:wispMovementTweaks", {
			type: "regex",
			pattern: "z=\\(0,o\\.Ol\\)\\(R\\);if\\(F\\|\\|J\\|\\|\\(0,o\\.W\\)\\(R,a\\.vZ\\.Block\\)\\)([\\s\\S]*?)\\(0,f\\.v\\)\\(e,t,R\\)\\)([\\s\\S]*?)else",
			replace: `z=(0,o.Ol)(R),blockBelow=(0,corelib.utils.getStructureAtPos)(t.x,t.y+1);if((blockBelow&&(0,corelib.simulation.doBlockRecipes)(t.x,t.y,t,blockBelow,R))||F||J||(0,o.W)(R,a.vZ.Block))$1(0,corelib.simulation.doBlockRecipes)(t.x,t.y,t,(0,corelib.utils.getStructureAtPos)(t.x,t.y+1),R))if(true)`,
		});
	}
}

globalThis.ElementsModule = ElementsModule;
