// I decided this would benefit from not strictly being strictly a singleton, I am ready to call yall crazy if you say this shouldn't be like this
// doing it like this for elements since soils and base elements have different enums

// all enums  (in main bundle) for double checking: n,t,d,q,r,s,o,a,l,u,c,h,f,p,g,y,v,x,b,w,S,_,T,E,C,k,A,M,P,R,I,D,F
class EnumsModule {
    registry = new DefinitionRegistry();
    store = {main:{},sim:{},manager:{}};

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
                let bundles = ["main", "sim", "manager"];
                if (!bundles.some((bundle) => Object.hasOwnProperty(v, bundle))) {
                    return {
                            success: false,
                            message: "map object in enum register must have a valid bundle identifier"
                        };
                }
                for (let key in v) {
                    if (!bundles.includes(key)) {
                        return {
                            success: false,
                            message: `unexpected key "${key}" in map object for enum, must be one of ${bundles.join(", ")}`
                        };
                    }
                    // this should NOT be what you directly replace in the enumerator, it should be the variable used to access the enumerator
                    // may be typeof undefined
                    if (typeof v[key] != "string") {
                        return {
                            success: false,
                            message: "map object in enum register must have only string variable names"
                        };
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
        if (!this.checkId(id)) {
            throw new Error(`Id "${id}" does not exist with the enums registry`);
        }
        let obj = this.registry.definitions[id];
        if (obj.values.includes(value)) {
            throw new Error(`Value "${value}" already exists under id "${id}" in the enums registry`);
        }
		obj.values.push(value);
	}
	
	remove(id, value) {
        if (!this.checkId(id)) {
            throw new Error(`Id "${id}" does not exist with the enums registry`);
        }
        let obj = this.registry.definitions[id];
        if (!obj.values.includes(value)) {
            throw new Error(`Value "${value}" does not exist under id "${id}" in the enums registry`);
        }
		obj.values.splice(obj.values.indexOf(value), 1);
	}

    updateStore(store) {
        // we get each definition
        for (let key in this.registry.definitions) {
            // we get their data
            let obj = this.registry.definitions[key];
            let data = obj.values;
            // we loop through each bundle they have a map for
            for (let bundle in obj.map) {
                // we get the object storing numbers with their values -- google said bdl is an abbreviation for bundle
                let bdl = store[bundle];
                // if this id doesn't exist on the store, add it
                bdl[key] ??= {};
                let curr = bdl[key];
                // we check for the start or the highest value, this could have weird values if the start somehow changes but that should never happen
                // do -1 so it actually starts at the start
                let next = Math.max(obj.start - 1, ...Object.values(curr));
                for (let entry of data) {
                    // cant use ??= because it still executes the right side
                    if (!curr[entry]) {
                        curr[entry] = ++next;
                    }
                }
            }
        }
        // we already check all our definitions so if this is a fresh store or from the game it still merges properly
        this.store = store;
    }

    applyPatches() {
        // ensure this store is up to date
        this.updateStore(this.store);

        let texts = {main:"",sim:"",manager:""};

        // loop through bundles here
        for (let bundle in this.store) {
            // all registry id's exist under here because we always call updateStore before
            for (let id in this.store[bundle]) {
                let def = this.registry.definitions[id];
                let vari = def.map[bundle];
                let num = this.store[bundle][id];
                // example output: _[_["Schedule"]=19]="Schedule";
                texts[bundle] += `${vari}[${vari}["${id}"]=${num}]="${id}";`;
            }
        }
        // end of all enumerator chains
        let replaces = {
            main: "(F||(F={}))",
            sim: "(L||(L={}))",
            manager: "(J||(J={}))"
        }


		fluxloaderAPI.setMappedPatch({"js/bundle.js":[texts.main, replaces.main],"js/336.bundle.js":[texts.sim, replaces.sim],"js/546.bundle.js":[texts.manager, replaces.manager]}, "corelib:addEnums", (text, replace) => ({
			type: "replace",
			from: replace,
            // incase some insane man uses '~' or just something wack in an id -- the ';' in thje middle is for minfieid stuff so it does work chaining, this adds an extra ; to the main bundle but makes the rest work
			to: replace + ";" + text
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