// Realistic-ish 3D scene: a procedural pastoral landscape (sky, clouds, god rays, hills, meadow, lake, marble columns) with two
// raymarched hands (smooth-blended capsule rigs, skin / glossy-AI shading) that reach and finally shake. One WebGL2 pass.
const TAU = Math.PI * 2;
const D2R = Math.PI / 180;

const VS = `#version 300 es
void main(){ vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2); gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;

const FS = `#version 300 es
precision highp float;
out vec4 oCol;
uniform vec2 uRes; uniform float uTime, uTension, uCalm, uP, uHv;
uniform vec3 uCam; uniform vec2 uMouse; uniform float uDbg, uDream, uHasTex; uniform sampler2D uTex;
uniform vec4 uC[84];          // 2 x 21 capsules x (A,B)
uniform vec4 uCuff[4];        // sleeves: [0,1] white cuff of the right hand, [2,3] dark jacket sleeve of the left hand
uniform vec4 uBB[4];          // per-hand bounding capsule (A.xyz r, B.xyz r)

// ---------------------------------------------------------------- noise
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float a = 0.5, s = 0.0; for(int i=0;i<5;i++){ s += a*vn(p); p = p*2.03 + 7.1; a *= 0.5; } return s; }

// ---------------------------------------------------------------- sky / environment
const vec2 SUN = vec2(0.80, 0.90);
vec3 skyEnv(vec3 d){
  float y = clamp(d.y, -0.2, 1.0);
  vec3 hor = vec3(0.80, 0.88, 0.92), zen = vec3(0.30, 0.55, 0.86);
  vec3 c = mix(hor, zen, pow(smoothstep(-0.05, 0.9, y), 0.7));
  vec3 sd = normalize(vec3(0.55, 0.72, 0.42));
  float s = max(dot(d, sd), 0.0);
  c += vec3(1.0, 0.92, 0.78) * (pow(s, 6.0) * 0.55 + pow(s, 60.0) * 1.4);
  c = mix(c, vec3(0.38, 0.50, 0.30), smoothstep(0.0, -0.18, d.y));
  return c;
}

// ---------------------------------------------------------------- landscape
vec3 columnShade(vec2 q, float cx, float side){
  // q in height units (y up). returns rgb + alpha in a vec4
  return vec3(0.0);
}
vec4 column(vec2 q, float cx, float baseY, float topY, float w){
  float dx = q.x - cx;
  float inBody = step(abs(dx), w) * step(baseY, q.y) * step(q.y, topY);
  // capital: wider slab + two volutes
  float cap = step(abs(dx), w * 1.55) * step(topY, q.y) * step(q.y, topY + w * 0.55);
  float vol = 0.0;
  for (int k = 0; k < 2; k++) { float sx = k == 0 ? -1.0 : 1.0; vec2 v = vec2(dx - sx * w * 1.25, q.y - (topY - w * 0.02)); vol = max(vol, step(length(v), w * 0.62)); }
  float base = step(abs(dx), w * 1.35) * step(baseY - w * 0.35, q.y) * step(q.y, baseY);
  float m = max(max(inBody, cap), max(vol, base));
  float u = dx / w;
  float flute = 0.5 + 0.5 * cos(u * 9.4);
  float lit = clamp(0.62 + 0.38 * (u * 0.9) + 0.2 * (flute - 0.5), 0.0, 1.0);
  vec3 stone = mix(vec3(0.55, 0.52, 0.50), vec3(0.97, 0.94, 0.88), lit);
  stone *= 0.86 + 0.28 * fbm(vec2(q.x * 40.0, q.y * 9.0));
  // pink blossom stains
  stone = mix(stone, vec3(0.78, 0.36, 0.40), 0.35 * smoothstep(0.7, 0.9, fbm(q * 22.0)) * inBody);
  float shade = mix(1.0, 0.72 + 0.28 * smoothstep(baseY, topY, q.y), inBody);
  return vec4(stone * shade, m);
}

