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
elementSchema = {
	id: {
		type: "string",
	},
	name: {
		type: "string",
	},
	interactsWithHoverText: {
		type: "array",
		default: [""],
	},
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

	addToFilterList: {
		type: "boolean",
		default: true,
	},
};

soilSchema = {
	id: {
		type: "string",
	},
	name: {
		type: "string",
	},
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
	hp: {
		type: "number",
		default: 1,
	},
	outputElement: {
		type: "string",
	},
	chanceForOutput: {
		type: "number",
		default: 1,
	},
};

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
const saveHasNewStorageType = false;
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
		const reduceElements = (string, registry) => {
			return Object.values(registry).reduce((acc, e) => acc + string(e), "");
		};
		const prependJoin = (prefix, array) => array.map((v) => prefix + v).join(", ");
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
const burningRewritten = `
burnableRecipes = {
	soils: {
		[i.vZ.Moss]: { output: false, spreadFlame: true },
		[i.vZ.Divider]: { output: false, spreadFlame: true },
		[i.vZ.GoldSoil]: { output: { elementType: i.RJ.Gold, chance: 1 }, spreadFlame: true },
		[i.vZ.Petal]: { output: { elementType: i.RJ.Petalium, chance: 1 }, spreadFlame: true },
	},
	particles: {
		[i.RJ.Slag]: {
			output: { elementType: i.RJ.BurntSlag, chance: 0.25 },
			spreadFlame: true,
		},
		[i.RJ.Basalt]: {
			output: { elementType: i.RJ.Lava, chance: 1 },
			spreadFlame: false,
		},
		[i.RJ.Water]: {
			output: { elementType: i.RJ.Steam, chance: 1 },
			spreadFlame: false,
		},
		[i.RJ.FreezingIce]: {
			output: { elementType: i.RJ.Steam, chance: 1 },
			spreadFlame: false,
		},
	},
},
	hasVaporizedWater = !1,
	g = function (e, xPos, yPos, a) {
		if (!(xPos < 0 || yPos < 0 || xPos >= e.store.world.size.width || yPos >= e.store.world.size.height)) {
			var cellAtPos = (0, c.tT)(e.store, xPos, yPos);
			if ((0, c.Ol)(cellAtPos)){ return ((d = (0, s.n)(i.RJ.Fire, xPos, yPos)).duration.left = d.duration.max = d.duration.left * Math.max(0.25, 1 - a / 0.64)), void (0, c.Jx)(e, xPos, yPos, d);}
			if ((0, c.W)(cellAtPos, i.vZ.Ice)){ (0, u.jE)(e, xPos, yPos);}
			else {
				if ((0, c.af)(cellAtPos, [i.RJ.Water, i.RJ.FreezingIce])) {
					var d = (0, s.n)(i.RJ.Steam, xPos, yPos);
					return (
						(0, c.Jx)(e, xPos, yPos, d),
						hasVaporizedWater || (e.environment.postMessage([i.dD.ForceCompleteObjective, "vaporize_water"]), (hasVaporizedWater = !0)),
						void e.environment.postMessage([
							i.dD.PlaySound,
							[{ id: "vaporize", opts: { volume: 0.1, fadeOut: l.A.getRandomFloatBetween(0.1, 0.5), playbackRate: l.A.getRandomFloatBetween(0.5, 1.5) }, modulateDistance: { x: d.x * o.A.cellSize, y: d.y * o.A.cellSize } }],
						])
					);
				}
				if ((0, c.af)(cellAtPos, i.RJ.Slag)) return ((d = (0, s.n)(i.RJ.Flame, xPos, yPos)).data = p[i.RJ.Slag]()), (d.duration.left = d.duration.max = d.duration.left - a), void (0, c.Jx)(e, xPos, yPos, d);
				x(e, xPos, yPos, cellAtPos) || ((0, c.af)(cellAtPos, i.RJ.Basalt) && (0, c.Jx)(e, xPos, yPos, (0, s.n)(i.RJ.Lava, xPos, yPos)));
			}
		}
	},
	y = function (e, t) {
		var r;
		if (![i.RJ.Flame, i.RJ.Lava].includes(t.type)) return !1;
		if (
			(t.type === i.RJ.Flame &&
				((0, v.$T)(e, t.x * o.A.cellSize, t.y * o.A.cellSize, v.c6.Fire), e.environment.postMessage([i.dD.AddLight, t.x * o.A.cellSize, t.y * o.A.cellSize, { brightness: 1, duration: 100, useLightZones: !0 }])),
			[
				{ x: 1, y: 0 },
				{ x: -1, y: 0 },
				{ x: 0, y: 1 },
				{ x: 0, y: -1 },
			].forEach(function (r) {
				var a = r.x,
					n = r.y,
					o = { cX: t.x + a, cY: t.y + n },
					s = o.cX,
					d = o.cY;
				if (!(s < 0 || d < 0 || s >= e.store.world.size.width || d >= e.store.world.size.height)) {
					var u = e.environment,
						c = l.A.getThreadIndexFromCellX(s, u.threadMeta.threadCount);
					c === u.threadMeta.startingIndex ? m(e, s, d, t) : e.environment.threadMeta.ports[c].postMessage([i.dD.Burn, s, d]);
				}
			}),
			t.type === i.RJ.Lava)
		)
			return (t.duration.left = t.duration.max * l.A.getRandomFloatBetween(0.5, 1.5)), (t.variantIndex = l.A.getRandomIntBetween(0, 3)), (0, c.Jx)(e, t.x, t.y, t), !0;
		var a = null === (r = t.data) || void 0 === r ? void 0 : r.output;
		return a
			? !1 === a.elementType || (a.chance && Math.random() >= a.chance)
				? ((0, c.Jx)(e, t.x, t.y, (0, s.n)(i.RJ.Fire, t.x, t.y)), !0)
				: ((0, c.Jx)(e, t.x, t.y, (0, s.n)(a.elementType, t.x, t.y)), !0)
			: ((0, c.Jx)(e, t.x, t.y, (0, s.n)(i.RJ.Fire, t.x, t.y)), !0);
	},
	m = function (e, t, r, a) {
		var n = (0, c.tT)(e.store, t, r);
		if ((0, c.Ol)(n)) {
			var l = (null == a ? void 0 : a.type) === i.RJ.Lava ? 0.01 : 0.25;
			if (Math.random() < l) {
				(null == a ? void 0 : a.type) === i.RJ.Lava &&
					e.environment.postMessage([
						i.dD.AddLight,
						a.x * o.A.cellSize,
						a.y * o.A.cellSize,
						{ brightness: 1, size: r * o.A.cellSize < e.store.world.horizon[Math.floor(t)] * o.A.cellSize + 10 * o.A.cellSize ? 100 : 1e3, duration: 5e3, useLightZones: !0 },
					]);
				var d = (0, s.n)(i.RJ.Fire, t, r);
				return (null == a ? void 0 : a.type) === i.RJ.Lava && (d.data.temperature = 1200), void (0, c.Jx)(e, t, r, d);
			}
		}
		if ((0, c.af)(n, i.RJ.Slag)) {
			var u = (0, s.n)(i.RJ.Flame, t, r);
			return (u.data = p[i.RJ.Slag]()), void (0, c.Jx)(e, t, r, u);
		}
		(0, h.x)(e, n, t, r), x(e, t, r, n);
	},
	x = function (e, xPos, yPos, cellAtPos) {
		if (((cellAtPos = null != cellAtPos ? cellAtPos : (0, c.tT)(e.store, xPos, yPos)), (0, c.ez)(cellAtPos))) {
			const cellId = cellAtPos?.cellType ?? cellAtPos;
			if (burnableRecipes.soils.hasOwnProperty(cellId)) {
				var flameParticle = (0, s.n)(i.RJ.Flame, xPos, yPos);

				let output = burnableRecipes.soils[cellId].output
				if (output && output.chance > Math.random()) {
					output = output.elementType
				} else {
					output = false
				}

				return (flameParticle.skipPhysics = true), (flameParticle.data = { output: { elementType: output } }), (0, c.Jx)(e, xPos, yPos, flameParticle), !0;
			}
			(0, d.zT)(e, xPos, yPos, 4);
		}
		return false;
	};
`