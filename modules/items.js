class ItemsModule {
	itemRegistry = new DefinitionRegistry("Item", 25);
	enums = corelib.enums.register({id:"Item", start: 25, map: {
		main: "l", worker: "d", manager: "u"
	}});

	itemSchema = {
		id: {
			type: "string",
		},
		type: {
			type: "string",
			verifier: (v) => {
				return {
					success: ["Tool", "Weapon", "Consumable"].includes(v),
					message: `Parameter 'type' must be one of "Tool", "Weapon", "Consumable"`,
				};
			},
		},
		name: {
			type: "string",
		},
		description: {
			type: "string",
		},
	};
	register(data) {
		log("debug", "corelib", `Adding Item "${data.id}"`); // Using unverified id..

		let res = InputHandler(data, this.itemSchema);
		if (!res.success) {
			// Makes mod fail electron entrypoint, instead of failing silently..
			throw new Error(res.message);
		}
		// Use processed data, which includes defaults
		data = res.data;

		if (data.type === "Consumable") {
			// For now just silently continue but with a warning
			log("warn", "corelib", `Item type "Consumable" is not fully supported yet; you should use "Tool" or "Weapon" instead.`);
		}

		if (this.itemRegistry.register(data.id, data)) {
			this.enums.add("Item", data.id);
		}
	}

	unregister(id) {
		if (this.itemRegistry.unregister(id)) {
			this.enums.remove("Item", id);
		}
	}

	applyPatches() {
		log("debug", "corelib", "Loading item patches");

		let itemDefinitionString = "";
		for (const item of Object.values(this.itemRegistry.definitions)) {
			itemDefinitionString += `DF[l.${item.id}]= function() {
				return {
					id: l.${item.id},
					itemType: a.${item.type},
					name: "${item.name}",
					description: "${item.description}",
				}
			}
			`;
		}

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:itemDefinitions", {
			type: "replace",
			from: "Df[l.Cryoblaster]=wf,",
			to: `~${itemDefinitionString}`,
			token: "~",
		});
	}
}

globalThis.ItemsModule = ItemsModule;