vec3 landscape(vec2 uv, float a){
  if (uHasTex > 0.5) { vec2 tuv = (uv - 0.5) / 1.06 + 0.5 + uMouse * 0.006; return texture(uTex, vec2(tuv.x, tuv.y)).rgb; }
  vec2 q = vec2((uv.x - 0.5) * a, uv.y);
  float t = uTime;
  vec2 par = uMouse * 0.012;
  vec3 col;
  // ---- sky
  vec3 hor = vec3(0.79, 0.88, 0.93), zen = vec3(0.26, 0.50, 0.82);
  float sk = smoothstep(0.38, 1.0, uv.y);
  col = mix(hor, zen, pow(sk, 0.8));
  vec2 sp = vec2((SUN.x - 0.5) * a, SUN.y);
  float sd = length(q - sp);
  col += vec3(1.0, 0.93, 0.80) * (exp(-sd * 2.2) * 0.6 + exp(-sd * 7.0) * 0.7);
  // ---- clouds (two layers, lit from the sun)
  for (int L = 0; L < 2; L++) {
    float fl = float(L);
    vec2 cp = vec2(q.x * (1.3 + fl * 0.8) + t * (0.012 + 0.01 * fl) + par.x * (1.0 + fl), uv.y * (3.2 + fl * 1.6) + fl * 5.0);
    float c = fbm(cp + 2.0 * fbm(cp * 0.6));
    float cm = smoothstep(0.40 + 0.03 * fl, 0.78, c) * smoothstep(0.30, 0.52, uv.y);
    float lit = clamp(0.5 + (fbm(cp + vec2(0.07, 0.05)) - c) * 6.0 + 0.5 * exp(-sd * 1.6), 0.0, 1.0);
    vec3 cc = mix(vec3(0.58, 0.68, 0.82), vec3(1.0, 0.985, 0.95), pow(lit, 0.8));
    col = mix(col, cc, cm * 0.97);
  }
  // ---- god rays
  vec2 sv = q - sp; float ang = atan(sv.y, sv.x);
  float rays = pow(fbm(vec2(ang * 3.2, t * 0.03)), 2.4) * smoothstep(1.5, 0.1, length(sv));
  col += vec3(1.0, 0.95, 0.82) * rays * (0.38 + 0.25 * uCalm);
  // ---- far hills
  float hy1 = 0.43 + 0.05 * fbm(vec2(q.x * 2.4 + 3.0 + par.x * 2.0, 1.0)) - 0.02;
  float hy2 = 0.38 + 0.06 * fbm(vec2(q.x * 3.1 + 9.0 + par.x * 3.0, 4.0));
  col = mix(col, mix(vec3(0.60, 0.74, 0.78), hor, 0.35), smoothstep(hy1 + 0.004, hy1 - 0.004, uv.y));
  col = mix(col, vec3(0.50, 0.66, 0.50), smoothstep(hy2 + 0.004, hy2 - 0.004, uv.y));
  // ---- meadow
  float gy = 0.345 + 0.012 * fbm(vec2(q.x * 5.0, 2.0));
  float gnd = smoothstep(gy + 0.003, gy - 0.003, uv.y);
  float depth = clamp((gy - uv.y) / gy, 0.0, 1.0);
  vec3 grass = mix(vec3(0.68, 0.74, 0.36), vec3(0.24, 0.42, 0.14), pow(depth, 0.6));
  grass *= 0.8 + 0.4 * fbm(vec2(q.x * 30.0, uv.y * 110.0));
  grass += vec3(0.5, 0.45, 0.2) * 0.25 * exp(-length(q - vec2(sp.x * 0.7, 0.34)) * 2.2);
  col = mix(col, grass, gnd);
  // ---- columns standing on the meadow
  vec4 c1 = column(q, -0.40 * a * 0.62 - 0.05 + par.x * 0.6, gy - 0.02, gy + 0.24, 0.040);
  vec4 c2 = column(q, 0.36 * a * 0.62 + 0.04 + par.x * 0.6, gy - 0.02, gy + 0.26, 0.040);
  vec3 haze = mix(col, hor, 0.12);
  col = mix(col, c1.rgb * 0.95 + (hor - c1.rgb) * 0.08, c1.a);
  col = mix(col, c2.rgb * 1.05, c2.a);
  // ---- lake
  float lx = smoothstep(-0.78 * a * 0.5, -0.5 * a * 0.5, q.x) * smoothstep(0.92 * a * 0.5, 0.55 * a * 0.5, q.x);
  float ltop = gy - 0.035 - 0.012 * sin(q.x * 9.0), lbot = 0.10 + 0.04 * sin(q.x * 6.0 + 1.0);
  float lake = lx * smoothstep(ltop + 0.006, ltop - 0.006, uv.y) * smoothstep(lbot - 0.03, lbot + 0.05, uv.y);
  vec2 ruv = vec2(uv.x + (fbm(vec2(q.x * 30.0, uv.y * 80.0 + t * 0.2)) - 0.5) * 0.03, ltop + (ltop - uv.y) * 0.9);
  vec3 refl = mix(col, hor * 0.95, 0.5);
  float rs = smoothstep(0.34, 0.9, ruv.y);
  vec3 water = mix(vec3(0.70, 0.84, 0.86), mix(hor, zen, 0.6), rs * 0.55);
  water = mix(water, vec3(0.42, 0.60, 0.46), smoothstep(0.35, 1.0, (ltop - uv.y) / max(ltop - lbot, 0.01)) * 0.55);
  water += vec3(1.0, 0.95, 0.85) * exp(-abs(q.x - sp.x * 0.55) * 7.0) * 0.35 * (0.5 + 0.5 * vn(vec2(q.x * 40.0, uv.y * 160.0 + t)));
  water += vec3(1.0, 0.95, 0.85) * 0.25 * pow(fbm(vec2(q.x * 60.0, uv.y * 200.0 + t * 0.4)), 4.0);
  col = mix(col, water, lake * 0.97);
  // ---- flowers on the ground: perspective grid, soft discs, defocus close to the camera
  float hor0 = gy;
  float dd = hor0 - uv.y;
  if (dd > 0.002) {
    float wz = 0.08 / dd, wx = (uv.x - 0.5) * a * 0.9 / dd;
    for (int L = 0; L < 3; L++) {
      float fl = float(L);
      float sc = 1.0 + fl * 0.9;
      vec2 gp = vec2(wx * sc * 14.0, wz * sc * 40.0 + fl * 11.0);
      vec2 id = floor(gp), f = fract(gp) - 0.5;
      float rr = h21(id + 13.0 + fl);
      vec2 off = (vec2(h21(id + 1.7), h21(id + 5.3)) - 0.5) * 0.6;
      float rad = 0.16 + 0.24 * h21(id + 3.0);
      float soft = 0.05 + 0.5 * smoothstep(0.05, 0.3, dd);
      float m = smoothstep(rad, rad - soft * rad - 0.02, length(f - off)) * step(0.38, rr);
      float hc = h21(id + 9.0);
      vec3 fc = hc < 0.3 ? vec3(0.92, 0.46, 0.66) : hc < 0.55 ? vec3(0.58, 0.46, 0.84) : hc < 0.78 ? vec3(0.96, 0.95, 0.9) : vec3(0.90, 0.25, 0.30);
      fc *= 0.8 + 0.3 * h21(id);
      float fade = smoothstep(0.0, 0.04, dd) * (1.0 - 0.35 * fl);
      col = mix(col, fc * (1.0 + 0.5 * smoothstep(0.1, 0.3, dd)), m * fade * 0.97 * (1.0 - lake));
    }
  }
  // soft depth haze toward the horizon
  col = mix(col, hor, 0.22 * smoothstep(0.30, 0.46, uv.y) * smoothstep(0.55, 0.40, uv.y));
  return col;
}

