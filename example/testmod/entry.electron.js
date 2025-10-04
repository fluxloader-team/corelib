//adds a soil named TestingSoil
corelib.elements.registerSoil({
	id: "TestingSoil",
 	name: "TestingSoil",
	hp: 10,
	hoverText: "testing",
	outputElement: "Gold",
	chanceForOutput: 0.5,
	colorHSL: [115, 5, 45]
});
//adds a liquid named SaltWater
corelib.elements.registerElement({
 	id: "SaltWater",
  	name: "SaltWater",
 	colors: [[71, 156, 209, 50]],
 	density: 110,
 	hoverText: "🚫",
	matterType: "Liquid"
});
//When a sand pixel falls on the KSP it spawns gold with a 50% chance and wetsand
corelib.elements.registerPressRecipe("Sand",["Gold",0.5],["WetSand",1])
//When sand and spore touch they turn into gold and water
corelib.elements.registerRecipe("Sand","Spore","Gold","Water")

corelib.blocks.register({
	sourceMod: "testmod",
	id: "wedge",
	name: "Wedge Block",
	description: "A simple yet versatile wedge block",
	shape: "[10,0,0,0],[3,10,0,0],[3,3,0,0],[3,0,0,0]",
	angles: "[0]",
	imagePath: "wedge",
});

corelib.blocks.registerVariant({
	parentId: "wedge",
	suffix: "Left",
	shape: "[0,0,0,9],[0,0,9,3],[0,0,3,3],[0,0,0,3]",
	angles: "[-180,180]",
	imagePath: "wedgeLeft",
});

corelib.blocks.registerVariant({
	parentId: "wedge",
	suffix: "Up",
	shape: "[3,3,3,3],[0,3,3,0],[0,0,0,0],[0,0,0,0]",
	angles: "[90]",
	imagePath: "wedgeUp",
});

corelib.blocks.registerVariant({
	parentId: "wedge",
	suffix: "Down",
	shape: "[0,0,0,0],[0,0,0,0],[0,9,10,0],[9,3,3,10]",
	angles: "[-90]",
	imagePath: "wedgeDown",
});

corelib.tech.register({
	id: "testTech1",
	name: "Test Tech 1",
	description: "A test tech for example and testing purposes.",
	cost: 1,
	unlocks: {},
});

corelib.tech.register({
	id: "testTech2",
	name: "Test Tech 2",
	description: "A second test technology.",
	cost: 1e11,
	unlocks: {},
	parent: "testTech1",
});

corelib.tech.register({
	id: "miscTestTech",
	name: "Other Tech Test",
	description: "A test tech for example and testing purposes.",
	unlocks: {},
	cost: 50,
	parent: "Logistics1",
});

corelib.blocks.register({
	sourceMod: "portals",
	id: "Portal",
	name: "Portal",
	description: "An interdimensional portal that links two locations together.",
	shape: [
		[0, 0, 0, 0],
		[0, 0, 0, 0],
		[0, 0, 0, 0],
		[0, 0, 0, 0],
	],
	angles: [0],
	singleBuild: true,
	// corelib will setup the configUI for you, see the game entrypoint for more info
	// Requires some knowledge of React UIs, corelib only sets up the basic listeners but not UI content
	hasConfigMenu: true,
});

corelib.upgrades.registerTab({
	id: "portals",
	name: "Portals",
	requirement: {
		tech: "Portal",
	},
});

corelib.upgrades.registerCategory({
	tabID: "portals",
	id: "portals",
	name: "Portals",
});

corelib.upgrades.registerUpgrade({
	tabID: "portals",
	categoryID: "portals",
	id: "count",
	name: "Portal Count",
	description: "Increases the number of portal channels you can use.",
	maxLevel: 7,
	costs: [5000, 7000, 9000, 11000, 13000, 15000],
});
