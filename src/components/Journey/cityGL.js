/*
  3D "model city": Chennai downtown -> GST Road flight -> SRM campus.
  Procedural, instanced boxes + an emissive ground plane, rendered with WebGL2.
  World: 1 unit ~ a few metres (miniature). +z runs from Chennai (z=0) down GST Road to the campus (z~1400).
  The sea is on +x (the left when flying down the road).
*/
import { NOISE } from "./glUtil.js";

/* ---------- tiny math ---------- */
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
function persp(fovy, asp, n, f) {
  const t = 1 / Math.tan(fovy / 2);
  return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, (2 * f * n) / (n - f), 0];
}
function lookAt(e, c, up) {
  const f = norm(sub(c, e)), s = norm(cross(f, up)), u = cross(s, f);
  return [s[0], u[0], -f[0], 0, s[1], u[1], -f[1], 0, s[2], u[2], -f[2], 0, -dot(s, e), -dot(u, e), dot(f, e), 1];
}
function mul(a, b) {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
}
const lerp = (a, b, t) => a + (b - a) * t;
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function rng(seed) { let s = seed >>> 0; return () => ((s = (s + 0x6d2b79f5) >>> 0), ((t) => ((t = Math.imul(t ^ (t >>> 15), t | 1)), (t ^= t + Math.imul(t ^ (t >>> 7), t | 61)), ((t ^ (t >>> 14)) >>> 0) / 4294967296))(s)); }

/* ---------- the world ---------- */
const CAMPUS = { x0: -312, x1: -8, z0: 1296, z1: 1526, cx: -160, cz: 1411 };
const coastX = (z) => 260 + 0.45 * z;
export function dens(x, z) {
  let d = Math.exp(-Math.max(z, 0) / 330) * Math.exp(-Math.pow((x - 50) / (300 + z * 0.2), 2));
  d += 0.5 * Math.exp(-Math.pow((z - 520) / 80, 2) - Math.pow(x / 200, 2));
  d += 0.28 * Math.exp(-Math.pow((z - 1250) / 70, 2) - Math.pow((x + 10) / 140, 2));
  if (z < 0) d *= Math.exp(z / 120);
  return d;
}
const inCampus = (x, z, m = 0) => x > CAMPUS.x0 - m && x < CAMPUS.x1 + m && z > CAMPUS.z0 - m && z < CAMPUS.z1 + m;

