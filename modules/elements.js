class ElementsModule {
	elementRegistry = {};
	soilRegistry = {};
	elementReactions = {};
	burningReactions = {};
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

	registerElement({ id, name, hoverText, colors, density, matterType }) {
		if (!(id && name && colors && density && matterType)) return log("error", "corelib", `Couldn't register element with id ${id}! Not all parameters are present`);
		const element = {
			id,
			name,
			hoverText,
			colors,
			density,
			matterType,
			numericHash: this.#cyrb53(id),
		};
		this.elementRegistry[id] = element;
	}

	registerSoil({ id, name, colorHSL, hoverText, hp, outputElement, chanceForOutput }) {
		if (!(id && name && colorHSL)) return log("error", "corelib", `Couldn't register soil with id ${id}! Not all parameters are present`);
		const soil = {
			id,
			name,
			colorHSL, //need to add
			hoverText,
			hp, //NaN for unbreakable like bedrock
			outputElement,
			chanceForOutput, //in decimal
			numericHash: this.#cyrb53(id),
		};
		this.soilRegistry[id] = soil;
	}

	registerBurnable() {}

	registerShakerRecipe() {}

	registerPressRecipe() {}

	registerRecipe(input1, input2, output1, output2) {
		const add = (from, to) => {
			this.elementReactions["n.RJ." + from] ??= [];
			this.elementReactions["n.RJ." + from].push(["n.RJ." + to, "n.RJ." + output1, "n.RJ." + output2]);
		};
		add(input1, input2);
		add(input2, input1);
	}

	unregisterSoil(id) {
		if (!this.soilRegistry[id]) return log("error", "corelib", `Soil with id "${id}" not found! Unable to unregister.`);
		delete this.this.elementRegistry[id];
	}
	unregisterElement(id) {
		if (!this.elementRegistry[id]) return log("error", "corelib", `Element with id "${id}" not found! Unable to unregister.`);
		delete this.elementRegistry[id];
	}
	unregisterRecipe(element1, element2) {
		const removeRecipesBothWays = (input1, input2) => {
			if (!this.elementReactions[input1]) return log("error", "corelib", `Could not unregister recipe between ${element1} and ${element2}! The reaction doesn't exist.`);
			this.elementReactions[input1] = this.elementReactions[input1].filter(([target]) => target !== input2);
			if (this.elementReactions[input1].length === 0) delete this.elementReactions[input1];
		};
		removeRecipesBothWays("n.RJ." + element1, "n.RJ." + element2);
		removeRecipesBothWays("n.RJ." + element2, "n.RJ." + element1);
	}

	applyPatches() {
		//re-adds the base recipes
		if (this.addTheNormalRecipes) {
			this.registerRecipe("Sand", "Water", "WetSand", "WetSand");
			this.registerRecipe("Spore", "Water", "WetSpore");
			this.registerRecipe("Lava", "Water", "Steam", "Lava");
			this.registerRecipe("Flame", "Water", "Steam", "Steam");
			this.registerRecipe("Petalium", "Sandium", "Gloom", "Gloom");
		}
		//formats the recipe list into a patchable format (chatgpt)
		let elementReactionsListToPatch = [];
		for (const key in this.elementReactions) {
			const contents = JSON.stringify(this.elementReactions[key]).replace(/"/g, "");
			elementReactionsListToPatch.push(`i[${key}]=${contents}`);
		}
		const joinedReactionsList = elementReactionsListToPatch.join(",");
		this.#sortRegistryIds(this.elementRegistry, 25);
		//loops over the element object and adds it
		for (const e of Object.values(this.elementRegistry)) {
			fluxloaderAPI.setMappedPatch({ "js/bundle.js": ["Mh", "n", "h"], "js/336.bundle.js": ["a", "i.RJ", "i.es"], "js/546.bundle.js": ["r", "o.RJ", "o.es"] }, `corelib:elements:${e.id}-elementRegistry`, (l0, l1, l2) => ({
				type: "replace",
				from: `${l0}[${l1}.Basalt]={name:"Cinder",interactions:["🔥"],density:50,matterType:${l2}.Solid},`,
				to: `~` + `${l0}[${l1}.${e.id}]={name:"${e.name}",interactions:["${e.hoverText}"],density:${e.density},matterType:${l2}.${e.matterType}},`,
				token: "~",
			}));
			fluxloaderAPI.setMappedPatch({ "js/bundle.js": ["$"], "js/336.bundle.js": ["e"], "js/546.bundle.js": ["e"] }, `corelib:elements:${e.id}-elementIdRegistry`, (l0) => ({
				type: "replace",
				from: `,${l0}[${l0}.Basalt=20]="Basalt"`,
				to: `~` + `,${l0}[${l0}.${e.id}=${e.numericId}]="${e.name}"`,
				token: "~",
			}));
			// Why did lantto do this, it seems useless
			fluxloaderAPI.addMappedPatch({ "js/bundle.js": ["o", "n", "k", "r"], "js/336.bundle.js": ["s", "n.RJ", "B", "e"], "js/546.bundle.js": ["s", "a.RJ", "B", "e"] }, (l0, l1, l2, l3) => ({
				type: "replace",
				from: `[0]:${l0}.type===${l1}.Basalt?(${l2}=${l3}.session.colors.scheme.element[${l1}.Basalt])`,
				to: `~` + `[0]:${l0}.type===${l1}.${e.id}?(${l2}=${l3}.session.colors.scheme.element[${l1}.${e.id}])`,
				token: "~",
			}));

			fluxloaderAPI.setPatch("js/bundle.js", `corelib:elements:${e.id}-filterlist`, {
				type: "replace",
				from: `,n.Basalt`,
				to: `~` + `,n.${e.id}`,
				token: "~",
			});

			fluxloaderAPI.setPatch("js/bundle.js", `corelib:elements:${e.id}-particleColors`, {
				type: "replace",
				from: `e[n.Basalt]=[pu(0,100,20),pu(3,100,22),pu(7,100,24),pu(10,100,26)]`,
				to: `~` + `,e[n.${e.id}]=${JSON.stringify(e.colors)}`,
				token: "~",
			});
		}
		this.#sortRegistryIds(this.soilRegistry, 35);
		//like the last one, loops over the soils list
		for (const e of Object.values(this.soilRegistry)) {
			fluxloaderAPI.setMappedPatch({ "js/bundle.js": ["Y"], "js/336.bundle.js": ["e"], "js/546.bundle.js": ["e"] }, `corelib:elements:${e.id}-soilIdRegistry`, (l) => ({
				type: "replace",
				from: `${l}[${l}.Crackstone=30]="Crackstone"`,
				to: `${l}[${l}.Crackstone=30]="Crackstone",${l}[${l}.${e.id}=${e.numericId}]="${e.name}"`,
			}));

			fluxloaderAPI.setPatch("js/bundle.js", `corelib:elements:${e.id}-breaksWithoutIt`, {
				type: "replace",
				from: `n,t.Crackstone`,
				to: `~` + `,t.${e.id}`,
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
					to: `~` + `,${l[0]}.vZ.${e.id}`,
					token: "~",
				});
				fluxloaderAPI.addPatch("js/336.bundle.js", {
					type: "replace",
					from: `,${l[1]}.vZ.Crackstone`,
					to: `~` + `,${l[1]}.vZ.${e.id}`,
					token: "~",
				});
			}
			//need to make a mappedpatch but to lazy
			fluxloaderAPI.setPatch("js/bundle.js", `corelib:elements:${e.id}-soilregistry-main`, {
				type: "replace",
				from: `Jl[t.Obsidian]={name:"Scoria",interactions:["⛏️","💥"],hp:40,output:{elementType:n.Basalt,chance:1},colorHSL:[0,100,15]},`,
				to: `~` + `Jl[t.${e.id}]={name:"${e.name}",interactions:["${e.hoverText}"],hp:${e.hp},output:{elementType:n.${e.outputElement},chance:${e.chanceForOutput}},colorHSL:${JSON.stringify(e.colorHSL)}},`,
				token: "~",
			});
			fluxloaderAPI.setPatch("js/515.bundle.js", `corelib:elements:${e.id}-soilregistry-515`, {
				type: "replace",
				from: `i[n.vZ.Obsidian]={name:"Scoria",interactions:["⛏️","💥"],hp:40,output:{elementType:n.RJ.Basalt,chance:1},colorHSL:[0,100,15]},`,
				to: `~` + `i[n.vZ.${e.id}]={name:"${e.name}",interactions:["${e.hoverText}"],hp:${e.hp},output:{elementType:n.RJ.${e.outputElement},chance:${e.chanceForOutput}},colorHSL:${JSON.stringify(e.colorHSL)}},`,
				token: "~",
			});
		}
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
		fluxloaderAPI.setPatch("js/515.bundle.js", "corelib:Press", {
		  type: "replace",
		  from: `s=function(e,t,r){return!(r!==n.vZ.VelocitySoaker||t.type!==n.RJ.BurntSlag||t.velocity.y<200||!h(e,t.x,t.y,n.RJ.Spore)||((0,l.Nz)(e,t),h(e,t.x,t.y,n.RJ.Gold),e.environment.postMessage([n.dD.PlaySound,[{id:"coin",opts:{volume:.2,fadeOut:a.A.getRandomFloatBetween(.1,2),playbackRate:a.A.getRandomFloatBetween(.5,1.5)},modulateDistance:{x:t.x*i.A.cellSize,y:t.y*i.A.cellSize}}]]),0))}`,
		  to: `s=function(e,t,r){return!(r!==n.vZ.VelocitySoaker||t.type!==n.RJ.BurntSlag||t.velocity.y<200||!h(e,t.x,t.y,n.RJ.Spore)||((0,l.Nz)(e,t),h(e,t.x,t.y,n.RJ.Gold),e.environment.postMessage([n.dD.PlaySound,[{id:"coin",opts:{volume:.2,fadeOut:a.A.getRandomFloatBetween(.1,2),playbackRate:a.A.getRandomFloatBetween(.5,1.5)},modulateDistance:{x:t.x*i.A.cellSize,y:t.y*i.A.cellSize}}]]),0))}`
		}); */
	}
}

globalThis.ElementsModule = ElementsModule;
