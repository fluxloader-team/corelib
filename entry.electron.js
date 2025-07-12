includeVMScript("modules/blocks.js");
includeVMScript("modules/items.js");
includeVMScript("modules/tech.js");
includeVMScript("modules/events.js");
includeVMScript("modules/schedules.js");

class CoreLib {
	constructor() {
		this.blocks = new BlocksModule();
		this.tech = new TechModule();
		this.items = new ItemsModule();
		this.events = new EventsModule();
		this.schedules = new SchedulesModule();
	}

	async applyPatches() {
		log("debug", "corelib", "Loading all corelib patches");
		this.applyCorePatches();
		this.blocks.applyPatches();
		this.tech.loadTechPatches();
		this.items.applyPatches();
		this.events.applyPatches();
		this.schedules.applyPatches();
		log("debug", "corelib", "Finished loading patches");
	}

	applyCorePatches() {
		log("debug", "corelib", "Loading expose patches");

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:absoluteImages", {
			type: "replace",
			from: `om("img/"`,
			to: `om(e.endsWith(".png") ? e : "img/"`,
		});

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:expose", {
			type: "replace",
			from: `e.fps;function Af`,
			to: `
globalThis.corelib.exposed = {
kf,Cf,Ef,Tf,_f,Sf,wf,bf,xf,vf,gf,df,hf,cf,uf,lf,af,of,sf,rf,nf,tf,ef,Jd,Qd,Zd,Kd,qd,Yd,$d,Xd,Wd,Hd,
Vd,Gd,Ud,jd,zd,Od,Bd,Ld,Nd,Fd,Dd,Id,Rd,Pd,Md,Ad,kd,Cd,Td,_d,Sd,wd,bd,xd,vd,yd,gd,ld,ad,od,sd,id,rd,
td,ed,Jh,Qh,Zh,Kh,qh,Yh,$h,zh,Qh,Bh,Lh,Nh,Fh,Dh,Ih,Rh,Ah,kh,Eh,Th,_h,bh,xh,vh,yh,gh,ch,lh,ah,ih,nh,
th,eh,Jc,Qc,qc,Yc,$c,Xc,Wc,Hc,Vc,Gc,Uc,jc,zc,Oc,Bc,Lc,Nc,Fc,Dc,Ic,Rc,Pc,Mc,Ac,kc,Ec,wc,bc,xc,yc,gc,
mc,pc,fc,dc,hc,cc,uc,lc,tc,ec,Ju,Qu,Zu,Ku,$u,Hu,Vu,Uu,ju,zu,Ou,Lu,Nu,Fu,Du,Iu,Ru,Pu,ku,Eu,Tu,_u,Su,
bu,xu,vu,yu,gu,pu,fu,du,lu,au,ou,ru,nu,tu,eu,Ql,Zl,Kl,ql,Yl,$l,Ul,jl,zl,Ol,Bl,Ll,Nl,Fl,Dl,Il,Rl,Pl,
Ml,Al,Ed,nd,Xh,Wh,Hh,Gh,jh,wh,vc,oc,Yu,Xu,Wu,Gu,Mu,Au,wu,mu,hu,n,t,d};
fluxloaderAPI.events.tryTrigger("cl:raw-api-setup");
~`,
			token: `~`,
		});
	}
}

class DefinitionRegistry {
	moduleType = "";

	definitions = {};
	freeIDs = [];
	nextIDNumber = 0;

	constructor(moduleType, startCount = 0) {
		this.moduleType = moduleType;
		this.nextIDNumber = startCount;
	}

	nextID() {
		// Use available free IDs first
		if (this.freeIDs.length > 0) {
			return this.freeIDs.pop();
		}
		return this.nextIDNumber++;
	}

	register(data) {
		let id = this.nextID();
		if (this.definitions.hasOwnProperty(id)) {
			log("error", "corelib", `${this.moduleType} with id "${id}" already exists!`);
			return;
		}
		this.definitions[id] = data;
		return id;
	}

	unregister(id) {
		this.freeIDs.push(id);
		delete this.definitions[id];
	}
}

globalThis.DefinitionRegistry = DefinitionRegistry;

globalThis.corelib = new CoreLib();

// Re-apply patches any time a scene is about to be loaded
fluxloaderAPI.events.on("fl:pre-scene-loaded", () => globalThis.corelib.applyPatches());
