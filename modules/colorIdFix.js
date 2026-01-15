//this is all ported directly from leetom's magical ll-elements (including comments)
globalThis.applyCorelibColorIdFixPatches = function () {
	// patch the overflow (1 byte per colorId) by using a 16 byte (ushort) instead
	// Fist patch the alloc size
	fluxloaderAPI.setPatch("js/bundle.js", "corelib:colorIdFix:patchAllocatedSize", {
		type: "replace",
		from: `u=new SharedArrayBuffer(`,
		to: `u=new SharedArrayBuffer(2*`,
	});
	// Next, patch the 'view' array constructor
	fluxloaderAPI.setMappedPatch({ "js/336.bundle.js": [], "js/bundle.js": [] }, `corelib:colorIdFix:viewArrayConstructor`, () => ({
		type: "replace",
		from: `mapData:{data:new Uint8Array(`,
		to: `mapData:{data:new Uint16Array(`,
	}));
	// Then, patch the color id generation such that instead of counting down from 252(or something),
	// it counts from leftover of elm used color ids, and skip over special ids.
	fluxloaderAPI.setPatch("js/bundle.js", "corelib:colorIdFix:countdownFix", {
		type: "replace",
		from: `.elementColorByColorId,a=(`,
		to: `.elementColorByColorId, _startingColorId=Math.max(i.colorId,100),a=(`,
	});
	fluxloaderAPI.setPatch("js/bundle.js", "corelib:colorIdFix:countdownFix2", {
		type: "replace",
		from: `o=M.ObstacleStart;`,
		to: `o=_startingColorId+1;`,
	});
	fluxloaderAPI.setPatch("js/bundle.js", "corelib:colorIdFix:countdownFix3", {
		type: "replace",
		from: `,o--`,
		to: `,(()=>{do {o++} while (Object.keys(M).includes(""+o))})(),o`,
		expectedMatches: 5,
	});
	// Also need to update GL texture type to be 8 bit RG
	// Make the texture type to be 8 bit RG instead of 8 bit R, and update buf size
	fluxloaderAPI.setPatch("js/bundle.js", "corelib:colorIdFix:updateBufferSize", {
		type: "replace",
		from: "R=new Uint8Array(P.width*P.height),I=Rr.fromBuffer(R,P.width,P.height,{format:fe.RED,type:me.UNSIGNED_BYTE})",
		to: "R=new Uint8Array(P.width*P.height*2),I=Rr.fromBuffer(R,P.width,P.height,{format:fe.RG,type:me.UNSIGNED_BYTE})",
	});
	// Have the setter cast the buffer to byte array
	fluxloaderAPI.setPatch("js/bundle.js", "corelib:colorIdFix:castBufferToByteArray", {
		type: "replace",
		from: "r.pixi.tilemap.set(c)",
		to: `r.pixi.tilemap.set(new Uint8Array(c.buffer))`,
	});
	// Update the clrIdLookup texture func to go though all color ids
	fluxloaderAPI.setPatch("js/bundle.js", "corelib:colorIdFix:clrIdLookupGoThoughAllIds", {
		type: "replace",
		from: "(e,t,n){var r=M.Darkness+1,",
		to: `(e,t,n){var r = Math.max(M.Darkness,...Object.keys(n).map(Number))+1,`,
	});
	// update the shader to use both r and g channel, combining them to 16 bit val
	fluxloaderAPI.setPatch("js/bundle.js", "corelib:colorIdFix:shaderUseRandG", {
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
	// have the wall tilemap use old func instead of the new one, as that aren't changed
	fluxloaderAPI.setPatch("js/bundle.js", "corelib:colorIdFix:wallUseOldFunc", {
		type: "replace",
		from: "getTileValue(gl_FragCoord.xy, uWallTilemapTexture)",
		to: `getTileValueOld(gl_FragCoord.xy, uWallTilemapTexture)`,
	});
	// insert the runtime-shader-compile-time replace tag for setting the lookup count
	fluxloaderAPI.setPatch("js/bundle.js", "corelib:colorIdFix:setLookupCountForShader", {
		type: "replace",
		from: "(tileValue + 0.5) / 255.0;",
		to: `(tileValue + 0.5) / ##COLORID_LOOKUP_TEXTURE_WIDTH##;`,
	});
	// apply the runtime-shader-compile-time replacement to the shader string
	fluxloaderAPI.setPatch("js/bundle.js", "corelib:colorIdFix:patchShader", {
		type: "replace",
		from: `;\\n}",{uResolution:[o.width,o.height],minLightAmount`,
		to: `;\\n}"
            .replace("##COLORID_LOOKUP_TEXTURE_WIDTH##", \`\${N.baseTexture.width}.0\`)
            ,{uResolution:[o.width,o.height],minLightAmount`,
	});
	// update the blitting func to have a 16 bit varient
	fluxloaderAPI.setPatch("js/bundle.js", "corelib:colorIdFix:blittingUse16Bit", {
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
	// and have the map data tilemap use the 16 bit version
	fluxloaderAPI.setPatch("js/bundle.js", "corelib:colorIdFix:mapDataUse16Bit", {
		type: "replace",
		from: "c=Pf(n.shared.mapData.data,",
		to: `c=Pf_16Bit(n.shared.mapData.data,`,
	});
};