// ---------------------------------------------------------------- hands (raymarched SDF)
float sdCap(vec3 p, vec4 A, vec4 B){
  vec3 pa = p - A.xyz, ba = B.xyz - A.xyz;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-5), 0.0, 1.0);
  return length(pa - ba * h) - mix(A.w, B.w, h);
}
float smin(float a, float b, float k){ float h = max(k - abs(a - b), 0.0) / k; return min(a, b) - h * h * k * 0.25; }

vec2 hand(vec3 p, int hnd){
  // bounding capsule early-out
  float bb = sdCap(p, uBB[hnd * 2], uBB[hnd * 2 + 1]);
  if (bb > 0.35) return vec2(bb - 0.2, float(hnd));
  float d = 1e5;
  int o = hnd * 42;
  for (int i = 0; i < 21; i++) {
    float c = sdCap(p, uC[o + i * 2], uC[o + i * 2 + 1]);
    d = i == 0 ? c : smin(d, c, i < 6 ? 0.16 : 0.035);
  }
  float id = float(hnd);
  if (hnd == 1) { float s = sdCap(p, uCuff[0], uCuff[1]); if (s < d) { d = s; id = 2.0; } }
  else { float s = sdCap(p, uCuff[2], uCuff[3]); if (s < d) { d = s; id = 3.0; } }
  return vec2(d, id);
}
vec2 map(vec3 p){ vec2 a = hand(p, 0), b = hand(p, 1); return a.x < b.x ? a : b; }
vec3 nrm(vec3 p){ vec2 e = vec2(1, -1) * 0.006;
  return normalize(e.xyy * map(p + e.xyy).x + e.yyx * map(p + e.yyx).x + e.yxy * map(p + e.yxy).x + e.xxx * map(p + e.xxx).x); }
