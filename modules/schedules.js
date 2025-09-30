class SchedulesModule {
	scheduleRegistry = new DefinitionRegistry("Schedule");
	enums = corelib.enums.register({id:"Schedule", start:19,map: {
		main: "_", sim: "w", manager: "w"
	}});

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
		log("debug", "corelib", `Adding Schedule "${id}"`); // Using unverified id..
		// This could be done with more basic checks, but this ensures both parameters
		// are checked and logged, and that it follows how other modules are handling input
		let res = InputHandler({ id, interval }, this.scheduleSchema);
		if (!res.success) {
			// Makes mod fail electron entrypoint, instead of failing silently..
			throw new Error(res.message);
		}
		// Use processed data, which includes defaults
		let data = res.data;
		// Schedule will be registered and triggered by the `corelib:schedule-${id}` event
		if (this.scheduleRegistry.register(data.id, data.interval)) {
			corelib.enums.add("Schedule", data.id);
		}
	}

	unregister(id) {
		if (this.scheduleRegistry.unregister(id)) {
			corelib.enums.remove("Schedule", id);
		}
	}

	applyPatches() {
		log("info", "corelib", "Loading schedule patches");
		let scheduleDefinitionString = "";

		for (let [id, interval] of Object.entries(this.scheduleRegistry.definitions)) {
			scheduleDefinitionString += `up[_["${id}"]]= {interval:${interval}, multithreading:!1, callback:()=>{fluxloaderAPI.events.tryTrigger("corelib:schedule-${id}",undefined,false)}},`;
		}

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:scheduleDefinitions", {
			type: "replace",
			from: `up[_.Autosave]=`,
			to: `${scheduleDefinitionString}~`,
			token: `~`,
		});
	}
}

globalThis.SchedulesModule = SchedulesModule;
