
class SchedulesModule {
    scheduleDefinitions = {}
    nextIDNumber = 19;
    
    register(id, interval) {
        if (this.scheduleDefinitions.id == interval) {
            log("error", "corelib", `Schedule with id "${id}" already exists!`)
            return;
        }
        this.scheduleDefinitions[id] = interval;
    }

    applyPatches() {
        log("info", "corelib", "Loading schedule patches")
        let scheduleIDString = "";
        let scheduleDefinitionString = "";
        for (let [id, interval] of Object.entries(this.scheduleDefinitions)) {
            scheduleIDString += `,e[e.${id}=${nextIDNumber++}]="${id}",
            fluxloaderAPI.events.register("corelib:schedule-${id}")`;
            scheduleDefinitionString += `up[_.${id}]=
            {interval:${interval},
            multithreading:!1,
            callback:function(e,t,n){
            fluxloaderAPI.events.tryTrigger("corelib:schedule-${id}")
            }},`
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
            to: `${scheduleDefinitionString}~`,
            token: `~`
        })
    }
}

globalThis.SchedulesModule = SchedulesModule;