class EventsModule {
	applyPatches() {
		log("info", "corelib", "Loading Event Patches");

		// cell-change patch
		fluxloaderAPI.setPatch("js/336.bundle.js", "corelib:event-cell-change", {
			type: "replace",
			from: `e.store.world.matrix[r][t]=i`,
			to: `corelib.events.processCellChange(e.environment.threadMeta.startingIndex,t,r,e.store.world.matrix[r][t],i);~`,
			token: `~`,
		});

		// fog-reveal patches
		fluxloaderAPI.setPatch("js/336.bundle.js", "corelib:event-fog-reveal", {
			type: "replace",
			from: `case i.dD.StartFogReveal:`,
			to: `~corelib.events.processFogReveal(e.data[1],e.data[2]);`,
			token: `~`,
		});
		fluxloaderAPI.setPatch("js/515.bundle.js", "corelib:event-fog-reveal", {
			type: "replace",
			from: `u.has("".concat(f,",")`,
			to: `performance.mark('fog-reveal-start'),corelib.events.processFogReveal(f,v),performance.mark('fog-reveal-end'),performance.measure('fog-reveal','fog-reveal-start','fog-reveal-end'),~`,
			token: `~`,
		});
	}
}

globalThis.EventsModule = EventsModule;
