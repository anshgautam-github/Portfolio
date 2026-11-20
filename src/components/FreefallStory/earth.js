// earth.js - the planet you fall toward, drawn live in WebGL2 (no libraries): stars and a faint Milky Way, a lit globe from real
// NASA Blue Marble textures, city lights on the night side, a cloud shell with parallax, atmosphere glow and sun glint, and
// the re-entry streaks. Optional high-resolution NASA GIBS tiles (India, then Tamil Nadu / Chennai) fade in when they arrive.
// Camera model: a point above (lat, lon) at altitude h (km), looking `tilt` degrees away from straight down toward north (0 = nadir, 90 = the horizon).
const R_KM = 6371, D2R = Math.PI / 180;

const VS = `#version 300 es
in vec2 p; out vec2 vUv;
void main(){ vUv = p; gl_Position = vec4(p, 0., 1.); }`;

const FS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform vec2 uRes; uniform vec3 uCam, uFwd, uRight, uUp; uniform float uTan;
uniform vec3 uSun; uniform float uTime, uHeat, uDetail, uFog, uExp, uSpeed;
uniform sampler2D uDay, uNight, uCloud, uSpec, uR1, uR2;
uniform vec4 uB1, uB2; uniform vec2 uRA;
const float PI = 3.14159265;

float h31(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vn(vec3 x){
  vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p){ float a = .5, s = 0.; for (int i = 0; i < 5; i++){ s += a * vn(p); p = p * 2.03 + 17.1; a *= .5; } return s; }
vec2 sph(vec3 ro, vec3 rd, float r){ float b = dot(ro, rd), c = dot(ro, ro) - r * r, d = b * b - c; if (d < 0.) return vec2(-1.); d = sqrt(d); return vec2(-b - d, -b + d); }
vec2 ll(vec3 n){ return vec2(asin(clamp(n.y, -1., 1.)), atan(n.x, n.z)); }   // lat, lon (radians)
vec2 uvOf(vec2 a){ return vec2(a.y / (2. * PI) + .5, a.x / PI + .5); }

vec3 stars(vec3 d){
  vec3 c = vec3(0.);
  for (int k = 0; k < 2; k++){
    float sc = k == 0 ? 80. : 190.;
    vec3 p = d * sc, id = floor(p); float r = h31(id);
    if (r > .962){
      vec3 off = (vec3(h31(id + 1.1), h31(id + 2.2), h31(id + 3.3)) - .5) * .6;
      float s = smoothstep(.10, 0., length(fract(p) - .5 - off)) * (.35 + .65 * h31(id + 7.7)) * (r - .962) * 46.;
      c += mix(vec3(.65,.78,1.), vec3(1.,.82,.62), h31(id + 4.4)) * s;
    }
  }
  float band = exp(-pow(dot(d, normalize(vec3(.35, .85, -.4))) * 3.4, 2.));
  c += vec3(.42,.48,.72) * pow(fbm(d * 5. + 3.), 2.4) * band * .75 + vec3(.5,.55,.8) * band * .035;
  return c;
}

vec3 regionBlend(vec3 base, sampler2D tex, vec4 b, float a, vec2 ln){
  vec2 q = (ln - b.xy) / (b.zw - b.xy);
  vec2 e = smoothstep(vec2(0.), vec2(.06), q) * (1. - smoothstep(vec2(.94), vec2(1.), q));
  return mix(base, texture(tex, q).rgb, e.x * e.y * a);
}

void main(){
  float asp = uRes.x / uRes.y;
  vec3 rd = normalize(uFwd + (vUv.x * asp * uRight + vUv.y * uUp) * uTan);
  vec3 ro = uCam, sun = normalize(uSun);
  float b = dot(ro, rd);
  vec3 col = stars(rd);

  vec2 t = sph(ro, rd, 1.);
  vec3 atmCol = vec3(.22,.5,1.);

  if (t.x > 0.){
    vec3 p = ro + rd * t.x, n = normalize(p);
    vec2 a = ll(n), uv = uvOf(a), deg = vec2(a.y, a.x) / (PI / 180.);      // (lon, lat) in degrees
    vec3 day = texture(uDay, uv).rgb;
    day = regionBlend(day, uR1, uB1, uRA.x, deg);
    day = regionBlend(day, uR2, uB2, uRA.y, deg);
    float spec = texture(uSpec, uv).r, land = 1. - spec;
    float fine = fbm(n * 1400.) - .5, mid = fbm(n * 260.) - .5;
    day *= 1. + (fine * .55 + mid * .6) * uDetail * (.35 + land);          // ground texture that does not exist in the 2k map
    float sf = dot(n, sun), light = clamp(sf, 0., 1.), dm = smoothstep(-.1, .2, sf);
    vec3 tint = mix(vec3(1.), vec3(1.55,.78,.42), smoothstep(.5, 0., sf) * step(-.12, sf));
    vec3 surf = day * tint * (.035 + 1.3 * pow(light, .75));
    vec3 r = reflect(rd, n);
    surf += vec3(1.,.82,.6) * pow(max(dot(r, sun), 0.), 70.) * spec * 1.6 * dm;
    vec3 nl = texture(uNight, uv).rgb;
    surf += (1. - dm) * (nl * vec3(1.,.72,.42) * 2.4 + day * vec3(.006,.012,.03));
    col = surf;
    float fres = pow(1. - max(dot(n, -rd), 0.), 3.2);
    col += atmCol * mix(vec3(1.), vec3(1.6,.8,.5), smoothstep(.3, -.05, sf)) * fres * smoothstep(-.2, .4, sf) * 1.1;
  } else if (b < 0.){
    vec3 q = ro + rd * (-b); float d = length(q) - 1.;                      // how far the ray skims above the ground
    float lit = smoothstep(-.3, .4, dot(normalize(q), sun));
    vec3 ac = mix(atmCol, vec3(1.,.55,.25), smoothstep(.35, -.1, dot(normalize(q), sun)) * .7);
    col += ac * (exp(-d * 230.) * 1.5 + exp(-d * 38.) * .22) * lit;
  }

  // the cloud shell: a little above the ground, so it slides over it as you drop
  float Rc = 1.0030; vec2 tc = sph(ro, rd, Rc);
  if (tc.x > 0.){
    vec3 cn = normalize(ro + rd * tc.x); vec2 ca = ll(cn);
    vec2 warp = (vec2(fbm(cn * 55.), fbm(cn * 55. + 9.)) - .5) * .014;
    float dens = textureLod(uCloud, uvOf(ca) + warp, 2.4).r;
    dens += (fbm(cn * 90.) - .5) * .5;
    float d1 = fbm(cn * 70. + vec3(uTime * .004, 0., 0.)), d2 = fbm(cn * 480.), d3 = fbm(cn * 2200.);
    dens += ((d1 - .5) * .55 + (d2 - .5) * .75 + (d3 - .5) * .5) * uDetail;
    dens = mix(dens, dens * .5 + smoothstep(.28, .6, d1 * .5 + d2 * .5 + .35) * .9, clamp(uFog, 0., 1.));
    dens = smoothstep(.14, .82, dens + uFog * .5);
    dens = mix(dens, 1., clamp(uFog, 0., 1.) * .7);
    float sfc = dot(cn, sun), cl = clamp(sfc, 0., 1.);
    vec3 cc = vec3(1.) * (.04 + 1.15 * pow(cl, .65)) * (.78 + .3 * d2);
    cc = mix(cc, cc * vec3(1.45,.8,.5), smoothstep(.4, 0., sfc) * step(-.1, sfc));
    cc *= 1. + uFog * .35;
    cc += vec3(.012,.02,.045) * (1. - smoothstep(-.1, .2, sfc));
    col = mix(col, cc, clamp(dens, 0., 1.) * .96);
  }

  // re-entry: heat at the edges of the lens and streaks rushing past
  vec2 sv = vUv * vec2(asp * .6, .95);
  float rr = length(sv), ang = atan(sv.y, sv.x);
  float streak = pow(vn(vec3(ang * 16., uTime * 5., 0.)), 3.) * pow(rr, 1.4);
  col += vec3(1.,.42,.08) * uHeat * (pow(rr, 2.4) * 1.25 + streak * 1.6);
  col += vec3(1.,.8,.6) * uHeat * pow(max(1. - rr * 1.4, 0.), 3.) * .05;
  // speed lines on the way down, white and thin
  col += vec3(.9,.95,1.) * pow(vn(vec3(ang * 40., uTime * 12., 3.)), 7.) * uSpeed * pow(rr, 1.2) * .9;

  col = 1. - exp(-col * uExp);
  col = pow(col, vec3(.92));
  col *= 1. - .35 * smoothstep(.55, 1.5, length(vUv * vec2(asp * .55, .9)));
  col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - .5) / 255.;
  o = vec4(col, 1.);
}`;

const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm3 = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const dirOf = (lat, lon) => [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)];

// sharper NASA GIBS Blue Marble tiles (public domain, saved in public/freefall-story/earth) for the last stretch of the dive; the globe works without them
export const REGION1 = [62, 2, 98, 40];      // India and its seas
export const REGION2 = [77.4, 10, 81.4, 14.2]; // Tamil Nadu coast, Chennai

export function createEarth(canvas, base, { maxDpr = 1.5, regions = true, hold = false, scale: scale0 = 1, adaptive = false, minScale = 0.45 } = {}) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const U = {}; const u = (n) => (U[n] ??= gl.getUniformLocation(prog, n));
  let prog = null;
  // (re)builds the program + the full-screen triangle: called once now, and again if the GPU drops the context (phones do that under memory pressure)
  const buildProgram = () => {
    const pr = gl.createProgram();
    try {
      gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
      gl.bindAttribLocation(pr, 0, 'p'); gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    } catch (e) { console.warn('[earth]', e.message); return false; }
    prog = pr;
    for (const k in U) delete U[k];
    gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    return true;
  };
  if (!buildProgram()) return null;

  const E = { ready: false, regionAlpha: [0, 0], dead: false, lost: false, dirty: true };
  const texs = [];   // every texture + the image it holds, so a lost context can be rebuilt without fetching anything again
  let loaded = 0; const NEED = 4;

  const units = { uDay: 0, uNight: 1, uCloud: 2, uSpec: 3, uR1: 4, uR2: 5 };
  const mkTex = (unit, mip) => {
    const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    gl.uniform1i(u(Object.keys(units).find((k) => units[k] === unit)), unit);
    return t;
  };
  const upload = (tex, unit, img, mip) => {
    gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    if (mip) gl.generateMipmap(gl.TEXTURE_2D);
  };
  const upQ = []; let upBusy = false, held = hold;
  // `hold`: textures are fetched and decoded straight away, but the main-thread GPU uploads wait until E.release() (the loader's name is being written first)
  const pumpUp = () => {
    if (held || upBusy || !upQ.length) return; upBusy = true;
    requestAnimationFrame(() => { const job = upQ.shift(); try { if (!E.dead) job(); } catch (e) { /* ignore */ } setTimeout(() => { upBusy = false; pumpUp(); }, 120); });
  };
  const load = (url, unit, mip, done, cors) => {
    const rec = { unit, mip, tex: mkTex(unit, mip), img: null }, img = new Image();
    texs.push(rec);
    if (cors) img.crossOrigin = 'anonymous';
    // decode off the main thread first, then upload one texture per spaced-out frame: a 2048px upload + mipmaps is a 30-80 ms hitch, and four of them
    // (or the sharper regional tiles landing mid-descent) used to arrive together
    img.onload = () => {
      const go = () => { if (E.dead) return; upQ.push(() => { if (E.lost) { rec.img = img; done && done(); return; } upload(rec.tex, unit, img, mip); rec.img = img; E.dirty = true; done && done(); }); pumpUp(); };
      if (img.decode) img.decode().then(go, go); else go();
    };
    img.onerror = () => {};
    img.src = url;
  };
  const tick = () => { if (++loaded >= NEED) E.ready = true; };
  load(base + 'earth/earth_atmos_2048.jpg', 0, false, tick);
  load(base + 'earth/earth_lights_2048.png', 1, false, tick);
  load(base + 'earth/earth_clouds_1024.png', 2, true, tick);
  load(base + 'earth/earth_specular_2048.jpg', 3, false, tick);
  texs.push({ unit: 4, mip: true, tex: mkTex(4, true), img: null }, { unit: 5, mip: true, tex: mkTex(5, true), img: null });
  gl.uniform4f(u('uB1'), ...REGION1); gl.uniform4f(u('uB2'), ...REGION2);
  if (regions) {
    // the sharper tiles are a bonus: they start loading once the globe is on screen and fade in when they land
    E.loadRegions = () => {
      if (E.regionsAsked) return; E.regionsAsked = true;
      load(base + 'earth/india.jpg', 4, true, () => { E.regionAlpha[0] = 0.001; });
      load(base + 'earth/tamil.jpg', 5, true, () => { E.regionAlpha[1] = 0.001; });
    };
  } else E.loadRegions = () => { E.regionsAsked = true; };   // phones skip the sharper tiles: two more big uploads mid-fall for detail a phone screen cannot show

  let scale = scale0, slow = 0, ema = 0, lastDraw = 0, lastKey = '';

  E.resize = () => {
    const d = Math.min(devicePixelRatio || 1, maxDpr) * scale;
    const w = Math.max(2, Math.round(canvas.clientWidth * d)), h = Math.max(2, Math.round(canvas.clientHeight * d));
    if (w !== canvas.width || h !== canvas.height) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); E.dirty = true; }
  };

  // s: { lat, lon (deg), h (km), tilt (deg), roll (deg), fov (deg), heat, fog, detail, speed, exp, time }
  const rA = [0, 0];
  E.release = () => { held = false; pumpUp(); };
  E.invalidate = () => { E.dirty = true; };
  E.draw = (s) => {
    if (E.dead || E.lost) return;
    // adaptive resolution (phones): the planet shader is per-pixel, so when frames run slow it renders at a lower resolution instead of stuttering. It only ever steps down.
    if (adaptive) {
      const now = performance.now();
      if (lastDraw && now - lastDraw < 100) {
        ema = ema ? ema * 0.9 + (now - lastDraw) * 0.1 : now - lastDraw;
        slow = ema > 27 ? slow + 1 : 0;
        if (slow > 40 && scale > minScale) { scale = Math.max(minScale, scale * 0.82); slow = 0; ema = 0; E.resize(); }
      }
      lastDraw = now;
    }
    for (let i = 0; i < 2; i++) { rA[i] = E.regionAlpha[i] > 0 ? Math.min(1, rA[i] + 0.02) : 0; }
    // nothing changed (the visitor is not scrolling): keep the picture on screen instead of re-running the shader for an identical frame
    if (!(s.heat > 0) && !(s.speed > 0)) {
      const key = [s.lat, s.lon, s.tilt, s.roll, s.fov, s.h].map((v) => Math.round((v || 0) * 100)).join() + '|' + [s.fog, s.detail, rA[0], rA[1]].map((v) => Math.round((v || 0) * 1000)).join() + '|' + Math.floor((s.time || 0) * 4);
      if (!E.dirty && key === lastKey) return;
      lastKey = key;
    } else lastKey = '';
    E.dirty = false;
    const lat = s.lat * D2R, lon = s.lon * D2R, tilt = s.tilt * D2R;
    const dir = dirOf(lat, lon), east = [Math.cos(lon), 0, -Math.sin(lon)], north = cross(dir, east);
    const fwd = norm3([-dir[0] * Math.cos(tilt) + north[0] * Math.sin(tilt), -dir[1] * Math.cos(tilt) + north[1] * Math.sin(tilt), -dir[2] * Math.cos(tilt) + north[2] * Math.sin(tilt)]);
    // 'up' on screen: north when looking down, local up when looking at the horizon
    const k = Math.sin(tilt);
    const ref = norm3([dir[0] * k + north[0] * (1 - k), dir[1] * k + north[1] * (1 - k), dir[2] * k + north[2] * (1 - k)]);
    let right = norm3(cross(fwd, ref)), up = cross(right, fwd);
    const rl = (s.roll || 0) * D2R, c = Math.cos(rl), sn = Math.sin(rl);
    const r2 = [right[0] * c + up[0] * sn, right[1] * c + up[1] * sn, right[2] * c + up[2] * sn];
    const u2 = [up[0] * c - right[0] * sn, up[1] * c - right[1] * sn, up[2] * c - right[2] * sn];
    const dist = 1 + s.h / R_KM;
    gl.uniform2f(u('uRes'), canvas.width, canvas.height);
    gl.uniform3f(u('uCam'), dir[0] * dist, dir[1] * dist, dir[2] * dist);
    gl.uniform3fv(u('uFwd'), fwd); gl.uniform3fv(u('uRight'), r2); gl.uniform3fv(u('uUp'), u2);
    gl.uniform1f(u('uTan'), Math.tan((s.fov * D2R) / 2));
    // sunrise over India: the sun sits to the east, low, so the light is golden and the night side shows its cities
    gl.uniform3fv(u('uSun'), norm3(dirOf(8 * D2R, 128 * D2R)));
    gl.uniform1f(u('uTime'), s.time || 0); gl.uniform1f(u('uHeat'), s.heat || 0);
    gl.uniform1f(u('uDetail'), s.detail || 0); gl.uniform1f(u('uFog'), s.fog || 0);
    gl.uniform1f(u('uExp'), s.exp || 1.15); gl.uniform1f(u('uSpeed'), s.speed || 0);
    gl.uniform2f(u('uRA'), rA[0], rA[1]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); E.lost = true; });
  canvas.addEventListener('webglcontextrestored', () => {
    for (const k in U) delete U[k];
    if (!buildProgram()) return;
    gl.uniform4f(u('uB1'), ...REGION1); gl.uniform4f(u('uB2'), ...REGION2);
    for (const r of texs) { r.tex = mkTex(r.unit, r.mip); if (r.img) upload(r.tex, r.unit, r.img, r.mip); }
    gl.viewport(0, 0, canvas.width, canvas.height);
    E.lost = false; E.dirty = true;
  });
  E.destroy = () => { E.dead = true; const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); };
  return E;
}
