class SchedulesModule {
	scheduleRegistry = new DefinitionRegistry("Schedule", 19);
	idMap = {};

	// Schedule will be registered and triggered by the `corelib:schedule-${id}` event
	register(id, interval) {
		this.idMap[id] = this.scheduleRegistry.register(interval);
	}

	unregister(id) {
		let numericID = this.idMap[id];
		delete this.idMap[id];
		this.scheduleRegistry.unregister(numericID);
	}

	applyPatches() {
		log("info", "corelib", "Loading schedule patches");
		let scheduleIDString = "";
		let scheduleDefinitionString = "";

		for (let id of Object.keys(this.idMap)) {
			let interval = this.scheduleRegistry.definitions[this.idMap[id]];
			scheduleIDString += `,e[e.${nextIDNumber++}]="${id}", fluxloaderAPI.events.register("corelib:schedule-${id}")`;
			scheduleDefinitionString += `up[_.${id}]= {interval:${interval}, multithreading:!1, callback:()=>{fluxloaderAPI.events.tryTrigger("corelib:schedule-${id}")}},`;
		}

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:scheduleID", {
			type: "replace",
			from: `e[e.PingPumpChunksFIX=8]="PingPumpChunksFIX"`,
			to: `~${scheduleIDString}`,
			token: `~`,
		});
		fluxloaderAPI.setPatch("js/bundle.js", "corelib:scheduleDefinitions", {
			type: "replace",
			from: `up[_.Autosave]=`,
			to: `${scheduleDefinitionString}~`,
			token: `~`,
		});
	}
}

globalThis.SchedulesModule = SchedulesModule;
