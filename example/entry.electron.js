corelib.blocks.register(
	new BlockDefinition({
		sourceMod: "corelib",
		id: "wedge",
		name: "Wedge Block",
		description: "A simple yet versatile wedge block",
		shape: "[10,0,0,0],[3,10,0,0],[3,3,0,0],[3,0,0,0]",
		angles: "[-180,180]",
		imagePath: "example/wedge"
	})
);

/*
corelib.tech.register(new TechDefinition({id: "testTech1",
    name: "Test Tech 1",
    description: "A test tech for example and testing purposes.",
    cost: 1,
    unlocks: {},
}))

corelib.tech.register(new TechDefinition({id: "testTech2",
    name: "Test Tech 2",
    description: "A second test technology.",
    unlocks: {},
    cost: 1e11,
    parent: "testTech1",
}))

corelib.tech.register(new TechDefinition({id: "miscTestTech",
    name: "Other Tech Test",
    description: "A test tech for example and testing purposes.",
    unlocks: {},
    cost: 50,
    parent: "Logistics1"
}))
*/
