fluxloaderAPI.events.on("fl:scene-loaded", (scene) => {
    if (scene == 3) { // in game, store should be loaded
        let buildings = gameInstance.state.store.player.buildings;
    }
});

