class EventsModule {


    applyPatches() {
        log("info", "corelib", "Loading Event Patches");

        // fluxloaderAPI.setPatch("js/336.bundle.js", "corelib:testpatch", {
        //     type: "replace",
        //     from: `self.onmessage=function(e){`,
        //     to: `~fluxloaderAPI.sendGameMessage("corelib:workerEvent",JSON.stringify(e.data));`,
        //     token: `~`,
        // });

        fluxloaderAPI.setPatch("js/546.bundle.js", "corelib:testpatch", {
            type: "replace",
            from: `self.onmessage=function(e){`,
            to: `~fluxloaderAPI.sendGameMessage("corelib:workerEvent",JSON.stringify(e.data));`,
            token: `~`,
        });

    }

}

globalThis.EventsModule = EventsModule;