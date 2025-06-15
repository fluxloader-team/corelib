globalThis.corelib = {
	exposed: {
		variable: {},
		function: {},
		named: {
			variable: {},
			function: {},
		},
	},
};

fluxloaderAPI.events.registerEvent("cl:raw-api-setup");

/*
fluxloaderAPI.events.on("fl:scene-loaded", (scene) => {
	if (scene == 3) {
		let buildings = fluxloaderAPI.gameWorld.state.store.player.buildings;
		buildings = buildings.filter((building) => building !== undefined);
	}
});
*/
