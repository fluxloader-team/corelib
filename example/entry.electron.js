corelib.blocks.register({
    sourceMod: "corelib",
    id: "wedge",
    name: "Wedge Block",
    description: "A simple yet versatile wedge block",
    shape: "[10,0,0,0],[3,10,0,0],[3,3,0,0],[3,0,0,0]",
    angles: "[0]",
    imagePath: "example/wedge",
});

corelib.blocks.addVariant({
    parentId: "wedge",
    suffix: "Left",
    shape: "[0,0,0,9],[0,0,9,3],[0,0,3,3],[0,0,0,3]",
    angles: "[-180,180]",
    imagePath: "example/wedgeLeft",
});
corelib.blocks.addVariant({
    parentId: "wedge",
    suffix: "Up",
    shape: "[3,3,3,3],[0,3,3,0],[0,0,0,0],[0,0,0,0]",
    angles: "[90]",
    imagePath: "example/wedgeUp",
});
corelib.blocks.addVariant({
    parentId: "wedge",
    suffix: "Down",
    shape: "[0,0,0,0],[0,0,0,0],[0,9,10,0],[9,3,3,10]",
    angles: "[-90]",
    imagePath: "example/wedgeDown",
});

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
