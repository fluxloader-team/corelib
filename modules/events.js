class EventsModule {


    applyPatches() {
        var patchid = 0;
        log("info", "corelib", "Loading Event Patches");

        // fluxloaderAPI.setPatch("js/336.bundle.js", "corelib:testpatch"+patchid++, {
        //     type: "replace",
        //     from: `return m(m(m({}`,
        //     to: `corelib.events.processWorkerEvent("MMM",v);~`,
        //     token: `~`,
        // });

        fluxloaderAPI.setPatch("js/336.bundle.js", "corelib:testpatch"+patchid++, {
            type: "replace",
            from: `e.store.world.matrix[r][t]=i`,
            to: `corelib.events.processCellChange(u,t,r,e.store.world.matrix[r][t],i);~`,
            token: `~`,
        });


        // fluxloaderAPI.setPatch("js/336.bundle.js", "corelib:testpatch1"+patchid++, {
        //     type: "replace",
        //     from: `x=function(e,t,r,i){`,
        //      to: `~corelib.events.processWorkerEvent("x",t,r,i);`,
        //     token: `~`,
        // });

        // fluxloaderAPI.setPatch("js/336.bundle.js", "corelib:testpatch"+patchid++, {
        //     type: "replace",
        //     from: `self.onmessage=function(e){`,
        //     to: `~console.log(e);corelib.events.processWorkerEvent(JSON.stringify(e.data));`,
        //     token: `~`,
        // });

// Not required.... I don't think

        // fluxloaderAPI.setPatch("js/546.bundle.js", "corelib:testpatch"+patchid++, {
        //     type: "replace",
        //     from: `self.onmessage=function(e){`,
        //     to: `~fluxloaderAPI.sendGameMessage("corelib:workerEvent",JSON.stringify(e.data));`,
        //     token: `~`,
        // });

    }

}

globalThis.EventsModule = EventsModule;