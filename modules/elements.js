class ElementsModule {
	elementRegistry = {};
	soilRegistry = {};
	elementReactions = {
		normal: {},
		press: {},
		shaker: {},
		burn: {},
	};
	addTheNormalRecipes = true;
	//found this online somewhere, it's a hashing function
	#cyrb53(str, seed = 0) {
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
	//chatgpt is great for simple tasks like these
	#sortRegistryIds(registry, startingId) {
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
		hoverText: {
			type: "string",
		},
		colors: {
			type: "object",
			verifier: (v) => {
				return {
					success: Array.isArray(v) && v.every(Array.isArray),
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
		hoverText: {
			type: "string",
		},
		colorHSL: {
			type: "object",
			verifier: (v) => {
				return {
					success: Array.isArray(v) && v.length == 3,
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
				default: "",
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
				type: "object",
				verifier: (v) => {
					return {
						//didn't know every had a value, thanks again chatgpt
						success: Array.isArray(v) && v.every((item) => Array.isArray(item) && typeof item[0] === "string" && typeof item[1] === "number"),
						message: `Parameter 'outputs' must be an array of arrays with the output in the first and the chance in the second`,
					};
				},
			},

		},
		burn: {

		},
		shake: {

		}
	}

	registerElement(inputs) {
		let res = InputHandler(inputs, this.elementSchema);
		if (!res.success) {
			throw new Error(res.message);
		}
		let data = res.data;
		data.numericHash = this.#cyrb53(data.id);
		this.elementRegistry[data.id] = data;
	}

	registerSoil(inputs) {
		let res = InputHandler(inputs, this.soilSchema);
		if (!res.success) {
			throw new Error(res.message);
		}
		let data = res.data;
		data.numericHash = this.#cyrb53(data.id);
		this.soilRegistry[data.id] = data;
	}
	/*
	registerBurnRecipe({id,elementOrSoil,result,chance = 1}) {
		if (elementOrSoil==="element") {
			this.elementReactions.burn["i.RJ."+id]={output:"i.RJ."+result,chance}
		} else if (elementOrSoil==="soil") {
			this.elementReactions.burn["i.vZ."+id]={output:"i.RJ."+result,chance}
		} 
	} 

	registerShakerRecipe(input, output1, output2) {}

	registerShakerAllow(id) {}
	*/
	// you can input however many outputs you want, they should be in the form of ["output",chance]
	// eg. registerPressRecipe("Sand", 200, ["BurntSlag",0.3],["WetSand",1])
	registerPressRecipe(input, outputs, requiredVelocity) {
		const schemaCheck = {input,requiredVelocity,outputs}
		let res = InputHandler(schemaCheck, this.recipeSchemas.press);
		if (!res.success) {
			throw new Error(res.message);
		}
		this.elementReactions.press[res.data.input] = [res.data.requiredVelocity, res.data.outputs];
	}

	registerRecipe(input1, input2, output1, output2) {
		const schemaCheck = {input1, input2, output1, output2}
		let res = InputHandler(schemaCheck, this.recipeSchemas.basic);
		if (!res.success) {
			throw new Error(res.message);
		}
		let data = res.data
		const add = (from, to) => {
			this.elementReactions.normal[from] ??= [];
			this.elementReactions.normal[from].push([to,data.output1,data.output2]);
		};
		add(data.input1, data.input2);
		add(data.input2, data.input1);
	}

	unregisterSoil(id) {
		if (!this.soilRegistry[id]) return log("error", "corelib", `Soil with id "${id}" not found! Unable to unregister.`);
		delete this.soilRegistry[id];
	}
	unregisterElement(id) {
		if (!this.elementRegistry[id]) return log("error", "corelib", `Element with id "${id}" not found! Unable to unregister.`);
		delete this.elementRegistry[id];
	}
	unregisterRecipe(element1, element2) {
		const removeRecipesBothWays = (input1, input2) => {
			if (!this.elementReactions.normal[input1]) return log("error", "corelib", `Could not unregister recipe between ${element1} and ${element2}! The reaction doesn't exist.`);
			this.elementReactions.normal[input1] = this.elementReactions.normal[input1].filter(([target]) => target !== input2);
			if (this.elementReactions.normal[input1].length === 0) delete this.elementReactions.normal[input1];
		};
		removeRecipesBothWays(element1, element2);
		removeRecipesBothWays(element2, element1);
	}
	unregisterPressRecipe(id) {
		if (!this.elementReactions.press[id]) return log("error", "corelib", `Press recipe with id "${id}" not found! Unable to unregister.`);
		delete this.elementReactions.press[id];
	}

	applyPatches() {
		const reduceElements = (string, registry) => {
			return Object.values(registry).reduce((acc, e) => acc + string(e), "");
		};
		//I wrote some of it then fed it into chatgpt to tell me what I did wrong
		const getBasicRecipesToPatch = (registry, objectPrefix) => {
			const listToReturn = Object.entries(registry).map(([key, values]) => `${objectPrefix}[n.RJ.${key}]=[` + values.map(v => `[${v.filter(Boolean).map(x => `n.RJ.${x}`).join(",")}]`).join(",") +`]`);
			return listToReturn.join(",");
		};
		const getPressRecipesToPatch = (registry, objectPrefix) => {
			const listToReturn = Object.entries(registry).map(([key, values]) => `${objectPrefix}[n.RJ.${key}]=[${values[0]},[${values[1].map(([output,chance]) => `[n.RJ.${output},${chance}]`).join(",")}]]`);
			return listToReturn.join(",");
		};
		this.#sortRegistryIds(this.elementRegistry, 25);
		this.#sortRegistryIds(this.soilRegistry, 31);
		//re-adds the base recipes
		if (this.addTheNormalRecipes) {
			this.registerRecipe("Sand", "Water", "WetSand", "WetSand");
			this.registerRecipe("Spore", "Water", "WetSpore");
			this.registerRecipe("Lava", "Water", "Steam", "Lava");
			this.registerRecipe("Flame", "Water", "Steam", "Steam");
			this.registerRecipe("Petalium", "Sandium", "Gloom", "Gloom");
			this.registerPressRecipe("BurntSlag", [["Spore", 1], ["Gold", 1]]);
		}

		fluxloaderAPI.setMappedPatch({ "js/bundle.js": ["Mh", "n", "h"], "js/336.bundle.js": ["a", "i.RJ", "i.es"], "js/546.bundle.js": ["r", "o.RJ", "o.es"] }, `corelib:elements:elementRegistry`, (l0, l1, l2) => ({
			type: "replace",
			from: `${l0}[${l1}.Basalt]={name:"Cinder",interactions:["🔥"],density:50,matterType:${l2}.Solid},`,
			to: `~` + reduceElements((e) => `${l0}[${l1}.${e.id}]={name:"${e.name}",interactions:["${e.hoverText}"],density:${e.density},matterType:${l2}.${e.matterType}},`, this.elementRegistry),
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
		//Doing the same thing three times is either because of lantto or the minifier
		for (const loop of [
			["a", "a"],
			["r", "n"],
			["i", "o"],
		]) {
			fluxloaderAPI.setMappedPatch({ "js/336.bundle.js": [`${loop[1]}`], "js/546.bundle.js": [`${loop[0]}`] }, `corelib:elements:soils-repeated3Times${loop[0]}`, (l) => ({
				type: "replace",
				from: `,${l}.vZ.Crackstone`,
				to: `~` + reduceElements((e) => `,${l}.vZ.${e.id}`, this.soilRegistry),
				token: "~",
			}));
		}

		fluxloaderAPI.setMappedPatch({ "js/bundle.js": ["Jl", "t", "n"], "js/515.bundle.js": ["i", "n.vZ", "n.RJ"] }, `corelib:elements:soilRegistry`, (l0, l1, l2) => ({
			type: "replace",
			from: `${l0}[${l1}.Obsidian]={name:"Scoria",interactions:["⛏️","💥"],hp:40,output:{elementType:${l2}.Basalt,chance:1},colorHSL:[0,100,15]},`,
			to:
				`~` +
				reduceElements(
					(e) => `${l0}[${l1}.${e.id}]={name:"${e.name}",interactions:["${e.hoverText}"],hp:${e.hp},output:{elementType:${l2}.${e.outputElement},chance:${e.chanceForOutput}},colorHSL:${JSON.stringify(e.colorHSL)}},`,
					this.soilRegistry
				),
			token: "~",
		}));

		//reactions
		fluxloaderAPI.setPatch("js/515.bundle.js", "corelib:elements:reactionsList", {
			type: "replace",
			from: `c=((i={})[n.RJ.Water]=[[n.RJ.Sand,n.RJ.WetSand],[n.RJ.Spore,n.RJ.WetSpore],[n.RJ.Lava,n.RJ.Steam],[n.RJ.Flame,n.RJ.Steam]],i[n.RJ.Sand]=[[n.RJ.Water,n.RJ.WetSand]],i[n.RJ.Spore]=[[n.RJ.Water,n.RJ.WetSpore]],i[n.RJ.Lava]=[[n.RJ.Water,n.RJ.Steam]],i[n.RJ.Flame]=[[n.RJ.Water,n.RJ.Steam]],i[n.RJ.Sandium]=[[n.RJ.Petalium,n.RJ.Gloom]],i[n.RJ.Petalium]=[[n.RJ.Sandium,n.RJ.Gloom]],i)`,
			to: `c=((i={}),${getBasicRecipesToPatch(this.elementReactions.normal, "i")},i)`,
		});
		fluxloaderAPI.setPatch("js/515.bundle.js", "corelib:elements:reactionsFunctionChange", {
			type: "replace",
			from: `[t.type,r.type].includes(n.RJ.Spore)?(0,a.Jx)(e,r.x,r.y,n.vZ.Empty):[t.type,r.type].includes(n.RJ.Lava)?(0,a.Jx)(e,r.x,r.y,(0,o.n)(n.RJ.Lava,r.x,r.y)):(0,a.Jx)(e,r.x,r.y,(0,o.n)(i[1],r.x,r.y))`,
			to: `i[2]?(0,a.Jx)(e,r.x,r.y,(0,o.n)(i[2],r.x,r.y)):(0,a.Jx)(e,r.x,r.y,n.vZ.Empty)`,
		});
		/*
		fluxloaderAPI.setPatch("js/336.bundle.js", "corelib:burningFuctionEdit", {
   			type: "replace",
   			from: `p=((a={})[i.RJ.Slag]=function(){return{output:{elementType:i.RJ.BurntSlag,chance:.25}}},a),f=!1,g=function(e,t,r,a){if(!(t<0||r<0||t>=e.store.world.size.width||r>=e.store.world.size.height)){var n=(0,c.tT)(e.store,t,r);if((0,c.Ol)(n))return(d=(0,s.n)(i.RJ.Fire,t,r)).duration.left=d.duration.max=d.duration.left*Math.max(.25,1-a/.64),void(0,c.Jx)(e,t,r,d);if((0,c.W)(n,i.vZ.Ice))(0,u.jE)(e,t,r);else{if((0,c.af)(n,[i.RJ.Water,i.RJ.FreezingIce])){var d=(0,s.n)(i.RJ.Steam,t,r);return(0,c.Jx)(e,t,r,d),f||(e.environment.postMessage([i.dD.ForceCompleteObjective,"vaporize_water"]),f=!0),void e.environment.postMessage([i.dD.PlaySound,[{id:"vaporize",opts:{volume:.1,fadeOut:l.A.getRandomFloatBetween(.1,.5),playbackRate:l.A.getRandomFloatBetween(.5,1.5)},modulateDistance:{x:d.x*o.A.cellSize,y:d.y*o.A.cellSize}}]])}if((0,c.af)(n,i.RJ.Slag))return(d=(0,s.n)(i.RJ.Flame,t,r)).data=p[i.RJ.Slag](),d.duration.left=d.duration.max=d.duration.left-a,void(0,c.Jx)(e,t,r,d);x(e,t,r,n)||(0,c.af)(n,i.RJ.Basalt)&&(0,c.Jx)(e,t,r,(0,s.n)(i.RJ.Lava,t,r))}}},y=function(e,t){var r;if(![i.RJ.Flame,i.RJ.Lava].includes(t.type))return!1;if(t.type===i.RJ.Flame&&((0,v.$T)(e,t.x*o.A.cellSize,t.y*o.A.cellSize,v.c6.Fire),e.environment.postMessage([i.dD.AddLight,t.x*o.A.cellSize,t.y*o.A.cellSize,{brightness:1,duration:100,useLightZones:!0}])),[{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}].forEach((function(r){var a=r.x,n=r.y,o={cX:t.x+a,cY:t.y+n},s=o.cX,d=o.cY;if(!(s<0||d<0||s>=e.store.world.size.width||d>=e.store.world.size.height)){var u=e.environment,c=l.A.getThreadIndexFromCellX(s,u.threadMeta.threadCount);c===u.threadMeta.startingIndex?m(e,s,d,t):e.environment.threadMeta.ports[c].postMessage([i.dD.Burn,s,d])}})),t.type===i.RJ.Lava)return t.duration.left=t.duration.max*l.A.getRandomFloatBetween(.5,1.5),t.variantIndex=l.A.getRandomIntBetween(0,3),(0,c.Jx)(e,t.x,t.y,t),!0;var a=null===(r=t.data)||void 0===r?void 0:r.output;return a?!1===a.elementType||a.chance&&Math.random()>=a.chance?((0,c.Jx)(e,t.x,t.y,(0,s.n)(i.RJ.Fire,t.x,t.y)),!0):((0,c.Jx)(e,t.x,t.y,(0,s.n)(a.elementType,t.x,t.y)),!0):((0,c.Jx)(e,t.x,t.y,(0,s.n)(i.RJ.Fire,t.x,t.y)),!0)},m=function(e,t,r,a){var n=(0,c.tT)(e.store,t,r);if((0,c.Ol)(n)){var l=(null==a?void 0:a.type)===i.RJ.Lava?.01:.25;if(Math.random()<l){(null==a?void 0:a.type)===i.RJ.Lava&&e.environment.postMessage([i.dD.AddLight,a.x*o.A.cellSize,a.y*o.A.cellSize,{brightness:1,size:r*o.A.cellSize<e.store.world.horizon[Math.floor(t)]*o.A.cellSize+10*o.A.cellSize?100:1e3,duration:5e3,useLightZones:!0}]);var d=(0,s.n)(i.RJ.Fire,t,r);return(null==a?void 0:a.type)===i.RJ.Lava&&(d.data.temperature=1200),void(0,c.Jx)(e,t,r,d)}}if((0,c.af)(n,i.RJ.Slag)){var u=(0,s.n)(i.RJ.Flame,t,r);return u.data=p[i.RJ.Slag](),void(0,c.Jx)(e,t,r,u)}(0,h.x)(e,n,t,r),x(e,t,r,n)},S=((n={})[i.vZ.Moss]=!1,n[i.vZ.Divider]=!1,n[i.vZ.GoldSoil]=i.RJ.Gold,n[i.vZ.Petal]=i.RJ.Petalium,n),x=function(e,t,r,a){if(a=null!=a?a:(0,c.tT)(e.store,t,r),(0,c.ez)(a)){if((0,c.kw)(a,[i.vZ.Moss,i.vZ.Divider,i.vZ.GoldSoil,i.vZ.Petal])){var n=(0,s.n)(i.RJ.Flame,t,r);return n.skipPhysics=!0,n.data={output:{elementType:S[a]}},(0,c.Jx)(e,t,r,n),!0}(0,d.zT)(e,t,r,4)}return!1}}`,
    		to: `
    		p=((a={})[i.RJ.Slag]=function(){return{output:{elementType:i.RJ.BurntSlag,chance:.25}}},a),f=!1,
    		g=function(e,t,r,a){if(!(t<0||r<0||t>=e.store.world.size.width||r>=e.store.world.size.height)){var n=(0,c.tT)(e.store,t,r);if((0,c.Ol)(n))return(d=(0,s.n)(i.RJ.Fire,t,r)).duration.left=d.duration.max=d.duration.left*Math.max(.25,1-a/.64),void(0,c.Jx)(e,t,r,d);if((0,c.W)(n,i.vZ.Ice))(0,u.jE)(e,t,r);else{if((0,c.af)(n,[i.RJ.Water,i.RJ.FreezingIce])){var d=(0,s.n)(i.RJ.Steam,t,r);return(0,c.Jx)(e,t,r,d),f||(e.environment.postMessage([i.dD.ForceCompleteObjective,"vaporize_water"]),f=!0),void e.environment.postMessage([i.dD.PlaySound,[{id:"vaporize",opts:{volume:.1,fadeOut:l.A.getRandomFloatBetween(.1,.5),playbackRate:l.A.getRandomFloatBetween(.5,1.5)},modulateDistance:{x:d.x*o.A.cellSize,y:d.y*o.A.cellSize}}]])}if((0,c.af)(n,i.RJ.Slag))return(d=(0,s.n)(i.RJ.Flame,t,r)).data=p[i.RJ.Slag](),d.duration.left=d.duration.max=d.duration.left-a,void(0,c.Jx)(e,t,r,d);x(e,t,r,n)||(0,c.af)(n,i.RJ.Basalt)&&(0,c.Jx)(e,t,r,(0,s.n)(i.RJ.Lava,t,r))}}},
    		y=function(e,t){var r;if(![i.RJ.Flame,i.RJ.Lava].includes(t.type))return!1;if(t.type===i.RJ.Flame&&((0,v.$T)(e,t.x*o.A.cellSize,t.y*o.A.cellSize,v.c6.Fire),e.environment.postMessage([i.dD.AddLight,t.x*o.A.cellSize,t.y*o.A.cellSize,{brightness:1,duration:100,useLightZones:!0}])),[{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}].forEach((function(r){var a=r.x,n=r.y,o={cX:t.x+a,cY:t.y+n},s=o.cX,d=o.cY;if(!(s<0||d<0||s>=e.store.world.size.width||d>=e.store.world.size.height)){var u=e.environment,c=l.A.getThreadIndexFromCellX(s,u.threadMeta.threadCount);c===u.threadMeta.startingIndex?m(e,s,d,t):e.environment.threadMeta.ports[c].postMessage([i.dD.Burn,s,d])}})),t.type===i.RJ.Lava)return t.duration.left=t.duration.max*l.A.getRandomFloatBetween(.5,1.5),t.variantIndex=l.A.getRandomIntBetween(0,3),(0,c.Jx)(e,t.x,t.y,t),!0;var a=null===(r=t.data)||void 0===r?void 0:r.output;return a?!1===a.elementType||a.chance&&Math.random()>=a.chance?((0,c.Jx)(e,t.x,t.y,(0,s.n)(i.RJ.Fire,t.x,t.y)),!0):((0,c.Jx)(e,t.x,t.y,(0,s.n)(a.elementType,t.x,t.y)),!0):((0,c.Jx)(e,t.x,t.y,(0,s.n)(i.RJ.Fire,t.x,t.y)),!0)},
    		m=function(e,t,r,a){var n=(0,c.tT)(e.store,t,r);if((0,c.Ol)(n)){var l=(null==a?void 0:a.type)===i.RJ.Lava?.01:.25;if(Math.random()<l){(null==a?void 0:a.type)===i.RJ.Lava&&e.environment.postMessage([i.dD.AddLight,a.x*o.A.cellSize,a.y*o.A.cellSize,{brightness:1,size:r*o.A.cellSize<e.store.world.horizon[Math.floor(t)]*o.A.cellSize+10*o.A.cellSize?100:1e3,duration:5e3,useLightZones:!0}]);var d=(0,s.n)(i.RJ.Fire,t,r);return(null==a?void 0:a.type)===i.RJ.Lava&&(d.data.temperature=1200),void(0,c.Jx)(e,t,r,d)}}if((0,c.af)(n,i.RJ.Slag)){var u=(0,s.n)(i.RJ.Flame,t,r);return u.data=p[i.RJ.Slag](),void(0,c.Jx)(e,t,r,u)}(0,h.x)(e,n,t,r),x(e,t,r,n)},S=((n={})[i.vZ.Moss]=!1,n[i.vZ.Divider]=!1,n[i.vZ.GoldSoil]=i.RJ.Gold,n[i.vZ.Petal]=i.RJ.Petalium,n),
    		x=function(e,t,r,a){if(a=null!=a?a:(0,c.tT)(e.store,t,r),(0,c.ez)(a)){if((0,c.kw)(a,[i.vZ.Moss,i.vZ.Divider,i.vZ.GoldSoil,i.vZ.Petal])){var n=(0,s.n)(i.RJ.Flame,t,r);return n.skipPhysics=!0,n.data={output:{elementType:S[a]}},(0,c.Jx)(e,t,r,n),!0}(0,d.zT)(e,t,r,4)}return!1}}`
		}); 
		*/
		fluxloaderAPI.setPatch("js/515.bundle.js", "corelib:elements:Press", {
			type: "replace",
			from: `s=function(e,t,r){return!(r!==n.vZ.VelocitySoaker||t.type!==n.RJ.BurntSlag||t.velocity.y<200||!h(e,t.x,t.y,n.RJ.Spore)||((0,l.Nz)(e,t),h(e,t.x,t.y,n.RJ.Gold),e.environment.postMessage([n.dD.PlaySound,[{id:"coin",opts:{volume:.2,fadeOut:a.A.getRandomFloatBetween(.1,2),playbackRate:a.A.getRandomFloatBetween(.5,1.5)},modulateDistance:{x:t.x*i.A.cellSize,y:t.y*i.A.cellSize}}]]),0))}`,
			to: `pressRecipes=(function(){var press={};${getPressRecipesToPatch(
				this.elementReactions.press,
				"press"
			)};return press;})(),s=function(e,t,r){const recipe=pressRecipes[t.type];if(r!==n.vZ.VelocitySoaker||!recipe||t.velocity.y<recipe[0]){return false;}const outputs=recipe[1];let posY = outputs.length; for(const[outputId,chance]of outputs){if(Math.random()<chance){posY--;h(e,t.x,t.y+posY,outputId);}}(0,l.Nz)(e,t);if(outputs.some(([outputId,_])=>outputId===n.RJ.Gold)){e.environment.postMessage([n.dD.PlaySound,[{id:"coin",opts:{volume:.2,fadeOut:a.A.getRandomFloatBetween(.1,2),playbackRate:a.A.getRandomFloatBetween(.5,1.5)},modulateDistance:{x:t.x*i.A.cellSize,y:t.y*i.A.cellSize}}]])}return true;}`,
		});
	}
}

globalThis.ElementsModule = ElementsModule;
