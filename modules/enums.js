// I decided this would benefit from not strictly being strictly a singleton, I am ready to call yall crazy if you say this shouldn't be like this
// doing it like this for elements since soils and base elements have different enums

// all enums  (in main bundle) for double checking: n,t,d,q,r,s,o,a,l,u,c,h,f,p,g,y,v,x,b,w,S,_,T,E,C,k,A,M,P,R,I,D,F
class EnumsModule {
    registry = new DefinitionRegistry();
    store = {main:{},sim:{},manager:{}};
    hasLoaded = false;

    schema = {
        id: {
            type: "string"
        },
        start: {
            type: "number"
        },
        map: {
            type: "object",
            verifier: (v) => {
                for (let key in ["main", "sim", "manager"]) {
                    if (!Object.hasOwnProperty(v, key)) {
                        return {
                            success: false,
                            message: "map object in enum register must have a valid bundle identifier"
                        }
                    }
                    // this should NOT be what you directly replace in the enumerator, it should be the variable used to access the enumerator
                    if (typeof v[key] != "string") {
                        return {
                            success: false,
                            message: "map object in enum register must have only string variable names"
                        }
                    }
                }
                return {
                    success: true
                }
            }
        }
    }

	register(data) {
        let res = InputHandler(data, this.schema);
        if (!res.success) {
			throw new Error(res.message);
		}
        res.values = [];
        this.registry.register(res.id, res);
        return res;
	}

    checkId(id) {
        return this.registry.definitions.hasOwnProperty(id);
    }

	add(id, value) {
        if (!checkId(id)) {
            throw new Error(`Id "${id}" does not exist with the enums registry`);
        }
        let obj = this.registry.definitions[id];
        if (obj.values[value]) {
            throw new Error(`Value "${value}" already exists under id "${id}" in the enums registry`);
        }
		obj.values.push(value);
	}
	
	remove(id, value) {
        if (!checkId(id)) {
            throw new Error(`Id "${id}" does not exist with the enums registry`);
        }
        let obj = this.registry.definitions[id];
        if (!obj.values[value]) {
            throw new Error(`Value "${value}" does not exist under id "${id}" in the enums registry`);
        }
		obj.values.splice(obj.values.indexOf(value), 1);
	}

    updateStore(store) {
        for (let obj of Object.values(this.registry.definitions)) {
            for (let bundle of Object.keys(store)) {
                let curr = store[bundle];

            }
        }
        this.store = store;
    }

    applyPatches() {
        if (!hasLoaded) {
            // this is first load and entering the main menu
            hasLoaded = true;
            updateStore(this.store);
        }

        let texts = {main:"",sim:"",manager:""};

        for (let obj of Object.values(this.registry.definitions)) {
            for (let bundle of Object.keys(store)) {
                let curr = store[bundle];

            }
        }
        let replaces = {
            main: "",
            sim: "",
            manager: ""
        }


		fluxloaderAPI.setMappedPatch({"js/bundle.js":[texts.main],"js/336.bundle.js":[texts.sim],"js/546.bundle.js":[texts.manager]}, "corelib:addEnums", () => ({
			type: "replace",
			from: ``,
			to: ``,
			token: `~`
		}));

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:saveLoadHook", {
			type: "replace",
			from: `var r=JSON.parse(n.target.result);`,
			to: `~globalThis.corelib.hooks.setupSave(r);`,
			token: `~`
		});

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:saveCreateHook", {
			type: "replace",
			from: `KT(t,n)`,
			to: `(store)=>{globalThis.corelib.hooks.setupSave(store);return store;}(~)`,
			token: `~`
		});

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:changeSceneHook", {
			type: "replace",
			from: `function b_(e)`,
			to: `~{globalThis.corelib.hooks.preSceneChange(e)}globalThis.corelib.hooks.doSceneChange=(e)=>`,
			token: `~`
		});
    }
}

globalThis.enumsModule = enumsModule;