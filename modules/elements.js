class ElementsModule {
	elementRegistry = {};
	soilRegistry = {};
	elementReactions = {
		normal: {},
		press: {},
		shaker: {},
	};
	idMaps={soil:{Empty:0,Element:1,SandSoil:2,SporeSoil:3,Fog:4,FogJetpackBlock:5,FogWater:6,FreezingIceSoil:7,Divider:8,Grass:9,Moss:10,GoldSoil:11,Petal:12,FogLava:13,Fluxite:14,Block:15,SlidingBlock:16,SlidingBlockLeft:17,SlidingBlockRight:18,ConveyorLeft:19,ConveyorRight:20,ShakerLeft:21,ShakerRight:22,Bedrock:23,VelocitySoaker:24,Ice:25,Grower:26,NascentWater:27,SandiumSoil:28,Obsidian:29,Crackstone:30,},element:{Sand:1,Particle:2,Water:3,WetSand:4,Sandium:5,Slag:6,Gold:7,Gloom:8,Shake:9,Steam:10,Fire:11,FreezingIce:12,Flame:13,BurntSlag:14,Spore:15,WetSpore:16,Seed:17,Petalium:18,Lava:19,Basalt:20,},};
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

	registerElement({ id, name, hoverText, colors, density, matterType, addToFilterList = true }) {
		if (!(id && name && colors && density && matterType)) return log("error", "corelib", `Couldn't register element with id ${id}! Not all parameters are present`);
		const element = {
			id,
			name,
			hoverText,
			colors,
			density,
			matterType,
			addToFilterList,
			numericHash: this.#cyrb53(id),
		};
		this.elementRegistry[id] = element;
	}

	registerSoil({ id, name, colorHSL, hoverText, hp, outputElement, chanceForOutput }) {
		if (!(id && name && colorHSL)) return log("error", "corelib", `Couldn't register soil with id ${id}! Not all parameters are present`);
		const soil = {
			id,
			name,
			colorHSL, //single array of HSL
			hoverText,
			hp, //NaN for unbreakable like bedrock
			outputElement,
			chanceForOutput, //in decimal
			numericHash: this.#cyrb53(id),
		};
		this.soilRegistry[id] = soil;
	}
	/* I give up on this for now
	registerBurnable({id,elementOrSoil,result,chance = 1,noOutput=false}) {
		if (!id) return log("error", "corelib", `Couldn't register burning reaction! No id.`)
		if (elementOrSoil==="element") {
			this.burningReactions["i.RJ."+id]={output:"i.RJ."+result,chance,noOutput}
		} else if (elementOrSoil==="soil") {
			this.burningReactions["i.vZ."+id]={output:"i.RJ."+result,chance,noOutput}
		} else {
			return log("error", "corelib", `Couldn't register burning reaction for ${id}! elementOrSoil needs to be "element" or "soil"`)
		}
	}
	*/

	registerShakerRecipe(input, output1, output2) {}

	registerShakerAllow(id) {}

	// you can input however many outputs you want, they should be in the form of ["output",chance]
	// eg. registerPressRecipe("Sand", 200, ["BurntSlag",0.3],["WetSand",1])
	registerPressRecipe(input, requiredVelocity = 200, ...outputArrays) {
		const modifiedOutputs = outputArrays.map(([output, chance]) => [`n.RJ.${output}`, chance]);
		this.elementReactions.press[`n.RJ.${input}`] = [requiredVelocity, modifiedOutputs];
	}

	registerRecipe(input1, input2, output1, output2) {
		const add = (from, to) => {
			this.elementReactions.normal["n.RJ." + from] ??= [];
			this.elementReactions.normal["n.RJ." + from].push(["n.RJ." + to, "n.RJ." + output1, "n.RJ." + output2]);
		};
		add(input1, input2);
		add(input2, input1);
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
		removeRecipesBothWays("n.RJ." + element1, "n.RJ." + element2);
		removeRecipesBothWays("n.RJ." + element2, "n.RJ." + element1);
	}
	unregisterPressRecipe(id) {
		if (!this.elementReactions.press[`n.RJ.${id}`]) return log("error", "corelib", `Press recipe with id "${id}" not found! Unable to unregister.`);
		delete this.elementReactions.press[`n.RJ.${id}`];
	}

	applyPatches() {
		const reduceElements = (f, registry) => {
			return Object.values(registry).reduce((acc, e) => acc + f(e), "");
		};
		this.#sortRegistryIds(this.elementRegistry, 25);
		this.#sortRegistryIds(this.soilRegistry, 35);
		//re-adds the base recipes
		if (this.addTheNormalRecipes) {
			this.registerRecipe("Sand", "Water", "WetSand", "WetSand");
			this.registerRecipe("Spore", "Water", "WetSpore");
			this.registerRecipe("Lava", "Water", "Steam", "Lava");
			this.registerRecipe("Flame", "Water", "Steam", "Steam");
			this.registerRecipe("Petalium", "Sandium", "Gloom", "Gloom");
			this.registerPressRecipe("BurntSlag", 200, ["Spore", 1], ["Gold", 1]);
		}
		//formats the recipe list into a patchable format (chatgpt)
		let elementReactionsListToPatch = [];
		for (const key in this.elementReactions.normal) {
			const contents = JSON.stringify(this.elementReactions.normal[key]).replace(/"/g, "");
			elementReactionsListToPatch.push(`i[${key}]=${contents}`);
		}
		const joinedReactionsList = elementReactionsListToPatch.join(",");

		let pressReactionsListToPatch = [];
		for (const key in this.elementReactions.press) {
			const contents = JSON.stringify(this.elementReactions.press[key]).replace(/"/g, "");
			pressReactionsListToPatch.push(`press[${key}]=${contents}`);
		}
		const joinedPressReactionsList = pressReactionsListToPatch.join(",");

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
		fluxloaderAPI.setMappedPatch({ "js/bundle.js": ["Y"], "js/336.bundle.js": ["e"], "js/546.bundle.js": ["e"] }, `corelib:elements:soilIdRegistry`, (l) => ({
			type: "replace",
			from: `${l}[${l}.Crackstone=30]="Crackstone"`,
			to: `~` + reduceElements((e) => `,${l}[${l}.${e.id}=${e.numericId}]="${e.id}"`, this.soilRegistry),
			token: "~",
		}));

		fluxloaderAPI.setPatch("js/bundle.js", `corelib:elements:breaksWithoutIt`, {
			type: "replace",
			from: `n,t.Crackstone`,
			to: `~` + reduceElements((e) => `,t.${e.id}`, this.soilRegistry),
			token: "~",
			expectedMatches: 2,
		});
		//Doing the same thing three times is either because of lantto or the minifier
		for (const l of [
			["a", "a"],
			["r", "n"],
			["i", "o"],
		]) {
			fluxloaderAPI.addPatch("js/546.bundle.js", {
				type: "replace",
				from: `,${l[0]}.vZ.Crackstone`,
				to: `~` + reduceElements((e) => `,${l[0]}.vZ.${e.id}`, this.soilRegistry),
				token: "~",
			});
			fluxloaderAPI.addPatch("js/336.bundle.js", {
				type: "replace",
				from: `,${l[1]}.vZ.Crackstone`,
				to: `~` + reduceElements((e) => `,${l[1]}.vZ.${e.id}`, this.soilRegistry),
				token: "~",
			});
		}
		fluxloaderAPI.setPatch("js/bundle.js", `corelib:elements:soilregistry-main`, {
			type: "replace",
			from: `Jl[t.Obsidian]={name:"Scoria",interactions:["⛏️","💥"],hp:40,output:{elementType:n.Basalt,chance:1},colorHSL:[0,100,15]},`,
			to:
				`~` +
				reduceElements(
					(e) => `Jl[t.${e.id}]={name:"${e.name}",interactions:["${e.hoverText}"],hp:${e.hp},output:{elementType:n.${e.outputElement},chance:${e.chanceForOutput}},colorHSL:${JSON.stringify(e.colorHSL)}},`,
					this.soilRegistry
				),
			token: "~",
		});
		fluxloaderAPI.setPatch("js/515.bundle.js", `corelib:elements:soilregistry-515`, {
			type: "replace",
			from: `i[n.vZ.Obsidian]={name:"Scoria",interactions:["⛏️","💥"],hp:40,output:{elementType:n.RJ.Basalt,chance:1},colorHSL:[0,100,15]},`,
			to:
				`~` +
				reduceElements(
					(e) => `i[n.vZ.${e.id}]={name:"${e.name}",interactions:["${e.hoverText}"],hp:${e.hp},output:{elementType:n.RJ.${e.outputElement},chance:${e.chanceForOutput}},colorHSL:${JSON.stringify(e.colorHSL)}},`,
					this.soilRegistry
				),
			token: "~",
		});

		fluxloaderAPI.setPatch("js/515.bundle.js", "corelib:reactionsList", {
			type: "replace",
			from: `c=((i={})[n.RJ.Water]=[[n.RJ.Sand,n.RJ.WetSand],[n.RJ.Spore,n.RJ.WetSpore],[n.RJ.Lava,n.RJ.Steam],[n.RJ.Flame,n.RJ.Steam]],i[n.RJ.Sand]=[[n.RJ.Water,n.RJ.WetSand]],i[n.RJ.Spore]=[[n.RJ.Water,n.RJ.WetSpore]],i[n.RJ.Lava]=[[n.RJ.Water,n.RJ.Steam]],i[n.RJ.Flame]=[[n.RJ.Water,n.RJ.Steam]],i[n.RJ.Sandium]=[[n.RJ.Petalium,n.RJ.Gloom]],i[n.RJ.Petalium]=[[n.RJ.Sandium,n.RJ.Gloom]],i)`,
			to: `c=((i={}),${joinedReactionsList},i)`,
		});

		fluxloaderAPI.setPatch("js/515.bundle.js", "corelib:reactionsFunctionChange", {
			type: "replace",
			from: `[t.type,r.type].includes(n.RJ.Spore)?(0,a.Jx)(e,r.x,r.y,n.vZ.Empty):[t.type,r.type].includes(n.RJ.Lava)?(0,a.Jx)(e,r.x,r.y,(0,o.n)(n.RJ.Lava,r.x,r.y)):(0,a.Jx)(e,r.x,r.y,(0,o.n)(i[1],r.x,r.y))`,
			to: `i[2]?(0,a.Jx)(e,r.x,r.y,(0,o.n)(i[2],r.x,r.y)):(0,a.Jx)(e,r.x,r.y,n.vZ.Empty)`,
		});
		/*
		fluxloaderAPI.setPatch("js/336.bundle.js", "corelib:burningInteractions", {
			type: "replace",
			from: `S=((n={})[i.vZ.Moss]=!1,n[i.vZ.Divider]=!1,n[i.vZ.GoldSoil]=i.RJ.Gold,n[i.vZ.Petal]=i.RJ.Petalium,n)`,
			to: `S=((n={}),${joinedBurningReactionsList},n)`,
		});
		fluxloaderAPI.setPatch("js/336.bundle.js", "corelib:burningFuctionEdit", {
   			type: "replace",
   			from: `x=function(e,t,r,a){if(a=null!=a?a:(0,c.tT)(e.store,t,r),(0,c.ez)(a)){if((0,c.kw)(a,[i.vZ.Moss,i.vZ.Divider,i.vZ.GoldSoil,i.vZ.Petal])){var n=(0,s.n)(i.RJ.Flame,t,r);return n.skipPhysics=!0,n.data={output:{elementType:S[a]}},(0,c.Jx)(e,t,r,n),!0}(0,d.zT)(e,t,r,4)}return!1}}`,
    		to: `x=function(e,t,r,a){if(a=null!=a?a:(0,c.tT)(e.store,t,r),(0,c.ez)(a)){if(a in S && Math.random() <= (S[a].chance ?? 1)){var n=(0,s.n)(i.RJ.Flame,t,r);return n.skipPhysics=!0,n.data={output:{elementType:S[a]}},(0,c.Jx)(e,t,r,n),!0}(0,d.zT)(e,t,r,4)}return!1}}`
		}); */

		fluxloaderAPI.setPatch("js/515.bundle.js", "corelib:Press", {
			type: "replace",
			from: `s=function(e,t,r){return!(r!==n.vZ.VelocitySoaker||t.type!==n.RJ.BurntSlag||t.velocity.y<200||!h(e,t.x,t.y,n.RJ.Spore)||((0,l.Nz)(e,t),h(e,t.x,t.y,n.RJ.Gold),e.environment.postMessage([n.dD.PlaySound,[{id:"coin",opts:{volume:.2,fadeOut:a.A.getRandomFloatBetween(.1,2),playbackRate:a.A.getRandomFloatBetween(.5,1.5)},modulateDistance:{x:t.x*i.A.cellSize,y:t.y*i.A.cellSize}}]]),0))}`,
			to: `pressRecipes=(function(){var press={};${joinedPressReactionsList};return press;})(),s=function(e,t,r){const recipe=pressRecipes[t.type];if(r!==n.vZ.VelocitySoaker||!recipe||t.velocity.y<recipe[0]){return false;}const outputs=recipe[1];for(const[outputId,chance]of outputs){if(Math.random()<chance){h(e,t.x,t.y,outputId);}}(0,l.Nz)(e,t);if(outputs.some(([outputId,_])=>outputId===n.RJ.Gold)){e.environment.postMessage([n.dD.PlaySound,[{id:"coin",opts:{volume:.2,fadeOut:a.A.getRandomFloatBetween(.1,2),playbackRate:a.A.getRandomFloatBetween(.5,1.5)},modulateDistance:{x:t.x*i.A.cellSize,y:t.y*i.A.cellSize}}]])}return true;}`,
		});
	}
}

globalThis.ElementsModule = ElementsModule;