function buildWorld() {
  const R = rng(7);
  const out = []; // cx,cz,w,d,h,seed,kind,delay
  const add = (cx, cz, w, d, h, kind, seed) => out.push(cx, cz, w, d, h, seed ?? R(), kind, R());
  const rects = [];

  // ---- campus (hand placed)
  const camp = [
    // [cx, cz, w, d, h, kind]
    [-90, 1478, 36, 36, 70, 1], [-90, 1478, 62, 46, 14, 1], // tech park tower + podium
    [-218, 1405, 24, 112, 30, 0], [-168, 1405, 24, 112, 30, 0], [-193, 1405, 40, 20, 30, 0], // university building (H)
    [-70, 1375, 54, 46, 38, 1], // hospital / medical college
    [-120, 1330, 34, 26, 22, 1], // library
  ];
  for (let i = 0; i < 6; i++) camp.push([-285 + i * 38, 1340, 18, 62, 24, 0]); // hostels
  for (let i = 0; i < 4; i++) camp.push([-110 + i * 30, 1440, 14, 26, 18, 0]); // faculty blocks
  camp.forEach(([cx, cz, w, d, h, k]) => { add(cx, cz, w, d, h, k); rects.push([cx - w / 2 - 3, cz - d / 2 - 3, cx + w / 2 + 3, cz + d / 2 + 3]); });
  // stadium stands
  [[-205, 1455, 70, 5, 8], [-205, 1535 - 40, 70, 5, 8], [-255, 1495, 5, 40, 8], [-155, 1495, 5, 40, 8]].forEach(([cx, cz, w, d, h]) => add(cx, cz, w, d, h, 0));
  // main gate
  add(-12, 1405, 4, 4, 18, 5); add(-12, 1435, 4, 4, 18, 5); add(-12, 1420, 5, 36, 3, 5);

  // ---- city blocks
  const CELL = 30;
  for (let i = -18; i <= 18; i++) {
    for (let j = -5; j <= 52; j++) {
      const x = i * CELL, z = j * CELL;
      if (Math.abs(x) < 14) continue;
      if (inCampus(x, z, 12)) continue;
      if (x > coastX(z) - 36) continue;
      const lakeD = Math.hypot((x + 255) / 70, (z - 1318) / 40);
      if (lakeD < 1.2) continue;
      const p = Math.min(1, dens(x, z) * 1.15);
      if (R() > p + 0.035) continue;
      const n = p > 0.5 ? 2 : 1;
      for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
        if (n > 1 && R() < 0.15) continue;
        const s = 24 / n;
        const w = s * (0.55 + R() * 0.4), d = s * (0.55 + R() * 0.4);
        const cx = x - 12 + s * (a + 0.5) + (R() - 0.5) * 2, cz = z - 12 + s * (b + 0.5) + (R() - 0.5) * 2;
        let h = 4 + R() * 9 + Math.pow(p, 1.2) * Math.pow(R(), 1.6) * 70;
        let kind = p > 0.5 && R() < 0.55 ? 1 : 0;
        if (p > 0.4 && R() < 0.1) { h += 40 + R() * 90 * p; kind = 2; }
        add(cx, cz, w, d, h, kind);
      }
    }
  }
  // downtown landmarks
  const towers = [[10, 70, 22, 150], [60, 40, 20, 125], [-30, 120, 24, 138], [95, 105, 18, 110], [-10, 20, 20, 118], [130, 60, 18, 96], [30, 160, 22, 104], [-70, 70, 20, 112]];
  towers.forEach(([cx, cz, w, h]) => add(cx, cz, w, w, h, 2));
  add(55, 150, 90, 26, 16, 0); add(80, 150, 10, 10, 46, 4); // Chennai Central + clock tower
  add(262, 24, 5, 5, 74, 4); // lighthouse
  // road-side shops
  for (let z = -60; z < 1500; z += 22) {
    const p = Math.min(1, dens(0, z) * 1.5);
    for (const sx of [-1, 1]) if (R() < 0.35 + p * 0.5 && !inCampus(sx * 20, z, 6)) add(sx * (17 + R() * 3), z + R() * 8, 8 + R() * 6, 12 + R() * 8, 5 + R() * 8 + p * 20, 0);
  }

  // ---- trees on campus
  const treeCount = 520;
  for (let t = 0; t < treeCount; t++) {
    const x = lerp(CAMPUS.x0 + 6, CAMPUS.x1 - 6, R()), z = lerp(CAMPUS.z0 + 6, CAMPUS.z1 - 6, R());
    if (rects.some((r) => x > r[0] && x < r[2] && z > r[1] && z < r[3])) continue;
    if (Math.hypot((x + 255) / 70, (z - 1318) / 40) < 1.15) continue;
    if (Math.hypot((x + 205) / 58, (z - 1495) / 40) < 1) continue;
    const gx = ((x - CAMPUS.x0) % 38 + 38) % 38; if (gx < 5 || gx > 33) continue; // keep roads clear
    add(x, z, 3 + R() * 2, 3 + R() * 2, 4 + R() * 5, 3);
  }
  return new Float32Array(out);
}