float shadow(vec3 ro, vec3 rd){ float s = 1.0, t = 0.05 + 0.05 * h21(gl_FragCoord.xy + 3.1); for (int i = 0; i < 32; i++) { float h = map(ro + rd * t).x; s = min(s, 7.0 * h / t); t += clamp(h, 0.02, 0.22); if (s < 0.01 || t > 3.5) break; } return clamp(s, 0.0, 1.0); }
float ao(vec3 p, vec3 n){ float o = 0.0, sc = 1.0; for (int i = 1; i <= 4; i++) { float h = 0.07 * float(i) + 0.02 + 0.04 * h21(gl_FragCoord.xy + float(i)); o += (h - map(p + n * h).x) * sc; sc *= 0.6; } return clamp(1.0 - 2.2 * o, 0.0, 1.0); }

vec3 shade(vec3 p, vec3 n, vec3 rd, float id){
  vec3 L1 = normalize(vec3(0.55, 0.72, 0.42)), L2 = normalize(vec3(-0.75, 0.15, 0.65));
  float ndv = clamp(dot(n, -rd), 0.0, 1.0), fr = pow(1.0 - ndv, 3.0);
  float sh = shadow(p + n * 0.045, L1), occ = ao(p, n);
  vec3 keyC = mix(vec3(1.0, 0.92, 0.80), vec3(1.0, 0.95, 0.88), uTension) * 2.1;
  vec3 R = reflect(rd, n);
  vec3 col;
  if (id < 1.5) {
    // human skin (two different tones): wrapped diffuse + red subsurface fringe + soft sheen + pores
    vec3 tone = id < 0.5 ? vec3(0.90, 0.68, 0.56) : vec3(0.74, 0.50, 0.38);
    float nz = fbm(p.xy * 22.0 + p.z * 13.0), pore = h21(floor(p.xy * 260.0) + floor(p.z * 260.0));
    vec3 alb = tone * (0.90 + 0.18 * nz) * (0.97 + 0.05 * pore);
    alb = mix(alb, alb * vec3(1.06, 0.84, 0.80), smoothstep(0.55, 0.9, fbm(p.xz * 9.0 + 3.0)) * 0.5);   // blotchy redness over the knuckles
    float wrap = clamp((dot(n, L1) + 0.55) / 1.55, 0.0, 1.0);
    float dif = max(dot(n, L1), 0.0) * sh;
    col = alb * (keyC * (0.40 * dif + 0.5 * wrap * (0.5 + 0.5 * sh)) + vec3(0.30, 0.42, 0.68) * 0.30 * (0.5 + 0.5 * n.y) + vec3(0.9, 0.55, 0.40) * 0.12) * occ;
    col += vec3(0.80, 0.42, 0.30) * pow(1.0 - ndv, 2.0) * 0.22 * (0.25 + 0.75 * wrap) * occ;
    col += vec3(1.0, 0.95, 0.88) * (pow(max(dot(R, L1), 0.0), 38.0) * 0.30 + pow(max(dot(R, L1), 0.0), 9.0) * 0.07) * sh;
    col += skyEnv(R) * fr * 0.16;
  } else if (id < 2.5) {
    // white shirt cuff
    float wv = 0.93 + 0.07 * sin(p.x * 160.0) * sin(p.y * 160.0);
    float wrap = clamp((dot(n, L1) + 0.5) / 1.5, 0.0, 1.0);
    col = vec3(0.96, 0.97, 1.0) * wv * (keyC * 0.62 * wrap * (0.55 + 0.45 * sh) + vec3(0.55, 0.68, 0.92) * 0.55) * (0.6 + 0.4 * occ);
  } else {
    // dark jacket sleeve with a fine twill
    float tw = 0.9 + 0.1 * sin((p.x + p.y) * 210.0);
    float wrap = clamp((dot(n, L1) + 0.5) / 1.5, 0.0, 1.0);
    col = vec3(0.10, 0.13, 0.22) * tw * (keyC * 0.55 * wrap * (0.45 + 0.55 * sh) + vec3(0.40, 0.55, 0.85) * 0.5) * (0.5 + 0.5 * occ);
    col += vec3(0.5, 0.6, 0.8) * pow(max(dot(R, L1), 0.0), 20.0) * 0.08 * sh;
  }
  return col;
}

