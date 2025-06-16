class ItemsModule {
	itemDefinitions = [];
	nextIDNumber = 25;

	register({ id, type, name, description }) {
		log("debug", "corelib", `Adding Item "${id}"`);

		// Ensure item ids are unique
		for (const existingItem of this.itemDefinitions) {
			if (existingItem.id === id) {
				log("error", "corelib", `Item with id "${id}" already exists!`);
				return;
			}
		}

		// Assign it the next item id number
		const idNumber = this.nextIDNumber++;

		// Ensure item type is valid
		let validTypes = ["Tool", "Weapon", "Consumable"];
		if (!validTypes.includes(type)) {
			log("error", "corelib", `Item type "${type}" is not recongized. Supported types are: "${validTypes.join(`", "`)}"`);
			return;
		}
		if (type === "Consumable") {
			log("warn", "corelib", `Item type "${type}" is not fully supported yet, you should use "Tool" or "Weapon" instead.`);
		}

		this.itemDefinitions.push({ id, idNumber, type, name, description });
	}

	applyPatches() {
		log("debug", "corelib", "Loading item patches");

		let itemIDString = "";
		let itemDefinitionString = "";
		for (const item of this.itemDefinitions) {
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