/* ---------- camera path ---------- */
const KEYS = [
  // p, eye, target
  [0.4, [-40, 560, -420], [30, 0, 110]],
  [0.46, [-30, 230, -150], [35, 10, 150]],
  [0.5, [30, 95, -10], [20, 30, 260]],
  [0.55, [10, 70, 330], [0, 14, 760]],
  [0.6, [-10, 62, 800], [-30, 12, 1180]],
  [0.64, [-155, 130, 1150], [CAMPUS.cx, 15, CAMPUS.cz]],
];
export function cityCam(p) {
  let e, t;
  if (p <= KEYS[0][0]) { e = KEYS[0][1]; t = KEYS[0][2]; }
  else if (p >= 0.64) {
    const u = Math.min(1, (p - 0.64) / 0.14);
    const a = lerp(0, 2.3, u), r = lerp(260, 165, u), h = lerp(130, 72, u);
    e = [CAMPUS.cx + r * Math.sin(a), h, CAMPUS.cz - r * Math.cos(a)];
    t = [CAMPUS.cx + lerp(0, 12, u), lerp(15, 22, u), CAMPUS.cz + lerp(0, 25, u)];
    if (p > 0.78) {
      // final dive: fly straight into the tech-park tower
      let d = Math.min(1, (p - 0.78) / 0.07); d = d * d * (3 - 2 * d);
      const e0 = e.slice(), t0 = t.slice();
      const e1 = [-90 + 6, 47, 1478 + 34], t1 = [-90, 47, 1478];
      e = e0.map((v, k) => lerp(v, e1[k], d));
      t = t0.map((v, k) => lerp(v, t1[k], d));
    }
  } else {
    let i = 0;
    while (i < KEYS.length - 2 && p > KEYS[i + 1][0]) i++;
    const a = KEYS[i], b = KEYS[i + 1];
    let u = (p - a[0]) / (b[0] - a[0]);
    u = u * u * (3 - 2 * u) * 0.35 + u * 0.65;
    e = a[1].map((v, k) => lerp(v, b[1][k], u));
    t = a[2].map((v, k) => lerp(v, b[2][k], u));
  }
  return { eye: e, target: t };
}

/* ---------- shaders ---------- */
const DENS_GLSL = `
float dens(vec2 w){
  float z = w.y;
  float d = exp(-max(z,0.)/330.) * exp(-pow((w.x-50.)/(300.+z*.2),2.));
  d += .5*exp(-pow((z-520.)/80.,2.) - pow(w.x/200.,2.));
  d += .28*exp(-pow((z-1250.)/70.,2.) - pow((w.x+10.)/140.,2.));
  if(z < 0.) d *= exp(z/120.);
  return d;
}
float coastX(float z){ return 260. + .45*z; }
`;

