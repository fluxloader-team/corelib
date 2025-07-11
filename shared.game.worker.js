globalThis.corelib = { exposed: {}, simulation: {}, events: {}, utils: {} };

corelib.events.eventTypes = ["cell-change", "fog-reveal", "dig"];

globalThis.EventMessage = class EventMessage {
	constructor(_type, _worker = -1, _x = -1, _y = -1) {
		this.type = _type;
		this.worker = _worker;
		this.loc.x = _x;
		this.loc.y = _y;
		this.trigger = `cl:worker-${this.type}`;
	}

	type = null;
	loc = { x: -1, y: -1 };
	data = {};
	rawData = {};
	worker = -1;
	trigger = null;
};
