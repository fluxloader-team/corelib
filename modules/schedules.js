/** @typedef {import('../entry.electron.js')} */

/**
 * @typedef {object} ScheduleConfig
 * @property {string} id id of the schedule
 * @property {number} interval interval in ticks
 */

const scheduleSchema = {
	id: { type: "string" },
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

	register(/** @type {string } */ id, /** @type {number} */ interval) {
		const data = validateInput({ id, interval }, scheduleSchema);
		this.registry.register(data.id, data.interval);
	}

	unregister(/** @type {string} */ id) {
		this.registry.unregister(id);
	}

	getEntries() {
		return this.registry.entries;
	}

	applyPatches() {
		log("info", "corelib", "Loading schedule module patches");

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:scheduleDefinitions", {
			type: "replace",
			from: `up[_.Autosave]=`,
			to:
				Object.entries(this.registry.entries).reduce(
					(acc, [id, interval]) => acc + `up[_["${id}"]]={interval:${interval}, multithreading:!1, callback:()=>{fluxloaderAPI.events.tryTrigger("corelib:schedule-${id}",undefined,false)}},`,
					``,
				) + `~`,
			token: `~`,
		});
	}
}

globalThis.SchedulesModule = SchedulesModule;