const BOX_V = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNrm;
layout(location=2) in vec4 iA; // cx,cz,w,d
layout(location=3) in vec4 iB; // h,seed,kind,delay
uniform mat4 uVP; uniform float uBuild; uniform vec2 uFocus; uniform float uTime;
out vec3 vW; out vec3 vN; out vec3 vL; out vec4 vB; out float vH;
void main(){
  float dist = length(vec2(iA.x,iA.y) - uFocus);
  float g = clamp(uBuild*1.9 - dist/900. - iB.w*.25, 0., 1.);
  g = 1. - pow(1.-g, 3.);
  float h = iB.x * g;
  vec3 w = vec3(iA.x + aPos.x*iA.z, (aPos.y+.5)*h, iA.y + aPos.z*iA.w);
  vW = w; vN = aNrm; vL = vec3(aPos.x*iA.z, (aPos.y+.5)*h, aPos.z*iA.w); vB = iB; vH = h;
  gl_Position = uVP * vec4(w,1.);
}`;

const BOX_F = `#version 300 es
precision highp float;
in vec3 vW; in vec3 vN; in vec3 vL; in vec4 vB; in float vH;
uniform vec3 uEye; uniform float uTime; uniform float uA; uniform float uDark; uniform vec2 uFocus;
out vec4 o;
${NOISE}
void main(){
  float kind = vB.z; float seed = vB.y;
  vec3 n = normalize(vN);
  float dist = length(uEye - vW);
  vec3 col = vec3(.020,.028,.046);
  vec3 L = normalize(vec3(-.4,.7,.5));
  col += vec3(.05,.07,.11) * max(dot(n,L),0.);
  float side = 1. - abs(n.y);
  vec3 emis = vec3(0.);
  vec3 warm = vec3(1.,.74,.38), cool = vec3(.62,.86,1.);
  vec3 wc = kind > .5 && kind < 1.5 ? cool : (kind > 1.5 && kind < 2.5 ? mix(cool, warm, step(.6,hash(vec2(seed*77.,1.)))) : warm);
  if(kind > 2.5 && kind < 3.5){            // trees
    col = vec3(.02,.06,.035) * (.6 + .6*hash(vec2(seed*31.,2.)));
    col += vec3(.01,.04,.02) * max(dot(n,L),0.) * 2.;
  } else if(kind > 3.5 && kind < 4.5){      // landmarks: white-ish, lit from within
    col = vec3(.1,.11,.14) + vec3(.04) * max(dot(n,L),0.);
    emis += vec3(1.,.9,.7) * side * (.25 + .15*sin(vW.y*.6));
  } else if(kind > 4.5){                    // gate
    col = vec3(.05,.04,.03); emis += vec3(1.,.8,.4) * 1.1;
  } else if(side > .5){
    vec2 s2 = vec2(abs(n.x) > .5 ? vW.z : vW.x, vW.y);
    float cw = 2.6, ch = 3.2;
    vec2 id = floor(s2/vec2(cw,ch));
    vec2 f = fract(s2/vec2(cw,ch));
    float h = hash(id + seed*91.);
    float thr = kind > 1.5 ? .30 : (kind > .5 ? .38 : .50);
    float lit = step(thr, h);
    float flick = step(.985, hash(id + floor(uTime*.7) + seed));
    float win = step(.16,f.x)*step(f.x,.84)*step(.22,f.y)*step(f.y,.78);
    float wf = smoothstep(700.,220.,dist);
    float avg = (1.-thr)*.8*.4;
    emis += wc * mix(avg, win * (lit*(.55+.5*hash(id.yx+seed*13.)) + flick*.3), wf);
    // floor slabs
    col += vec3(.03,.04,.06) * step(.9, f.y);
  } else {
    // roof
    col += vec3(.02,.025,.035);
    if(vH > 58. && fract(seed*10.) > .3) {  // aviation light
      float b = step(.5, fract(uTime*.8 + seed*5.));
      vec2 c = vL.xz; float rr = length(c) / 6.;
      emis += vec3(1.,.15,.1) * b * smoothstep(1.,.0,rr) * 1.2;
    }
    emis += wc * .04;
  }
  // holographic edge lines (model look)
  vec3 q = abs(vL);
  float hh = vH;
  float ey = min(vL.y, hh - vL.y);
  float ex = 99.;
  // distance to vertical edges: use position fraction inside footprint
  vec3 aN = abs(n);
  float edge = 0.;
  float wpx = fwidth(vW.y)+fwidth(vW.x)+fwidth(vW.z);
  float eT = smoothstep(wpx*1.6, 0., ey);               // top/bottom rim
  edge = eT * (aN.y < .5 ? 1. : 0.);
  float pulse = .5 + .5*sin(uTime*1.6 - length(vW.xz-uFocus)*.02);
  emis += vec3(.25,.75,1.) * edge * (.25+.45*pulse);
  col += emis;
  // fog
  float fogK = 1. - exp(-dist*.0021);
  vec3 fogC = vec3(.03,.045,.08) + vec3(.16,.09,.04) * exp(-max(vW.y,0.)/60.) * .45;
  col = mix(col, fogC, clamp(fogK,0.,1.));
  col *= 1. - uDark;
  o = vec4(col*uA, uA);
}`;

const GROUND_V = `#version 300 es
precision highp float;
layout(location=0) in vec2 aP;
uniform mat4 uVP;
out vec3 vW;
void main(){ vec3 w = vec3(aP.x, 0., aP.y); vW = w; gl_Position = uVP*vec4(w,1.); }`;

const GROUND_F = `#version 300 es
precision highp float;
in vec3 vW;
uniform vec3 uEye; uniform float uTime; uniform float uA; uniform float uDark; uniform float uBuild;
out vec4 o;
${NOISE}
${DENS_GLSL}
const vec4 CAMP = vec4(-312., 1296., -8., 1526.);
void main(){
  vec2 w = vW.xz;
  float dist = length(uEye - vW);
  float d = dens(w);
  float xc = coastX(w.y);
  float wpx = (fwidth(w.x)+fwidth(w.y));
  vec3 gold = vec3(1.,.70,.30), hot = vec3(1.,.92,.75);
  vec3 col = vec3(.016,.024,.040);
  // greenery patches
  float gn = fbm3(w*.012);
  col += vec3(.004,.022,.010) * smoothstep(.42,.7,gn) * (1.-min(d*1.5,1.));
  float sea = smoothstep(xc-3., xc+3., w.x);
  vec3 emis = vec3(0.);

  // street grid
  vec2 g = w/30.;
  vec2 f = abs(fract(g+.5)-.5)*30.;
  vec2 gid = floor(g+.5);
  float keepX = step(.18, hash(vec2(gid.x, floor(w.y/60.))));
  float keepY = step(.18, hash(vec2(gid.y+40., floor(w.x/60.))));
  float lx = (1.-smoothstep(2.2, 3.2+wpx*.7, f.x)) * keepX;
  float ly = (1.-smoothstep(2.2, 3.2+wpx*.7, f.y)) * keepY;
  float st = max(lx,ly);
  float inter = lx*ly;
  float dd = min(d*1.3, 1.);
  emis += mix(gold,hot,.3) * st * (.04 + .9*pow(dd,.8));
  emis += hot * inter * (.05 + .7*dd) * (.6+.4*sin(uTime*2.+hash(gid)*20.));
  // block pads glow (soft)
  emis += gold * dd * .035;

  // GST road with traffic
  float rx = abs(w.x);
  float road = 1. - smoothstep(4.5, 6.5+wpx, rx);
  float lane = w.x > 0. ? 1. : -1.;
  float car = smoothstep(.55,.85, fract(w.y/16. - uTime*.9*lane + hash(vec2(floor(w.y/16.),lane))));
  emis += mix(gold,hot,.5) * road * (.55 + .9*car*step(.0,1.-rx/6.));
  emis += vec3(1.,.2,.15) * road * car * step(0., -lane) * .6;
  emis += gold * exp(-rx*.08) * .08 * smoothstep(1500.,0.,w.y);

  // beach + promenade
  float beach = smoothstep(xc-26., xc-3., w.x) * (1.-sea);
  col = mix(col, vec3(.085,.07,.055), beach*.9);
  float prom = 1. - smoothstep(0., 1.8+wpx, abs(w.x - (xc-30.)));
  float pdots = smoothstep(.4,.7,fract(w.y/10.));
  emis += gold * prom * (.25 + .8*pdots) * smoothstep(900.,0.,w.y);

  // sea
  vec3 seaC = vec3(.004,.016,.04) + vec3(.01,.03,.06)*fbm3(vec2(w.x*.02+uTime*.04, w.y*.02));
  float refl = exp(-(w.x-xc)/110.) * fbm3(vec2(w.x*.012, w.y*.07 + uTime*.15));
  seaC += gold * refl * .45 * (.2 + exp(-max(w.y,0.)/500.));
  float foam = smoothstep(2.5,0.,abs(w.x-xc)) * (.5+.5*sin(w.y*.3 + uTime*1.5));
  seaC += vec3(.5,.7,.8)*foam*.16;
  // ships
  vec2 sc = floor((w - vec2(xc+80.,0.))/90.);
  float ship = step(.93, hash(sc)) * step(xc+60., w.x);
  vec2 sp = fract((w - vec2(xc+80.,0.))/90.) - .5;
  seaC += vec3(1.,.9,.7) * ship * smoothstep(.04,0.,length(sp)) * 1.4;
  col = mix(col, seaC, sea);
  emis *= (1.-sea);

  // ---------------- campus
  if(w.x > CAMP.x-30. && w.x < CAMP.z+10. && w.y > CAMP.y-30. && w.y < CAMP.w+30.){
    float inside = smoothstep(-2.,2., min(min(w.x-CAMP.x, CAMP.z-w.x), min(w.y-CAMP.y, CAMP.w-w.y)));
    col = mix(col, vec3(.012,.034,.022), inside);
    emis *= (1.-inside*.85);
    // internal roads
    vec2 cr = abs(fract((w-CAMP.xy)/38.)-.5)*38.;
    float cl = (1.-smoothstep(1.2,2.2+wpx*.7,min(cr.x,cr.y)));
    emis += vec3(1.,.82,.5) * cl * inside * .5;
    // boundary wall glow
    float bd = min(min(abs(w.x-CAMP.x), abs(CAMP.z-w.x)), min(abs(w.y-CAMP.y), abs(CAMP.w-w.y)));
    emis += vec3(.3,.8,1.) * (1.-smoothstep(0.,1.4+wpx*.8,bd)) * (.6+.4*sin(uTime*2.)) * step(CAMP.x-2.,w.x)*step(w.x,CAMP.z+2.)*step(CAMP.y-2.,w.y)*step(w.y,CAMP.w+2.);
    // stadium
    vec2 so = (w - vec2(-205.,1495.))/vec2(52.,34.);
    float sr = length(so);
    float track = (1.-smoothstep(.0,.05+wpx*.02,abs(sr-.9))) ;
    emis += vec3(1.,.85,.5) * track * 1.1;
    float field = 1. - smoothstep(.82,.86,sr);
    col = mix(col, vec3(.03,.08,.045) * (.8+.2*sin(w.y*.9)), field);
    emis += vec3(.15,.3,.2) * field * .35;
    // lake
    vec2 lo = (w - vec2(-255.,1318.))/vec2(66.,38.);
    float lr = length(lo);
    float lake = 1.-smoothstep(.92,1.0,lr);
    vec3 lc = vec3(.004,.02,.05) + vec3(.02,.08,.12) * fbm3(w*.08 + uTime*.05);
    col = mix(col, lc, lake);
    emis *= (1.-lake);
    emis += vec3(.25,.65,.9) * (1.-smoothstep(0.,.05,abs(lr-.97))) * .8;
    emis += vec3(1.,.8,.5) * lake * .02;
  }

  col += emis;
  float fogK = 1. - exp(-dist*.0021);
  vec3 fogC = vec3(.03,.045,.08) + vec3(.16,.09,.04) * .35;
  col = mix(col, fogC, clamp(fogK,0.,1.));
  col *= 1. - uDark;
  o = vec4(col*uA, uA);
}`;

const SKY_F = `#version 300 es
precision highp float;
uniform vec2 uRes; uniform float uHoriz; uniform float uA; uniform float uTime; uniform float uDark;
out vec4 o;
${NOISE}
void main(){
  vec2 p = gl_FragCoord.xy/uRes;
  float y = p.y*2.-1.;
  float d = y - uHoriz;
  vec3 c = mix(vec3(.012,.018,.04), vec3(.04,.06,.13), smoothstep(-.2,1.4,d));
  c += vec3(.35,.17,.07) * exp(-abs(d)*3.2) * (d < 0. ? 1. : .8) * .8;
  vec2 g = (gl_FragCoord.xy)/uRes.y*70.; vec2 id = floor(g);
  float h = hash(id);
  if(h > .975 && d > .05){ vec2 f = fract(g)-.5; c += vec3(.8,.9,1.) * smoothstep(.12,.0,length(f)) * (.5+.5*sin(uTime*2.+h*50.)) * .8 * smoothstep(.05,.4,d); }
  c *= 1. - uDark;
  o = vec4(c*uA, uA);
}`;

function compile(gl, vs, fs) {
  const mk = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(sh), "\n", s.split("\n").map((l, i) => `${i + 1}: ${l}`).join("\n")); return null; } return sh; };
  const v = mk(gl.VERTEX_SHADER, vs), f = mk(gl.FRAGMENT_SHADER, fs);
  if (!v || !f) return null;
  const p = gl.createProgram();
  gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(p)); return null; }
  const uni = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); uni[info.name] = gl.getUniformLocation(p, info.name); }
  return { p, uni };
}

/* unit box with normals */
function boxGeo() {
  const P = [], N = [], I = [];
  const faces = [
    [[1, 0, 0], [[.5, -.5, -.5], [.5, .5, -.5], [.5, .5, .5], [.5, -.5, .5]]],
    [[-1, 0, 0], [[-.5, -.5, .5], [-.5, .5, .5], [-.5, .5, -.5], [-.5, -.5, -.5]]],
    [[0, 1, 0], [[-.5, .5, -.5], [-.5, .5, .5], [.5, .5, .5], [.5, .5, -.5]]],
    [[0, 0, 1], [[.5, -.5, .5], [.5, .5, .5], [-.5, .5, .5], [-.5, -.5, .5]]],
    [[0, 0, -1], [[-.5, -.5, -.5], [-.5, .5, -.5], [.5, .5, -.5], [.5, -.5, -.5]]],
  ];
  faces.forEach(([n, vs], f) => { vs.forEach((v) => { P.push(...v); N.push(...n); }); const b = f * 4; I.push(b, b + 1, b + 2, b, b + 2, b + 3); });
  return { P: new Float32Array(P), N: new Float32Array(N), I: new Uint16Array(I) };
}

export function createCity(gl) {
  const box = compile(gl, BOX_V, BOX_F);
  const ground = compile(gl, GROUND_V, GROUND_F);
  const sky = compile(gl, `#version 300 es\nin vec2 a; void main(){ gl_Position = vec4(a,0.,1.); }`, SKY_F);
  if (!box || !ground || !sky) return null;

  const inst = buildWorld();
  const count = inst.length / 8;
  const geo = boxGeo();

  // box VAO
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const mkBuf = (data, target = gl.ARRAY_BUFFER) => { const b = gl.createBuffer(); gl.bindBuffer(target, b); gl.bufferData(target, data, gl.STATIC_DRAW); return b; };
  mkBuf(geo.P); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  mkBuf(geo.N); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
  mkBuf(inst);
  gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 32, 0); gl.vertexAttribDivisor(2, 1);
  gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 32, 16); gl.vertexAttribDivisor(3, 1);
  mkBuf(geo.I, gl.ELEMENT_ARRAY_BUFFER);

  // ground VAO
  const gvao = gl.createVertexArray();
  gl.bindVertexArray(gvao);
  mkBuf(new Float32Array([-4000, -2500, 4000, -2500, -4000, 4500, 4000, -2500, 4000, 4500, -4000, 4500]));
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  // sky VAO
  const svao = gl.createVertexArray();
  gl.bindVertexArray(svao);
  mkBuf(new Float32Array([-1, -1, 3, -1, -1, 3]));
  const sl = gl.getAttribLocation(sky.p, "a");
  gl.enableVertexAttribArray(sl); gl.vertexAttribPointer(sl, 2, gl.FLOAT, false, 0, 0);

  let vp = null, last = { eye: [0, 0, 0] };

  return {
    state(p) {
      return {
        alpha: sm(0.395, 0.445, p),
        build: sm(0.4, 0.5, p),
        dark: 0.5 * sm(0.8, 0.86, p),
      };
    },
    draw(w, h, p, t) {
      const st = this.state(p);
      const cam = cityCam(p);
      const asp = w / h;
      const proj = persp((p > 0.64 ? 58 : 54) * Math.PI / 180, asp, 1, 6000);
      const view = lookAt(cam.eye, cam.target, [0, 1, 0]);
      vp = mul(proj, view);
      last = { eye: cam.eye, target: cam.target };
      // horizon in ndc: project a far point straight ahead at eye height
      const f = norm([cam.target[0] - cam.eye[0], 0, cam.target[2] - cam.eye[2]]);
      const far = [cam.eye[0] + f[0] * 4000, 0, cam.eye[2] + f[2] * 4000];
      const c = this.proj(far[0], far[1], far[2]);
      const horiz = c ? c.ny : 0.5;

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.disable(gl.DEPTH_TEST);
      gl.depthMask(true);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      // sky
      gl.useProgram(sky.p); gl.bindVertexArray(svao);
      gl.uniform2f(sky.uni.uRes, w, h); gl.uniform1f(sky.uni.uHoriz, horiz); gl.uniform1f(sky.uni.uA, st.alpha);
      gl.uniform1f(sky.uni.uTime, t); gl.uniform1f(sky.uni.uDark, st.dark);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
      // ground
      gl.useProgram(ground.p); gl.bindVertexArray(gvao);
      gl.uniformMatrix4fv(ground.uni.uVP, false, vp);
      gl.uniform3fv(ground.uni.uEye, cam.eye); gl.uniform1f(ground.uni.uTime, t);
      gl.uniform1f(ground.uni.uA, st.alpha); gl.uniform1f(ground.uni.uDark, st.dark); gl.uniform1f(ground.uni.uBuild, st.build);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      // buildings
      gl.useProgram(box.p); gl.bindVertexArray(vao);
      gl.uniformMatrix4fv(box.uni.uVP, false, vp);
      gl.uniform3fv(box.uni.uEye, cam.eye); gl.uniform1f(box.uni.uTime, t);
      gl.uniform1f(box.uni.uA, st.alpha); gl.uniform1f(box.uni.uDark, st.dark); gl.uniform1f(box.uni.uBuild, st.build);
      gl.uniform2f(box.uni.uFocus, cam.target[0], cam.target[2]);
      gl.drawElementsInstanced(gl.TRIANGLES, 30, gl.UNSIGNED_SHORT, 0, count);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
    },
    /** world -> screen. returns {x,y (css-relative 0..1), nx,ny (ndc), z (clip w>0)} or null */
    proj(x, y, z) {
      if (!vp) return null;
      const cx = vp[0] * x + vp[4] * y + vp[8] * z + vp[12];
      const cy = vp[1] * x + vp[5] * y + vp[9] * z + vp[13];
      const cw = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
      if (cw <= 0.5) return null;
      return { nx: cx / cw, ny: cy / cw, x: (cx / cw) * 0.5 + 0.5, y: 0.5 - (cy / cw) * 0.5, w: cw };
    },
    eye: () => last.eye,
  };
}

