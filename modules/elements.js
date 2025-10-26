const basicRecipeRegisterSchema = {
	inputTop: { type: "string" },
	inputBottom: { type: "string" },
	outputTop: { type: "string" },
	outputBottom: { type: "string", default: "Empty" },
	bothWays: { type: "boolean", default: true },
};

const basicRecipeUnregisterSchema = {
	inputTop: { type: "string" },
	inputBottom: { type: "string" },
	bothWays: { type: "boolean", default: true },
};

const pressRecipeRegisterSchema = {
	input: { type: "string" },
	requiredVelocity: { type: "number", default: 200 },
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
};

const pressRecipeUnregisterSchema = {
	input: { type: "string" },
};

class ElementsModule {
	elementRegistry = {};
	soilRegistry = {};
	recipes = { basic: {}, press: {} };
	otherFeatures = { conveyorBeltIgnores: [] };

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
		this.registerConveyorBeltIgnores("Water");
		this.registerConveyorBeltIgnores("Steam");
		this.registerConveyorBeltIgnores("Lava");
		this.registerConveyorBeltIgnores("Fire");
	}

	registerBasicRecipe(inputData /* basicRecipeRegisterSchema */) {
		const data = validateInput(inputData, basicRecipeRegisterSchema);
		const add = (from, to) => {
			this.recipes.basic[from] ??= [];
			this.recipes.basic[from].push([to, data.outputTop, data.outputBottom]);
		};
		if (data.bothWays) add(data.inputTop, data.inputBottom);
		add(data.inputBottom, data.inputTop);
	}

	unregisterBasicRecipe(inputData /* basicRecipeUnregisterSchema */) {
		const data = validateInput(inputData, basicRecipeUnregisterSchema);
		const removeBasicRecipe = (inputTop, inputBottom) => {
			if (!this.recipes.basic[inputTop]) return log("error", "corelib", `Could not unregister basic recipe with elements "${element1}" and "${element2}"!`);
			this.recipes.basic[inputTop] = this.recipes.basic[inputTop].filter(([target]) => target !== inputBottom);
			if (this.recipes.basic[inputTop].length === 0) delete this.recipes.basic[inputTop];
		};
		if (data.bothWays) removeBasicRecipe(data.element1, data.element2);
		removeBasicRecipe(data.element2, data.element1);
	}

	registerPressRecipe(inputData /* pressRecipeRegisterSchema */) {
		const data = validateInput(inputData, pressRecipeRegisterSchema);
		this.recipes.press[data.input] = [data.requiredVelocity, data.outputs];
	}

	unregisterPressRecipe(inputData /* pressRecipeUnregisterSchema */) {
		const data = validateInput(inputData, pressRecipeUnregisterSchema);
		if (!this.recipes.press[data.input]) return log("error", "corelib", `Could not unregister press recipe with id "${data.input}", not found!`);
		delete this.recipes.press[data.input];
	}

	registerConveyorBeltIgnores(id) {
		this.otherFeatures.conveyorBeltIgnores.push(id);
	}

	unregisterConveyorBeltIgnores(id) {
		const index = this.otherFeatures.conveyorBeltIgnores.indexOf(id);
		if (index == -1) return log("error", "corelib", `Could not unregister conveyorBeltIgnore with id "${id}", not found!`);
		this.otherFeatures.conveyorBeltIgnores.splice(index, 1);
	}

	applyPatches() {
		log("info", "corelib", "Loading element module patches");

		const prependJoin = (prefix, array) => array.map((v) => prefix + v).join(", ");

		fluxloaderAPI.setPatch("js/515.bundle.js", "corelib:elements:basicReactionsList", {
			type: "replace",
			from: `c=((i={})[n.RJ.Water]=[[n.RJ.Sand,n.RJ.WetSand],[n.RJ.Spore,n.RJ.WetSpore],[n.RJ.Lava,n.RJ.Steam],[n.RJ.Flame,n.RJ.Steam]],i[n.RJ.Sand]=[[n.RJ.Water,n.RJ.WetSand]],i[n.RJ.Spore]=[[n.RJ.Water,n.RJ.WetSpore]],i[n.RJ.Lava]=[[n.RJ.Water,n.RJ.Steam]],i[n.RJ.Flame]=[[n.RJ.Water,n.RJ.Steam]],i[n.RJ.Sandium]=[[n.RJ.Petalium,n.RJ.Gloom]],i[n.RJ.Petalium]=[[n.RJ.Sandium,n.RJ.Gloom]],i)`,
			to:
				`c=((i={}),` +
				Object.entries(this.recipes.basic)
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
					${Object.entries(this.recipes.press)
						.map(([input, recipe]) => `press[n.RJ.${input}]=[${recipe[0]},[${recipe[1].map(([output, chance]) => `[n.RJ.${output},${chance}]`).join(",")}]]`)
						.join(",")};
					return press;
				})(),
				s=function(e,t,r){
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

		fluxloaderAPI.setPatch("js/336.bundle.js", "corelib:conveyorBeltIgnores", {
			type: "replace",
			from: `d=[a.RJ.Water,a.RJ.Steam,a.RJ.Lava`,
			to: `d=[${prependJoin("a.RJ.", this.otherFeatures.conveyorBeltIgnores)}`,
		});
	}
}

globalThis.ElementsModule = ElementsModule;
