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

		// fog-reveal patch
		fluxloaderAPI.setPatch("js/336.bundle.js", "corelib:event-fog-reveal", {
			type: "replace",
			from: `case i.dD.StartFogReveal:`,
			to: `~corelib.events.processFogReveal(e.environment.threadMeta.startingIndex,e.data[1],e.data[2]);`,
			token: `~`,
		});
	}
}

globalThis.EventsModule = EventsModule;
