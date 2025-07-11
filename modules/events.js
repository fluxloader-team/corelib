class EventsModule {
	applyPatches() {
		log("info", "corelib", "Loading Event Patches");

		// cell-change patch
		fluxloaderAPI.setPatch("js/336.bundle.js", "corelib:event-cell-change", {
			type: "replace",
			from: `e.store.world.matrix[r][t]=i`,
			to: `console.log("Worker:world.matrix["+r+"]["+t+"] = "+JSON.stringify(i));~`,
			token: `~`,
		});
		fluxloaderAPI.setPatch("js/bundle.js", "corelib:game-event-cell-change", {
			type: "replace",
			from: `n.store.world.matrix[i][r]=s`,
			to: `console.log("Game:world.matrix["+i+"]["+r+"] = "+JSON.stringify(s));~`,
			token: `~`,
		});

		// fog-reveal patch
		fluxloaderAPI.setPatch("js/336.bundle.js", "corelib:event-fog-reveal", {
			type: "replace",
			from: `case i.dD.StartFogReveal:`,
			to: `~corelib.events.processFogReveal(e.environment.threadMeta.startingIndex,e.data[1],e.data[2]);`,
			token: `~`,
		});

		// burn patch
		fluxloaderAPI.setPatch("js/336.bundle.js", "corelib:event-burn", {
			type: "replace",
			from: `case i.dD.Blast:`,
			to: `~corelib.events.processBlast(-1,e.data);`,
			token: `~`,
		});

		// GetCell patch
		fluxloaderAPI.setPatch("js/336.bundle.js", "corelib:GetCell", {
			type: "replace",
			from: `case i.dD.Init:`,
			to: `case 'GetCell':console.log("GetCell");return "OK";break;~`,
			token: `~`,
		});

		// dig patch
		fluxloaderAPI.setPatch("js/336.bundle.js", "corelib:event-dig", {
			type: "replace",
			from: `return void p(e,c,u,t,r,a);`,
			to: `
			{ 
			//console.log(JSON.stringify(c)+"\\n"+JSON.stringify(u)+"\\n"+JSON.stringify(t)+"\\n"+JSON.stringify(r)+"\\n"+JSON.stringify(a));
			corelib.events.processDig(e.environment.threadMeta.startingIndex,t,r,c,i);
~}
			`,
			token: `~`,
		});
	}
}

globalThis.EventsModule = EventsModule;
