globalThis.corelib = {};

globalThis.corelib.exposed = {};

globalThis.corelib.simulation = {
	clearCell: (x, y) => {
		globalThis.corelib.exposed.ud(fluxloaderAPI.gameWorld.state, y ? { x, y } : { x: x.x, y: x.y });
	},
	setCell: (x, y, element) => {
		globalThis.corelib.exposed.Od(fluxloaderAPI.gameWorld.state, x, y, element);
	},
	makePixel: (x, y, element) => {
		return globalThis.corelib.exposed.Fh(element, x, y, undefined);
	},
	multiplyVector: (vector, mutliplier) => {
		return globalThis.corelib.exposed.yc(vector, mutliplier);
	},
	checkCellsEqual: (element1, element2) => {
		return globalThis.corelib.exposed.Kd(element1, element2);
	},
	checkClearOfDynamic: (x, y) => {
		globalThis.corelib.exposed.tf(fluxloaderAPI.gameWorld.state, x, y);
	},
	getStaticCell: (x, y) => {
		return globalThis.corelib.exposed.sf(fluxloaderAPI.gameWorld.state, x, y);
	},
};

fluxloaderAPI.events.registerEvent("cl:raw-api-setup");
