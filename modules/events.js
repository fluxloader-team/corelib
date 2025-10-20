class EventsModule {
	applyPatches() {
		log("info", "corelib", "Loading event module patches");

		// Code to send batched events at once
		fluxloaderAPI.setPatch("js/336.bundle.js", "corelib:event-send-batches", {
			type: "replace",
			from: `case i.dD.RunUpdate:`,
			to: `~corelib.events.sendBatches();`,
			token: `~`,
		});

		// cell-change patch
		fluxloaderAPI.setPatch("js/336.bundle.js", "corelib:event-cell-change", {
			type: "replace",
			from: `e.store.world.matrix[r][t]=i`,
			to: `corelib.events.processCellChange(e.environment.threadMeta.startingIndex,t,r,e.store.world.matrix[r][t],i);~`,
			token: `~`,
		});

		// fog-reveal patch
		fluxloaderAPI.setPatch("js/515.bundle.js", "corelib:event-fog-reveal", {
			type: "replace",
			from: `c.push([f+1,v]),`,
			to: `corelib.events.processFogReveal(f,v),~`,
			token: `~`,
		});
	}
}

globalThis.EventsModule = EventsModule;
