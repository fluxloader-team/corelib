class ItemsModule {
	itemRegistry = new DefinitionRegistry("Item", 25);
	idMap = {};

	register({ id, type, name, description }) {
		log("debug", "corelib", `Adding Item "${id}"`);

		// Ensure item type is valid
		let validTypes = ["Tool", "Weapon", "Consumable"];
		if (!validTypes.includes(type)) {
			log("error", "corelib", `Item type "${type}" is not recongized. Supported types are: "${validTypes.join(`", "`)}"`);
			return;
		}
		if (type === "Consumable") {
			log("warn", "corelib", `Item type "${type}" is not fully supported yet, you should use "Tool" or "Weapon" instead.`);
		}

		this.idMap[id] = this.itemRegistry.register({ id, idNumber, type, name, description });
	}

	unregister(id) {
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
