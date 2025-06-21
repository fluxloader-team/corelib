await import("./shared.game.worker.js");

// events: worker-cell-changed
corelib.events.processCellChange = (_worker, _x, _y, _from, _to) => {
	if (_worker === undefined || _x === undefined || _y === undefined || _from === undefined || _to === undefined) {
		return;
	}

	let eventMessage = new EventMessage("cell-change", _worker, _x, _y);
	eventMessage.rawData.from = _from;
	eventMessage.rawData.to = _to;

	fluxloaderAPI.sendGameMessage("corelib:eventMessage", eventMessage);
};

// events: worker-fog-reveal
corelib.events.processFogReveal = (_worker, _x, _y) => {
	if (_worker === undefined || _x === undefined || _y === undefined) {
		return;
	}

	let eventMessage = new EventMessage("fog-reveal", _worker, _x, _y);

	fluxloaderAPI.sendGameMessage("corelib:eventMessage", eventMessage);
};
