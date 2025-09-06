class ElementsModule {
	elementRegistry = {}
	soilRegistry = {}
	elementReactions = {}
	burningReactions = {}
	addTheNormalRecipes = true


	registerElement({ id, name, hoverText, colors, density, matterType }) {
		const element = {
			id,
			name,
			hoverText,
			colors, //this is an array of rgba arrays, needs to be a string
			density,
			matterType,
			numericId: Object.keys(this.elementRegistry).length + 25
		};
		this.elementRegistry[id]=element
	}
	
	registerSoil({id,name,colorHSL,hoverText,hp,outputElement,chanceForOutput,specialOnBreakFunction}) {
		const soil = {	
			id,
			name,
			colorHSL, //need to add
			hoverText, 
			hp, //NaN for unbreakable like bedrock
			outputElement,
			chanceForOutput, //in decimal
			numericId: Object.keys(this.soilRegistry).length + 35
		}
		this.soilRegistry[id]=soil
	}
	
	registerBurnable() {

	}

	registerShakerRecipe() {

	}

	registerPressRecipe(input,requiredSpeed,topOutput,bottemOutput) {

	}

	registerRecipe(input1, input2, output1, output2) {
	  const add = (from, to) => {
	    this.elementReactions["n.RJ." + from] ??= [];
	    this.elementReactions["n.RJ." + from].push(["n.RJ." + to, "n.RJ." + output1, "n.RJ." + output2]);
	  };

	  add(input1, input2);
	  add(input2, input1);
	}


	applyPatches() {

		//re-adds the base recipes
		if (corelib.elements.addTheNormalRecipes) {
			corelib.elements.registerRecipe("Sand","Water","WetSand","WetSand")
			corelib.elements.registerRecipe("Spore","Water","WetSpore")
			corelib.elements.registerRecipe("Lava","Water","Steam","Lava")
			corelib.elements.registerRecipe("Flame","Water","Steam","Steam")
			corelib.elements.registerRecipe("Petalium","Sandium","Gloom","Gloom")
		}
		//formats the recipe list into a patchable format (chatgpt)
		let elementReactionsListToPatch = []
		for (const key in corelib.elements.elementReactions) {
		  const contents = JSON.stringify(corelib.elements.elementReactions[key])
		    .replace(/"/g, "");
		  elementReactionsListToPatch.push(`i[${key}]=${contents}`);
		}
		const joinedReactionsList = elementReactionsListToPatch.join(",");
		
		//loops over the element object and adds it
		for (const e of Object.values(this.elementRegistry)) {
			fluxloaderAPI.setMappedPatch({ "js/bundle.js": ["Mh", "n", "h"], "js/336.bundle.js": ["a", "i.RJ", "i.es"], "js/546.bundle.js": ["r", "o.RJ", "o.es"] },`corelib:elements:${e.id}-elementRegistry`, (l0,l1,l2) => ({
   				type: "replace",
    			from: `${l0}[${l1}.Basalt]={name:"Cinder",interactions:["🔥"],density:50,matterType:${l2}.Solid},`,
    			to: `~`+`${l0}[${l1}.${e.id}]={name:"${e.name}",interactions:["${e.hoverText}"],density:${e.density},matterType:${l2}.${e.matterType}},`,
    			token: "~",
			}));
			fluxloaderAPI.setMappedPatch({ "js/bundle.js": ["$"], "js/336.bundle.js": ["e"], "js/546.bundle.js": ["e"] },`corelib:elements:${e.id}-elementIdRegistry`, (l0) => ({
   				type: "replace",
    			from: `,${l0}[${l0}.Basalt=20]="Basalt"`,
    			to: `~`+`,${l0}[${l0}.${e.id}=${e.numericId}]="${e.name}"`,
    			token: "~",
			}));
			// Why did lantto do this, it seems useless
			fluxloaderAPI.setMappedPatch({ "js/bundle.js": ["o","n","k","r"], "js/336.bundle.js": ["s","n.RJ","B","e"], "js/546.bundle.js": ["s","a.RJ","B","e"] }, `corelib:elements:${e.id}-mappingColorsToElements`, (l0,l1,l2,l3) => ({
   				type: "replace",
    			from: `[0]:${l0}.type===${l1}.Basalt?(${l2}=${l3}.session.colors.scheme.element[${l1}.Basalt])`,
    			to: `~`+`[0]:${l0}.type===${l1}.${e.id}?(${l2}=${l3}.session.colors.scheme.element[${l1}.${e.id}])`,
    			token: "~",
			}));

			fluxloaderAPI.setPatch("js/bundle.js", `corelib:elements:${e.id}-filterlist`,{
				type: "replace",
				from: `,n.Basalt`,
				to: `~` + `,n.${e.id}`,
				token: "~",
			});

			fluxloaderAPI.setPatch("js/bundle.js", `corelib:elements:${e.id}-particleColors`,{
				type: "replace",
				from: `e[n.Basalt]=[pu(0,100,20),pu(3,100,22),pu(7,100,24),pu(10,100,26)]`,
				to: `~`+`,e[n.${e.id}]=${JSON.stringify(e.colors)}`,
				token: "~",
			});
		}
		//like the last one, loops over the soils list
		for (const e of Object.values(this.soilRegistry)) {
			fluxloaderAPI.setMappedPatch({ "js/bundle.js": ["Y"], "js/336.bundle.js": ["e"], "js/546.bundle.js": ["e"] },`corelib:elements:${e.id}-soilIdRegistry`, (l) => ({
   				type: "replace",
    			from: `${l}[${l}.Crackstone=30]="Crackstone"`,
    			to: `${l}[${l}.Crackstone=30]="Crackstone",${l}[${l}.${e.id}=${e.numericId}]="${e.name}"`,
			}));

			fluxloaderAPI.setPatch("js/bundle.js",  `corelib:elements:${e.id}-breaksWithoutIt`,{
				type: "replace",
				from: `n,t.Crackstone`,
				to: `~` + `,t.${e.id}`,
				token: "~",
				expectedMatches: 2,
			});
			//Doing the same thing three times is either because of lantto or the minifier
			let definingThreeTimesIsSoFun = [["a","a"],["r","n"],["i","o"]]
			for (const l of definingThreeTimesIsSoFun) {
				fluxloaderAPI.addPatch("js/546.bundle.js", {
					type: "replace",
					from: `,${l[0]}.vZ.Crackstone`,
					to: `~`+`,${l[0]}.vZ.${e.id}`,
					token: "~",
				});
				fluxloaderAPI.addPatch("js/336.bundle.js", {
					type: "replace",
					from: `,${l[1]}.vZ.Crackstone`,
					to: `~`+`,${l[1]}.vZ.${e.id}`,
					token: "~",
				});
			}
			//need to make a mappedpatch but to lazy
			fluxloaderAPI.setPatch("js/bundle.js", `corelib:elements:${e.id}-soilregistry-main`,{
				type: "replace",
				from: `Jl[t.Obsidian]={name:"Scoria",interactions:["⛏️","💥"],hp:40,output:{elementType:n.Basalt,chance:1},colorHSL:[0,100,15]},`,
				to: `~` + `Jl[t.${e.id}]={name:"${e.name}",interactions:["${e.hoverText}"],hp:${e.hp},output:{elementType:n.${e.outputElement},chance:${e.chanceForOutput}},colorHSL:${e.colorHSL}},`,
				token: "~",
			});
			fluxloaderAPI.setPatch("js/515.bundle.js", `corelib:elements:${e.id}-soilregistry-515`,{
				type: "replace",
				from: `i[n.vZ.Obsidian]={name:"Scoria",interactions:["⛏️","💥"],hp:40,output:{elementType:n.RJ.Basalt,chance:1},colorHSL:[0,100,15]},`,
				to: `~` + `i[n.vZ.${e.id}]={name:"${e.name}",interactions:["${e.hoverText}"],hp:${e.hp},output:{elementType:n.RJ.${e.outputElement},chance:${e.chanceForOutput}},colorHSL:${e.colorHSL}},`,
				token: "~",
			});
		}
		fluxloaderAPI.setPatch("js/515.bundle.js", "corelib:reactionsList", {
		  type: "replace",
		  from: `c=((i={})[n.RJ.Water]=[[n.RJ.Sand,n.RJ.WetSand],[n.RJ.Spore,n.RJ.WetSpore],[n.RJ.Lava,n.RJ.Steam],[n.RJ.Flame,n.RJ.Steam]],i[n.RJ.Sand]=[[n.RJ.Water,n.RJ.WetSand]],i[n.RJ.Spore]=[[n.RJ.Water,n.RJ.WetSpore]],i[n.RJ.Lava]=[[n.RJ.Water,n.RJ.Steam]],i[n.RJ.Flame]=[[n.RJ.Water,n.RJ.Steam]],i[n.RJ.Sandium]=[[n.RJ.Petalium,n.RJ.Gloom]],i[n.RJ.Petalium]=[[n.RJ.Sandium,n.RJ.Gloom]],i)`,
		  to: `c=((i={}),${joinedReactionsList},i)`
		});

		fluxloaderAPI.setPatch("js/515.bundle.js", "corelib:reactionsFunctionChange", {
		  type: "replace",
		  from: `[t.type,r.type].includes(n.RJ.Spore)?(0,a.Jx)(e,r.x,r.y,n.vZ.Empty):[t.type,r.type].includes(n.RJ.Lava)?(0,a.Jx)(e,r.x,r.y,(0,o.n)(n.RJ.Lava,r.x,r.y)):(0,a.Jx)(e,r.x,r.y,(0,o.n)(i[1],r.x,r.y))`,
		  to: `i[2]?(0,a.Jx)(e,r.x,r.y,(0,o.n)(i[2],r.x,r.y)):(0,a.Jx)(e,r.x,r.y,n.vZ.Empty)`
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
