// example and unit test mod for the core library

// get STBlade to show how this works, I am tempted to add a way to use inline Base64 but since mods are folders it's fine to do it like this
//corelib.addBlock(new blockDefinition("corelib", "test_block", "Test Block", "An example block", [], [-180, -90, 0, 90, 180], "/test_block.png"));

corelib.addTech(new TechDefinition({id: "testTech1",
    name: "Test Tech 1",
    description: "A test tech for example and testing purposes.",
    cost: 1,
    unlocks: {},
}))

corelib.addTech(new TechDefinition({id: "testTech2",
    name: "Test Tech 2",
    description: "A second test technology.",
    unlocks: {},
    cost: 1e11,
    parent: "testTech1",
}))

corelib.addTech(new TechDefinition({id: "miscTestTech",
    name: "Other Tech Test",
    description: "A test tech for example and testing purposes.",
    unlocks: {},
    cost: 50,
    parent: "Logistics1"
}))



