fluxloaderAPI.events.on("fl:scene-loaded", (scene) => {
    if (scene == 3) { // in game, store should be loaded
        // we remove undefined so incase a mod tech gave an undefined building it doesn't crash the game
        let buildings = fluxloaderAPI.gameWorld.state.store.player.buildings;
        buildings = buildings.filter(building => building !== undefined);
    }
});

// please rework these names
globalThis.rawAPI ??= {
    variable: {},
    function: {},
    named: {
        variable: {},
        function: {}
    }
}

fluxloaderAPI.events.registerEvent("cl:raw-api-setup");