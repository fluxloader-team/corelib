await includeVMScript("BlocksAPI.js");

globalThis.blocksAPI = new globalThis.BlocksAPI();
fluxloaderAPI.events.on("fl:all-mods-loaded", () => globalThis.blocksAPI.loadPatches());