void main(){
  vec2 frag = gl_FragCoord.xy;
  float a = uRes.x / uRes.y;
  vec2 uv = frag / uRes;
  vec3 col = landscape(uv, a);
  float dream = uDream;
  if (dream > 0.02) {   // defocus: a few jittered taps of the landscape
    float br = 0.010 * dream;
    col += landscape(uv + vec2(br, 0.0), a) + landscape(uv + vec2(-br * 0.5, br * 0.87), a) + landscape(uv + vec2(-br * 0.5, -br * 0.87), a);
    col *= 0.25;
  }

  // camera ray (visible height uHv at z = 0)
  vec3 ro = uCam;
  float focal = ro.z / uHv;
  vec3 rd = normalize(vec3((uv - 0.5) * vec2(a, 1.0), -focal) * vec3(1.0, 1.0, 1.0));
  float t = uDbg > 0.5 ? 30.0 : 0.0, dmin = 1e5, tm = 0.0, id = -1.0; bool hit = false;
  for (int i = 0; i < 110; i++) {
    vec3 p = ro + rd * t;
    vec2 m = map(p);
    if (m.x < dmin) { dmin = m.x; tm = t; }
    if (m.x < 0.0004) { hit = true; id = m.y; break; }
    t += m.x * 0.85;
    if (t > 22.0) break;
  }
  if (hit) { for (int k = 0; k < 4; k++) t += map(ro + rd * t).x; }
  float px = (uHv / uRes.y) * (tm / ro.z) * 1.1;
  float cov = hit ? 1.0 : 1.0 - smoothstep(0.0, px * (1.0 + dream * 5.0), dmin);
  if (cov > 0.001) {
    vec3 p = ro + rd * (hit ? t : tm);
    vec3 n = nrm(p);
    vec3 hc = shade(p, n, rd, hit ? id : (dmin < 1.0 ? id : 0.0));
    hc = mix(hc, vec3(0.86, 0.94, 0.90) * 1.05, dream * 0.38);
    col = mix(col, hc, cov * (1.0 - dream * 0.12));
  }

  // ---- dreamy -> real: a minty bloom haze that lifts as you hold, leaving a darker, contrastier, true-to-life picture
  vec2 vv = (uv - 0.5) * vec2(a * 0.9, 1.0);
  float edge = smoothstep(0.15, 0.85, length(vv));
  col = mix(col, vec3(0.70, 0.86, 0.80) * 1.15, dream * (0.20 + 0.38 * edge));
  col += vec3(1.0, 0.98, 0.92) * dream * 0.14 * exp(-length(uv - vec2(0.8, 0.9)) * 2.2);
  col = mix(col, vec3(dot(col, vec3(0.3, 0.59, 0.11))), dream * 0.18);
  float real = 1.0 - dream;
  col = mix(col, (col - 0.42) * 1.28 + 0.40, real * 0.75);
  col *= mix(1.0, 0.78, real * (1.0 - uCalm * 0.6));
  // ---- grade: warm up and darken toward the red climax; golden-hour calm afterwards
  float tn = uTension;
  col = mix(col, (col - 0.40) * 1.18 + 0.38, tn * 0.6);   // natural: just a touch more contrast, no colour cast
  col = mix(col, col * vec3(1.06, 0.96, 0.84) + vec3(0.03, 0.015, 0.0), uCalm * 0.55);
  float vig = smoothstep(1.15, 0.2, length((uv - 0.5) * vec2(a * 0.9, 1.0)));
  col *= mix(1.0, vig, 0.55 + 0.2 * tn);
  col *= 1.0 - 0.18 * tn * tn;
  // filmic curve + grain
  col = col * 1.06 / (1.0 + col * 0.16);
  col = pow(max(col, 0.0), vec3(0.93));
  col += (h21(frag + fract(uTime) * 91.7) - 0.5) * 0.028;
  oCol = vec4(col, 1.0);
}`;

function shader(gl, type, src) {
  const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getExtension("KHR_parallel_shader_compile") && !gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}

// ------------------------------------------------------------------ hand rig (CPU): joint chains -> capsules (A.xyz,rA, B.xyz,rB)
const FING = [   // base z, base y, lengths, radius start/end, spread(deg toward thumb)
  { z: 0.36, L: [0.46, 0.26, 0.22], r: [0.108, 0.098, 0.086, 0.074], sp: 5 },
  { z: 0.12, L: [0.52, 0.30, 0.24], r: [0.108, 0.098, 0.086, 0.074], sp: 0 },
  { z: -0.12, L: [0.48, 0.28, 0.23], r: [0.102, 0.093, 0.082, 0.07], sp: -4 },
  { z: -0.36, L: [0.36, 0.20, 0.19], r: [0.092, 0.083, 0.073, 0.063], sp: -9 },
];
const BEND = [78, 88, 62];

function chain(b, th0, sp, L, bend, curl, extra) {
  const pts = [b.slice()];
  let [x, y, z] = b, th = th0 * D2R; const ph = sp * D2R;
  for (let i = 0; i < L.length; i++) {
    th += curl * bend[i] * D2R;
    const cx = Math.cos(th);
    x += cx * Math.cos(ph) * L[i]; y += -Math.sin(th) * L[i]; z += cx * Math.sin(ph) * L[i];
    pts.push([x, y, z]);
  }
  return pts;
}

// pose: {curl:[4], thumb, spreadAdd}
function buildLocal(pose) {
  const caps = [];   // [A(3), rA, B(3), rB]
  const cap = (a, ra, b, rb) => caps.push([a[0], a[1], a[2], ra, b[0], b[1], b[2], rb]);
  // palm: four capsules across the width (slab)
  for (const z of [0.36, 0.12, -0.12, -0.36]) cap([0.12, 0, z * 0.95], 0.17, [1.0, 0, z], 0.16);
  // wrist + forearm
  cap([-0.05, -0.0, 0], 0.30, [0.15, 0, 0], 0.33);
  cap([-0.05, -0.02, 0], 0.30, [-4.2, -0.05, 0], 0.46);
  // fingers
  FING.forEach((f, i) => {
    const pts = chain([1.0, -0.0, f.z], 0, f.sp + (pose.spread || 0) * (1.5 - i * 0.7), f.L, BEND, Math.max(0, Math.min(1.1, pose.curl[i])));
    for (let k = 0; k < 3; k++) cap(pts[k], f.r[k], pts[k + 1], f.r[k + 1]);
  });
  // thumb
  const tc = Math.max(0, Math.min(1.1, pose.thumb));
  const tp = chain([0.18, -0.05, 0.40], -6, 52 - 34 * tc, [0.44, 0.34, 0.30], [8, 46, 52], tc);
  const tr = [0.155, 0.13, 0.112, 0.092];
  for (let k = 0; k < 3; k++) cap(tp[k], tr[k], tp[k + 1], tr[k + 1]);
  return caps;
}

function rotMat(yaw, pitch, roll) {
  // R = Ry(yaw) * Rz(pitch) * Rx(roll)
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cz = Math.cos(pitch), sz = Math.sin(pitch), cx = Math.cos(roll), sx = Math.sin(roll);
  const Rx = [1, 0, 0, 0, cx, -sx, 0, sx, cx], Rz = [cz, -sz, 0, sz, cz, 0, 0, 0, 1], Ry = [cy, 0, sy, 0, 1, 0, -sy, 0, cy];
  const mul = (A, B) => { const o = new Array(9); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o[r * 3 + c] = A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c]; return o; };
  return mul(Ry, mul(Rz, Rx));
}
const xf = (R, t, p, mz) => { const x = p[0], y = p[1], z = p[2] * mz; return [R[0] * x + R[1] * y + R[2] * z + t[0], R[3] * x + R[4] * y + R[5] * z + t[1], R[6] * x + R[7] * y + R[8] * z + t[2]]; };

function placeHand(out, off, pose, t, yaw, pitch, roll, mz, sleeve, bbOut, bbOff, cuffOut, cuffOff) {
  const R = rotMat(yaw, pitch, roll);
  const local = buildLocal(pose);
  local.forEach((c, i) => {
    const A = xf(R, t, [c[0], c[1], c[2]], mz), B = xf(R, t, [c[4], c[5], c[6]], mz);
    const o = (off + i) * 8;
    out[o] = A[0]; out[o + 1] = A[1]; out[o + 2] = A[2]; out[o + 3] = c[3];
    out[o + 4] = B[0]; out[o + 5] = B[1]; out[o + 6] = B[2]; out[o + 7] = c[7];
  });
  // bounding capsule: from forearm tip to fingertips
  const bA = xf(R, t, [-3.4, 0, 0], mz), bB = xf(R, t, [1.7, 0, 0], mz);
  bbOut.set([bA[0], bA[1], bA[2], 1.6, bB[0], bB[1], bB[2], 1.5], bbOff);
  if (sleeve) {
    const f0 = sleeve === 1 ? -1.65 : -1.85, f1 = sleeve === 1 ? -2.5 : -3.6;
    const cA = xf(R, t, [f0, -0.02, 0], mz), cB = xf(R, t, [f1, -0.03, 0], mz);
    const r0 = sleeve === 1 ? 0.56 : 0.60, r1 = sleeve === 1 ? 0.60 : 0.66;
    cuffOut.set([cA[0], cA[1], cA[2], r0, cB[0], cB[1], cB[2], r1], cuffOff);
  }
}

export function createGL3D(canvas) {
  let vao;
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "high-performance" });
  if (!gl) return null;
  const pr = gl.createProgram();
  gl.attachShader(pr, shader(gl, gl.VERTEX_SHADER, VS)); gl.attachShader(pr, shader(gl, gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(pr);
  // Compile/link is the one big stall on phones (huge raymarching shader). With KHR_parallel_shader_compile it runs on a driver thread
  // and we only touch the program once it reports done, so scrolling never blocks on it.
  const par = gl.getExtension("KHR_parallel_shader_compile");
  let ready = false, failed = false, u = null;
  const finish = () => {
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    gl.useProgram(pr);
    const U = (n) => gl.getUniformLocation(pr, n);
    u = { res: U("uRes"), time: U("uTime"), tension: U("uTension"), calm: U("uCalm"), p: U("uP"), hv: U("uHv"), cam: U("uCam"), mouse: U("uMouse"), dbg: U("uDbg"), c: U("uC"), cuff: U("uCuff"), dream: U("uDream"), hasTex: U("uHasTex"), tex: U("uTex"), bb: U("uBB") };
    // one throw-away draw into a 4x4 viewport so any lazy driver work happens here, not on the first visible frame
    gl.viewport(0, 0, 4, 4); gl.uniform2f(u.res, 4, 4); gl.bindVertexArray(vao); gl.drawArrays(gl.TRIANGLES, 0, 3);
    ready = true;
  };
  const poll = () => {
    if (ready) return true;
    if (failed) return false;
    if (par && !gl.getProgramParameter(pr, par.COMPLETION_STATUS_KHR)) return false;
    try { finish(); } catch (e) { failed = true; console.warn("[collab] WebGL scene unavailable", e); return false; }
    return true;
  };
  const caps = new Float32Array(84 * 4), bb = new Float32Array(16), cuff = new Float32Array(16);
  vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  // optional photo backdrop: drop a landscape photo at public/collab/scene.jpg and it replaces the procedural meadow
  let tex = null;
  try {
    const im = new Image(); im.crossOrigin = "anonymous";
    im.onload = () => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im); gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); tex = t; };
    im.src = "/collab/scene.jpg";
  } catch (e) { /* no photo: procedural scene */ }
  if (!par) poll();
  return {
    gl,
    ready: poll,
    // s: {t, p, tension, calm, hs(0..1 handshake), shake, jx, jy, mouse:[x,y], aspect}
    draw(w, h, s) {
      if (!poll()) return;
      gl.viewport(0, 0, w, h);
      const a = w / h;
      const hv = Math.max(4.3, 7.6 / a);                       // visible world height at z = 0
      const wv = hv * a;
      const T = s.t, p = s.p, tension = s.tension, hs = s.hs;
      const eIn = hs * hs * (3 - 2 * hs);
      const snap = Math.min(1, hs * 1.04), sn = 1 + 2.9 * Math.pow(snap - 1, 3) + 1.9 * Math.pow(snap - 1, 2); // back-out
      // ---- reach geometry: gap between the two fingertip groups
      const g0 = Math.min(4.6, wv * 0.5);
      const ep = p * p * (3 - 2 * p);
      const gap = g0 + (0.42 - g0) * ep;
      const tipL = 2.0, tipLocal = 1.0 + 0.46 + 0.26 + 0.22;   // index tip
      const bob = Math.sin(T * 1.3) * 0.06 * (1 - p), ty = -0.15;
      const jit = (k) => (Math.sin(T * 61 + k) + Math.sin(T * 47.3 + k * 2)) * 0.5 * (s.shake * 0.12 + tension * 0.035);
      const curlIdle = [0.04, 0.22, 0.32, 0.42];
      const idle = (side) => curlIdle.map((c, i) => c + tension * 0.18 * Math.sin(T * 22 + i + side * 2));
      const grip = [0.95, 0.98, 1.0, 1.0];
      const mixc = (c) => c.map((x, i) => x + (grip[i] - x) * eIn);
      // reach poses
      const reachRoll = -0.62, reachPitch = -0.16;
      const L0 = { x: -(gap / 2 + tipLocal) , y: ty + bob + jit(1) * 1.0, z: -0.25 };
      const R0 = { x: (gap / 2 + tipLocal), y: ty - bob * 0.8 + jit(2) * 1.0, z: 0.25 };
      // handshake poses (palms vertical, facing each other along z, thumbs up)
      const O = Object.assign({ ya: 0.15, dx: 0.4, dy: 0.1, dz: 0.2, pitch: 0.12, th: 0.9 }, s.ho || {});
      const ya = O.ya, cya = Math.cos(ya), sya = Math.sin(ya);
      const HS = { Lx: -O.dx * cya - O.dz * sya, Ly: O.dy, Lz: O.dx * sya - O.dz * cya, Rx: O.dx * cya + O.dz * sya, Ry: -O.dy, Rz: -O.dx * sya + O.dz * cya };
      const lerp = (a, b, t) => a + (b - a) * t;
      const snapT = Math.min(1, Math.max(0, sn));
      const posL = [lerp(L0.x, HS.Lx, snapT), lerp(L0.y, HS.Ly, snapT), lerp(L0.z, HS.Lz, snapT)];
      const posR = [lerp(R0.x, HS.Rx, snapT), lerp(R0.y, HS.Ry, snapT), lerp(R0.z, HS.Rz, snapT)];
      // left (AI) hand points +x, right (human) hand is turned 180deg about y
      const yawL = lerp(0.20, 0.16 + ya, eIn), yawR = Math.PI - lerp(0.20, 0.16, eIn) + lerp(0, ya, eIn);
      const rollL = lerp(reachRoll, -Math.PI / 2, eIn), rollR = lerp(reachRoll, -Math.PI / 2, eIn);
      const pitchL = lerp(reachPitch, O.pitch, eIn), pitchR = lerp(reachPitch, O.pitch, eIn);
      placeHand(caps, 0, { curl: mixc(idle(-1)), thumb: 0.3 * (1 - eIn) + O.th * eIn, spread: 1 - eIn }, posL, yawL, pitchL, rollL, 1, 2, bb, 0, cuff, 8);
      placeHand(caps, 21, { curl: mixc(idle(1)), thumb: 0.3 * (1 - eIn) + O.th * eIn, spread: 1 - eIn }, posR, yawR, pitchR, rollR, 1, 1, bb, 8, cuff, 0);
      gl.uniform2f(u.res, w, h); gl.uniform1f(u.time, T); gl.uniform1f(u.tension, tension); gl.uniform1f(u.calm, s.calm); gl.uniform1f(u.p, p); gl.uniform1f(u.hv, hv);
      gl.uniform3f(u.cam, (s.mouse ? s.mouse[0] : 0) * 0.15, (s.mouse ? s.mouse[1] : 0) * 0.1, 12.0);
      gl.uniform1f(u.dbg, s.dbg ? 1 : 0); gl.uniform1f(u.dream, Math.max(0, 1 - Math.min(1, p / 0.7)) * (1 - s.calm)); gl.uniform1f(u.hasTex, tex ? 1 : 0); if (tex) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(u.tex, 0); } gl.uniform2f(u.mouse, s.mouse ? s.mouse[0] : 0, s.mouse ? s.mouse[1] : 0);
      gl.uniform4fv(u.c, caps); gl.uniform4fv(u.bb, bb); gl.uniform4fv(u.cuff, cuff);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}
