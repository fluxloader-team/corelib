/** @typedef {import('../entry.electron.js')} */

/**
 * @typedef {object} ItemConfig
 * @property {string} id id of the item
 * @property {"Tool"|"Weapon"|"Consumable"} type type of the item
 * @property {string} name display name of the item
 * @property {string} description description of the item
 */

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
	registry = corelib.enums.createRegistry({
		name: "Item",
		intIdStart: 25,
		bundleMap: {
			main: "l",
			sim: "d",
			manager: "u",
		},
	});

	register(/** @type {ItemConfig} */ config) {
		const validConfig = validateInput(config, itemSchema);

		if (validConfig.type === "Consumable") {
			// For now just silently continue but with a warning
			log("warn", "corelib", `Item type "Consumable" is not fully supported yet; you should use "Tool" or "Weapon" instead.`);
		}

		const entry = { ...validConfig };

		this.registry.register(validConfig.id, entry);
	}

	unregister(/** @type {string} */ id) {
		this.registry.unregister(id);
	}

	applyPatches() {
		log("info", "corelib", "Loading item module patches");

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
