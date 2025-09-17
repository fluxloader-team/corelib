class ItemsModule {
	itemRegistry = new DefinitionRegistry("Item", 25);
	idMap = {};

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

		this.idMap[id] = this.itemRegistry.register({ idNumber, ...data });
	}

	unregister(id) {
		if (!this.idMap.hasOwnProperty(id)) {
			return log("error", "corelib", `Item with id "${id}" not found! Unable to unregister.`);
		}

		let numericID = this.idMap[id];
		delete this.idMap[id];
		this.itemRegistry.unregister(numericID);
	}

	applyPatches() {
		log("debug", "corelib", "Loading item patches");

		let itemIDString = "";
		let itemDefinitionString = "";
		for (const item of Object.values(this.itemRegistry.definitions)) {
			itemIDString += `,H[H.${item.id}=${item.idNumber}]="${item.id}"`;
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

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:itemIDs", {
			type: "replace",
			from: `H[H.Cryoblaster=15]="Cryoblaster",`,
			to: `~${itemIDString}`,
			token: "~",
		});

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:itemDefinitions", {
			type: "replace",
			from: "Df[l.Cryoblaster]=wf,",
			to: `~${itemDefinitionString}`,
			token: "~",
		});
	}
}

globalThis.ItemsModule = ItemsModule;
