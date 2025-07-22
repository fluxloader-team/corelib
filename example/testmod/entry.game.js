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
	}
});
