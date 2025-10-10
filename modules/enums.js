class ModuleEnumRegistry {
	constructor(id, start, bundleMap) {
		this.id = id;
		this.start = start;
		this.bundleMap = bundleMap;
		this.stringIds = [];
	}

	add(value) {
		if (this.stringIds.includes(value)) {
			throw new Error(`Value "${value}" already exists under id "${this.id}"`);
		}
		this.stringIds.push(value);
	}

	remove(value) {
		if (!this.stringIds.includes(value)) {
			throw new Error(`Value "${value}" does not exist under id "${this.id}"`);
		}
		this.stringIds.splice(this.stringIds.indexOf(value), 1);
	}
}

class EnumsModule {
	registry = new SafeMap("enums");
	store = {};

	schema = {
		id: {
			type: "string",
		},
		start: {
			type: "number",
		},
		bundleMap: {
			type: "object",
			verifier: (v) => {
				let bundles = ["main", "sim", "manager"];
				if (!bundles.some((bundle) => v.hasOwnProperty(bundle))) {
					return {
						success: false,
						message: `Parameter 'bundleMap' does not contain all the required bundles, found [${Object.keys(v).join(", ")}] but needed each of [${bundles.join(", ")}]`,
					};
				}
				for (let key in v) {
					if (!bundles.includes(key)) {
						return {
							success: false,
							message: `Parameter 'bundleMap' contains invalid bundle '${key}' must be one of [${bundles.join(", ")}]`,
						};
					}
					// this should NOT be what you directly replace in the enumerator, it should be the variable used to access the enumerator
					// may be typeof undefined
					if (typeof v[key] != "string") {
						return {
							success: false,
							message: "Parameter 'bundleMap' must have only string variable names",
						};
					}
				}
				return {
					success: true,
				};
			},
		},
	};

	register(data) {
		data = validateInput(data, this.schema, true).data;
		const registry = new ModuleEnumRegistry(out.id, out.start, out.bundleMap);
		this.registry.register(out.id, registry);
		return registry;
	}

	updateStore(gameStore) {
		// For each module with an enum registry
		for (let moduleName in this.registry.entries) {
			let enumRegistry = this.registry.entries[moduleName];
			gameStore[moduleName] ??= {};
			let moduleGameStore = gameStore[moduleName];

			// Put every registered enum value into the store
			let latestId = Math.max(enumRegistry.start - 1, ...Object.values(moduleGameStore));
			for (let stringId of enumRegistry.stringIds) {
				if (!moduleGameStore[stringId]) {
					moduleGameStore[stringId] = ++latestId;
				}
			}
		}

		// If we receive the store from the game keep our internal copy updated
		this.gameStore = gameStore;
	}

	applyPatches() {
		this.updateStore(this.gameStore);

		let reducedEnumStrings = { main: "", sim: "", manager: "" };

		// loop through bundles here
		for (let moduleName in this.gameStore) {
			let enumRegistry = this.registry.entries[moduleName];
			let storeValues = this.gameStore[moduleName];

			// example output: _[_["Schedule"]=19]="Schedule";
			for (let bundle in enumRegistry.bundleMap) {
				let identifier = enumRegistry.bundleMap[bundle];
				for (let [stringId, intId] of Object.entries(storeValues)) {
					reducedEnumStrings[bundle] += `${identifier}[${identifier}["${stringId}"]=${intId}]="${stringId}";`;
				}
			}
		}

		// This is at the end of each enumerator chain in the code
		let bundlePatchFroms = {
			main: "(F||(F={}))",
			sim: "(L||(L={}))",
			manager: "(J||(J={}))",
		};

		fluxloaderAPI.setMappedPatch({
			"js/bundle.js": [reducedEnumStrings.main, bundlePatchFroms.main],
			"js/336.bundle.js": [reducedEnumStrings.sim, bundlePatchFroms.sim],
			"js/546.bundle.js": [reducedEnumStrings.manager, bundlePatchFroms.manager]
		}, "corelib:addEnums", (text, bundleFrom) => ({
			type: "replace",
			from: bundleFrom,
			to: `${bundleFrom};${text}`, // Account for bad characters like '~' in enum ids by seperating with ';'
		}));

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:saveLoadHook", {
			type: "replace",
			from: `var r=JSON.parse(n.target.result);`,
			to: `~r=globalThis.corelib.hooks.setupSave(r);`,
			token: `~`,
		});

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:saveCreateHook", {
			type: "replace",
			from: `KT(t,n)`,
			to: `((store)=>{globalThis.corelib.hooks.setupSave(store);return store;})(~)`,
			token: `~`,
		});

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:changeSceneHook", {
			type: "replace",
			from: `function b_(e)`,
			to: `~{globalThis.corelib.hooks.preSceneChange(e)}globalThis.corelib.hooks.doSceneChange=(e)=>`,
			token: `~`,
		});

		// because we turn the function syntax "{...}" into a variable assignment of an anyonymous function, we need to close the variable assignment properly
		fluxloaderAPI.setPatch("js/bundle.js", "corelib:endChangeSceneHookDefinition", {
			type: "replace",
			from: ".reload()}var w_",
			to: ".reload()};var w_",
		});
	}
}

globalThis.EnumsModule = EnumsModule;
