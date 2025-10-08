includeVMScript("modules/blocks.js");
includeVMScript("modules/items.js");
includeVMScript("modules/tech.js");
includeVMScript("modules/upgrades.js");
includeVMScript("modules/events.js");
includeVMScript("modules/schedules.js");

class CoreLib {
	constructor() {
		this.blocks = new BlocksModule();
		this.tech = new TechModule();
		this.upgrades = new UpgradesModule();
		this.items = new ItemsModule();
		this.events = new EventsModule();
		this.schedules = new SchedulesModule();
	}

	async applyPatches() {
		log("debug", "corelib", "Loading all corelib patches");
		this.applyCorePatches();
		this.blocks.applyPatches();
		this.tech.applyPatches();
		this.upgrades.applyPatches();
		this.items.applyPatches();
		this.events.applyPatches();
		this.schedules.applyPatches();
		log("debug", "corelib", "Finished loading patches");
		fluxloaderAPI.events.trigger("cl:patches-applied");
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
Ml,Al,Ed,nd,Xh,Wh,Hh,Gh,jh,wh,vc,oc,Yu,Gf,Xu,Xf,Wu,Gu,Mu,Au,wu,mu,hu,q,le,t,n,r,s,o,a,l,u,c,h,d,f,p,m,g,y,v,x,b,w};
fluxloaderAPI.events.tryTrigger("cl:raw-api-setup");
~`,
			token: `~`,
		});

		fluxloaderAPI.setPatch("js/336.bundle.js", "corelib:expose", {
			type: "replace",
			from: `const O=function()`,
			to: `globalThis.corelib.exposed={a,n,o,i,l,s,d,u,c,v,h,p,f,g,A,b,R,w,M,k,C,T,F,B,z,D,J,P,L},fluxloaderAPI.events.tryTrigger("cl:raw-api-setup");~`,
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

// args should be an object of any:any (should match schema keys, and have valid values)
// schema should be an object which maps keys of arguments to expected data
//   schema items without `default` will be assumed to be required parameters
//   type is a basic `typeof` check to ensure inputs pass basic type checks
//   verifier is an optional function to provide extra checks for what values are valid
// Example:
//	InputHandler(
//		{ example: 50 },
//		{
// 		example: {
// 			default: 10,
// 			type: "number",
//			// verifier MUST return an object with { success: bool, message: string }
// 			verifier: (v) => { success: Number.isInteger(v), message: "Parameter 'example' must be an integer" }
// 		},
//	}
// );

const InputHandler = function (parameters, schema) {
	let result = {
		success: true,
		data: {},
		errors: {},
	};
	for (const parameter of Object.keys(parameters)) {
		if (!schema.hasOwnProperty(parameter)) {
			log("warn", "corelib", `Parameter '${parameter}' is unexpected - ignoring`);
		}
	}
	for (const [parameter, data] of Object.entries(schema)) {
		let value = parameters[parameter] ?? data.default;
		if (value === undefined) {
			result.success = false;
			result.errors[parameter] = {
				parameter,
				message: `Parameter '${parameter}' was undefined but is required`,
				code: "required_not_provided",
			};
			log("error", "corelib", result.errors[parameter].message);
			continue;
		}
		if (data.type) {
			// Generic error if we don't know the type
			let error = `Parameter '${parameter}' was expected to be of type ${data.type}, but was not`;
			switch (data.type) {
				case "array":
					result.success = Array.isArray(value);
					break;
				default:
					result.success = typeof value === data.type;
					error = `Parameter '${parameter}' is of type ${typeof value}, but was expected to be of type ${data.type}`;
					break;
			}
			if (!result.success) {
				result.errors[parameter] = {
					parameter,
					message: error,
					code: "type_mismatch",
				};
				log("error", "corelib", result.errors[parameter].message);
				continue;
			}
		}
		if (data.verifier) {
			let verifierResult = data.verifier(value);
			if (!verifierResult.success) {
				let message = `Parameter '${parameter}' failed custom verifier`;
				// Allow override of message from verifier
				if (verifierResult.message) message = verifierResult.message;
				result.success = false;
				result.errors[parameter] = {
					parameter,
					message,
					code: "failed_verifier",
				};
				log("error", "corelib", message);
				continue;
			}
		}
		result.data[parameter] = value;
	}
	return result;
};

globalThis.DefinitionRegistry = DefinitionRegistry;
globalThis.InputHandler = InputHandler;

globalThis.corelib = new CoreLib();

fluxloaderAPI.events.registerEvent("cl:patches-applied");
fluxloaderAPI.events.on("fl:pre-scene-loaded", () => globalThis.corelib.applyPatches());
