const scheduleSchema = {
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

class SchedulesModule {
	registry = corelib.enums.createRegistry({
		name: "Schedule",
		intIdStart: 19,
		bundleMap: {
			main: "_",
			sim: "w",
			manager: "w",
		},
	});

	register(id, interval /* scheduleSchema */) {
		const data = validateInput({ id, interval }, scheduleSchema, true).data;

		// Schedule will be registered and triggered by the `corelib:schedule-${id}` event
		this.registry.register(data.id, data.interval);
	}

	unregister(id) {
		this.registry.unregister(id);
	}

	applyPatches() {
		log("info", "corelib", "Loading schedule module patches");

		let scheduleDefinitionString = "";

		for (let [id, interval] of Object.entries(this.registry.entries)) {
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
