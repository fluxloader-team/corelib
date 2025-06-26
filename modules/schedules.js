
class SchedulesModule {
    scheduleDefinitions = []
    nextIDNumber = 19;
    
    register({id, interval}) {
        for (const existingSchedule of this.scheduleDefinitions) {
            if (existingSchedule.id === id) {
                log("error", "corelib", `Schedule with id "${id}" already exists!`)
                return;
            }
        }
        this.scheduleDefinitions.push({id, interval})
    }

    applyPatches() {
        log("info", "corelib", "Loading schedule patches")
        let scheduleIDString = "";
        let scheduleDefinitionString = "";
        for (let schedule of this.scheduleDefinitions) {
            scheduleIDString += `,e[e.${schedule.id}=${nextIDNumber++}]="${schedule.id}"`;
            scheduleDefinitionString += ``
        }
        fluxloaderAPI.setPatch("js/bundle.js", "corelib:scheduleID", {
            type: "replace",
            from: `e[e.PingPumpChunksFIX=8]="PingPumpChunksFIX"`,
            to: `~${scheduleIDString}`,
            token: `~`
        })
        fluxloaderAPI.setPatch("js/bundle.js", "corelib:scheduleDefinitions", {
            type: "replace",
            from: `up[_.Autosave]=`,
            to: `${scheduleDefinitionString},~`,
            token: `~`
        })
    }
}

globalThis.SchedulesModule = SchedulesModule;