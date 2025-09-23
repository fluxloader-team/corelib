const blockSpawns = [
	["Pipe", 40, 92, 0, 6],
	["Pipe", 40, 96, 1, 18],
	["Pipe", 40, 168, 0, 2],
	["Pump", 40, 92, 0, 6],
	["LiquidVent", 40, 168, 0, 2],
	["Pipe", 8, 8, 0, 12],
	["Pipe", 48, 8, 0, 2],
	["Pipe", 8, 8, 1, 138],
	["Pipe", 8, 552, 1, 2],
	["Pump", 8, 552, 1, 2],
	["LiquidVent", 48, 8, 0, 2],
	["Foundation", 32, 164, 1, 3],
	["Foundation", 76, 164, 1, 3],
];

function spawnBlockRange(e) {
	// [ type, x, y, dir, length ]
	console.log(`Spawning ${e}`);
	for (let i = 0; i < e[4]; i++) {
		let x = e[1];
		let y = e[2];
		if (e[3] == 0) x = x + i * 4;
		else y = y + i * 4;
		corelib.simulation.spawnBlock(x, y, e[0]);
	}
}

fluxloaderAPI.events.on("fl:scene-loaded", (scene) => {
	if (scene === "newgame" || scene === "loadgame") {
		console.log("Spawning blocks for testmod...");

		blockSpawns.forEach((s) => spawnBlockRange(s));

		setInterval(() => {
			corelib.simulation.spawnParticle(500, 500, "Water");
		}, 16);
		// not sure where to place this?
		corelib.simulation.spawnBlock(40, 164, "tickingtest");
	}
	fluxloaderAPI.gameInstance.state.store.options.portalConfig ??= {
		channel: 1,
	};
});

fluxloaderAPI.events.on("corelib:blocks-tickingtest", (block) => {
	// simple lazy spawn pixel on every cell, extra rx and ry cus I didn't want to retype as much and this is more so technically what you do
	for (let x = 0; x < 4; x++) {
		let rx = block.x + x;
		for (let y = 0; y < 4; y++) {
			let ry = block.y + y;
			if (Math.random() > 0.1) continue;
			// check if cell is clear
			if (!corelib.exposed.tf(fluxloaderAPI.gameInstance.state, rx, ry)) continue;
			corelib.simulation.spawnParticle(rx, ry, "Steam");
		}
	}
});

// `Portal` must match the block id
globalThis.blockPortalPreConfigUI = function ({ state }) {
	// useState will trigger a UI reload when set is called with a new value
	let [val, set] = React.useState(state.store.options.portalConfig?.channel ?? 1);
	// Data returned here is passed into `blockIDConfigUI` under `extra`
	// And is also used to determine width and height of configUI
	return { width: "200px", height: "60px", val, set };
};

// `Portal` must match the block id
globalThis.blockPortalConfigUI = function ({ extra }) {
	return React.createElement(
		"div",
		{},
		React.createElement(
			"div",
			{ className: "flex items-center space-x-2" },
			React.createElement("label", { htmlFor: "portal_channel", className: "text-white text-sm" }, "Portal channel"),
			React.createElement("input", {
				type: "number",
				id: "portal_channel",
				value: extra.val,
				min: 1,
				max: 16,
				onChange: (e) => {
					const i = parseInt(e.target.value, 10);
					extra.set(i);
				},
				className: "text-center text-black",
			})
		)
	);
};
