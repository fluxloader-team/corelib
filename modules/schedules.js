class SchedulesModule {
	scheduleRegistry = new DefinitionRegistry("Schedule", 19);

	// Schedule will be registered and triggered by the `corelib:schedule-${id}` event
	register(id, interval) {
		if (this.scheduleDefinitions.hasOwnProperty(id)) {
			log("error", "corelib", `Schedule with id "${id}" already exists!`);
			return;
		}
		this.scheduleDefinitions[id] = interval;
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

		for (let [id, interval] of Object.entries(this.scheduleDefinitions)) {
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
