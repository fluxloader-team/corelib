await import("./shared.game.worker.js");


// Listen for Worker Events
//processCellChange(u,t,r,e.store.world.matrix[r][t],i)
corelib.events.processCellChange = (_worker, _x, _y, _from, _to) => {

    if (
        _worker === undefined
        || _x === undefined
        || _y === undefined
        || _from === undefined
        || _to === undefined
    ) {
        return;
    }

    let eventMessage = new EventMessage("cell-change", _worker, _x, _y);

    eventMessage.rawData.from = _from;
    eventMessage.rawData.to = _to;

    fluxloaderAPI.sendGameMessage("corelib:eventMessage", eventMessage);

};