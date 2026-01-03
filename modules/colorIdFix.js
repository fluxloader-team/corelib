/** @typedef {import('../entry.electron.js')} */

class ColorIdFixModule {
	//this is all ported directly from leetom's magical ll-elements
	applyPatches() {
		fluxloaderAPI.setPatch("js/bundle.js", "corelib:colorIdFix:1", {
			type: "replace",
			from: `u=new SharedArrayBuffer(`,
			to: `u=new SharedArrayBuffer(2*`,
		});
		fluxloaderAPI.setMappedPatch({ "js/336.bundle.js": [], "js/bundle.js": [] }, `corelib:colorIdFix:viewArrayConstructor`, () => ({
			type: "replace",
			from: `mapData:{data:new Uint8Array(`,
			to: `mapData:{data:new Uint16Array(`,
		}));

		fluxloaderAPI.setPatch("js/bundle.js", "corelib:colorIdFix:3", {
			type: "replace",
			from: `.elementColorByColorId,a=(`,
			to: `.elementColorByColorId, _startingColorId=Math.max(i.colorId,100),a=(`,
		});
		fluxloaderAPI.setPatch("js/bundle.js", "corelib:colorIdFix:4", {
			type: "replace",
			from: `o=M.ObstacleStart;`,
			to: `o=_startingColorId+1;`,
		});
		fluxloaderAPI.setPatch("js/bundle.js", "corelib:colorIdFix:5", {
			type: "replace",
			from: `,o--`,
			to: `,(()=>{do {o++} while (Object.keys(M).includes(""+o))})(),o`,
			expectedMatches: 5,
		});
		fluxloaderAPI.setPatch("js/bundle.js", "corelib:colorIdFix:6", {
			type: "replace",
			from: "R=new Uint8Array(P.width*P.height),I=Rr.fromBuffer(R,P.width,P.height,{format:fe.RED,type:me.UNSIGNED_BYTE})",
			to: "R=new Uint8Array(P.width*P.height*2),I=Rr.fromBuffer(R,P.width,P.height,{format:fe.RG,type:me.UNSIGNED_BYTE})",
		});
		fluxloaderAPI.setPatch("js/bundle.js", "corelib:colorIdFix:7", {
			type: "replace",
			from: "r.pixi.tilemap.set(c)",
			to: `r.pixi.tilemap.set(new Uint8Array(c.buffer))`,
		});
		fluxloaderAPI.setPatch("js/bundle.js", "corelib:colorIdFix:8", {
			type: "replace",
			from: "(e,t,n){var r=M.Darkness+1,",
			to: `(e,t,n){var r = Math.max(M.Darkness,...Object.keys(n).map(Number))+1,`,
		});
		fluxloaderAPI.setPatch("js/bundle.js", "corelib:colorIdFix:9", {
			type: "replace",
			from: "float getTileValue(vec2 coord, sampler2D texture)",
			to: `${JSON.stringify(
				`
                        float getTileValue(vec2 coord, sampler2D texture)
                        {
                            // Normalizing to [0, 1] and flipping y-coordinate
                            vec2 relativeCoord = vec2(coord.x / uResolution.x, (uResolution.y - coord.y) / uResolution.y);
                            // Scaling to tilemap size
                            vec2 tilemapCoord = relativeCoord * uTilemapSize;
                            // Adjust the tilemap coordinates by the camera position offset
                            vec2 cameraOffset = mod(uCameraPosition, vec2(4.0));
                            tilemapCoord += cameraOffset / uResolution * uTilemapSize;
                            vec2 tileCoord = floor(tilemapCoord);

                            vec4 tileClr = texture2D(texture, (tileCoord + vec2(0.5)) / uTilemapSize);
                            float tileLow = tileClr.r;
                            float tileHigh = tileClr.g;
                            float tileValueLow = tileLow * 255.0;
                            float tileValueHigh = tileHigh * 255.0 * 256.0;
                            return tileValueLow + tileValueHigh;
                        }`,
			).slice(1, -1)}\\nfloat getTileValueOld(vec2 coord, sampler2D texture)`,
		});
		fluxloaderAPI.setPatch("js/bundle.js", "corelib:colorIdFix:10", {
			type: "replace",
			from: "getTileValue(gl_FragCoord.xy, uWallTilemapTexture)",
			to: `getTileValueOld(gl_FragCoord.xy, uWallTilemapTexture)`,
		});
		fluxloaderAPI.setPatch("js/bundle.js", "corelib:colorIdFix:11", {
			type: "replace",
			from: "(tileValue + 0.5) / 255.0;",
			to: `(tileValue + 0.5) / ##COLORID_LOOKUP_TEXTURE_WIDTH##;`,
		});
		fluxloaderAPI.setPatch("js/bundle.js", "corelib:colorIdFix:12", {
			type: "replace",
			from: `;\\n}",{uResolution:[o.width,o.height],minLightAmount`,
			to: `;\\n}"
            .replace("##COLORID_LOOKUP_TEXTURE_WIDTH##", \`\${N.baseTexture.width}.0\`)
            ,{uResolution:[o.width,o.height],minLightAmount`,
		});
		fluxloaderAPI.setPatch("js/bundle.js", "corelib:colorIdFix:13", {
			type: "replace",
			from: `function Pf(e,t,n,r,i,s){`,
			to: `
                    function Pf_16Bit(e_buff, t_ox, n_oy, r_w, i_h, s_stride) {
                        for (var o = new Uint16Array(r_w * i_h),
                            a_row = 0; a_row < i_h; a_row++) {
                            var l_rowStartIdx = (n_oy + a_row) * s_stride + t_ox,
                                u_rowEndIdx = l_rowStartIdx + r_w;
                            o.set(e_buff.subarray(l_rowStartIdx, u_rowEndIdx), a_row * r_w)
                        }
                        return o
                    }
                    function Pf(e,t,n,r,i,s){`,
		});
		fluxloaderAPI.setPatch("js/bundle.js", "corelib:colorIdFix:14", {
			type: "replace",
			from: "c=Pf(n.shared.mapData.data,",
			to: `c=Pf_16Bit(n.shared.mapData.data,`,
		});
	}
}

globalThis.ColorIdFixModule = ColorIdFixModule;