/* things the HUD labels point at: [text, [x,y,z], p-start, p-end, side] */
export const CITY_LABELS = [
  ["CHENNAI CENTRAL", [55, 24, 150], 0.43, 0.51, 1],
  ["MARINA BEACH", [292, 6, 90], 0.43, 0.51, -1],
  ["LIGHTHOUSE", [262, 74, 24], 0.43, 0.5, -1],
  ["CBD · 150 M TOWERS", [10, 150, 70], 0.44, 0.51, 1],
  ["GST ROAD · NH 32", [0, 6, 330], 0.5, 0.58, 1],
  ["TAMBARAM", [0, 30, 520], 0.52, 0.6, -1],
  ["POTHERI", [0, 20, 1240], 0.57, 0.65, 1],
  ["MAIN GATE · GST RD", [-12, 18, 1420], 0.63, 0.78, -1],
  ["TECH PARK", [-90, 70, 1478], 0.65, 0.78, 1],
  ["UNIVERSITY BUILDING", [-193, 30, 1405], 0.65, 0.78, -1],
  ["HOSTELS", [-250, 24, 1340], 0.66, 0.78, 1],
  ["STADIUM", [-205, 8, 1495], 0.67, 0.78, -1],
  ["SRM LAKE", [-255, 1, 1318], 0.68, 0.78, 1],
];
export { CAMPUS };
