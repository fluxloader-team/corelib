
const itemSchema = {
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

class ItemsModule {
	registry = new SafeMap("Item", 25);
	enums = corelib.enums.register({
		id: "Item",
		start: 25,
		bundleMap: {
			main: "l",
			sim: "d",
			manager: "u",
		},
	});

	register(data /* itemSchema */) {
		data = validateInput(data, itemSchema, true).data;

		if (data.type === "Consumable") {
			// For now just silently continue but with a warning
			log("warn", "corelib", `Item type "Consumable" is not fully supported yet; you should use "Tool" or "Weapon" instead.`);
		}

		if (this.registry.register(data.id, data)) {
			this.enums.add(data.id);
		}
	}

	unregister(id) {
		if (this.registry.unregister(id)) {
			this.enums.remove(id);
		}
	}

	applyPatches() {
		log("debug", "corelib", "Loading item patches");

		let itemDefinitionString = "";
		for (const item of Object.values(this.registry.entries)) {
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
