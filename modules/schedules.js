class SchedulesModule {
	scheduleRegistry = new DefinitionRegistry("Schedule", 19);
	idMap = {};

	scheduleSchema = {
		id: {
			type: "string",
		},
		interval: {
			type: "number",
			verifier: (v) => {
				return {
					// I think an interval of 0 will cause issues..
					success: Number.isInteger(v) && v > 0,
					message: "Parameter 'interval' must be an integer > 0",
				};
			},
		},
	};
	register(id, interval) {
		log("debug", "corelib", `Adding Schedule "${data.id}"`); // Using unverified id..
		// This could be done with more basic checks, but this ensures both parameters
		// are checked and logged, and that it follows how other modules are handling input
		let res = InputHandler({ id, interval }, this.scheduleSchema);
		if (!res.success) {
			// Makes mod fail electron entrypoint, instead of failing silently..
			throw new Error(res.message);
		}
		// Use processed data, which includes defaults
		data = res.data;
		// Schedule will be registered and triggered by the `corelib:schedule-${id}` event
		this.idMap[data.id] = this.scheduleRegistry.register(data.interval);
	}

	unregister(id) {
		if (!this.idMap.hasOwnProperty(id)) {
			return log("error", "corelib", `Schedule with id "${id}" not found! Unable to unregister.`);
		}

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
			scheduleIDString += `,e[e["${id}"]=${this.idMap[id]}]="${id}", fluxloaderAPI.events.registerEvent("corelib:schedule-${id}")`;
			scheduleDefinitionString += `up[_["${id}"]]= {interval:${interval}, multithreading:!1, callback:()=>{fluxloaderAPI.events.tryTrigger("corelib:schedule-${id}",undefined,false)}},`;
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
