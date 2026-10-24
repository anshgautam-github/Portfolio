/**
 * WebGL2 scene for the landing page:
 *   - soft, slowly drifting diagonal light streaks (background)
 *   - the name ("ansh"), hand-written on load and rendered as refractive, glossy glass tubes
 *   - a cursor-driven gel simulation (ping-pong FBO, damped spring + wave): the liquid inside the glass flows under the cursor (shading only; the letters never move),
 *     ripples into neighbouring letters, overshoots a little and settles back,
 *     then relaxes smoothly back to rest.
 *
 * Everything lives in two tiny programs: `flow` (updates the field) and `scene` (draws to screen).
 */
import { MASK_W, MASK_H, STROKE, PEN_SPEED, buildHeightField, buildWriteMap } from "./helloPath.js";
import { capDpr, skipFrame, IS_MOBILE } from "../../lib/perf.js";
import { loaderTask, isReleased } from "../../lib/loader.js";

const VERT = `#version 300 es
precision highp float;
void main() {
  // full-screen triangle
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const NOISE_GLSL = `
float hash11(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash21(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1, 0)), u.x), mix(hash21(i + vec2(0, 1)), hash21(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return s;
}

`;

/* ------------------------------------------------------------------ */
/* Sky: pale blue with soft drifting cream streaks, rendered once per frame at low resolution              */
/* ------------------------------------------------------------------ */
const BG_FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uAspect;
uniform float uTime;
uniform float uDark;
uniform vec4 uDrops[16];   // water drops: xy = position (aspect units), z = birth time, w = strength
out vec4 o;
${NOISE_GLSL}
// ---------- background: pale blue sky with soft diagonal cream light streaks ----------
vec3 background(vec2 sa, vec2 dflow) {
  const float ang = 0.50;
  vec2 dir = vec2(cos(ang), sin(ang));
  vec2 prp = vec2(-dir.y, dir.x);
  // ---- liquid surface: every pointer drop sends out circular waves that travel, interfere and fade ----
  float wh = 0.0;            // surface height
  vec2 wg = vec2(0.0);       // surface slope
  for (int i = 0; i < 16; i++) {
    vec4 d = uDrops[i];
    float age = uTime - d.z;
    if (d.w <= 0.0 || age < 0.0 || age > 6.0) continue;
    vec2 dv = sa - d.xy;
    float r = length(dv) + 1e-4;
    float front = age * 0.34;
    float x = (r - front);
    float env = exp(-(x * x) / 0.0105) * exp(-age * 0.50) * d.w / (1.0 + r * 5.0);
    float ph = x * 78.0;
    wh += sin(ph) * env;
    wg += (dv / r) * (cos(ph) * 78.0 * env);
  }
  vec2 q = sa + wg * 0.00024 + dflow * 0.25;
  float u = dot(q, prp);
  float w = dot(q, dir);
  float t = uTime;
  u += 0.07 * sin(w * 1.6 + t * 0.35) + 0.04 * sin(w * 3.7 - t * 0.5);
  float f1 = fbm(vec2(u * 2.3 + t * 0.045, w * 0.30 - t * 0.02));
  float f2 = fbm(vec2(u * 5.1 - t * 0.03 + 9.0, w * 0.55 + t * 0.015));
  float band = smoothstep(0.46, 0.74, f1);
  float thin = smoothstep(0.55, 0.85, f2) * 0.45;
  float streak = clamp(band + thin * band, 0.0, 1.0);

  vec3 skyL = vec3(0.755, 0.855, 0.945);
  vec3 deepL = vec3(0.706, 0.824, 0.929);
  vec3 creamL = vec3(0.90, 0.92, 0.94);
  vec3 L = mix(skyL, deepL, smoothstep(0.3, 0.75, f2) * 0.55);
  L = mix(L, creamL, streak * 0.55);

  vec3 skyD = vec3(0.043, 0.071, 0.133);
  vec3 deepD = vec3(0.055, 0.105, 0.215);
  vec3 glowD = vec3(0.20, 0.32, 0.62);
  vec3 D = mix(skyD, deepD, smoothstep(0.3, 0.75, f2));
  D = mix(D, glowD, streak * 0.55);
  vec3 col = mix(L, D, uDark);

  // water shading: crests catch light, troughs go a shade deeper, plus a faint caustic shimmer that is always moving
  float crest = clamp(wh * 1.1, 0.0, 1.0), trough = clamp(-wh * 1.1, 0.0, 1.0);
  float slope = clamp(length(wg) * 0.010, 0.0, 1.0);
  col += vec3(0.96, 0.98, 1.00) * (crest * crest * 0.25 + slope * slope * 0.18) * (1.0 - uDark * 0.35);
  col -= vec3(0.17, 0.12, 0.05) * trough * 0.30 * (1.0 - uDark * 0.5);
  vec2 cp = sa * 4.2;
  float ca = sin(cp.x * 1.7 + t * 0.55 + sin(cp.y * 2.3 - t * 0.5)) * sin(cp.y * 1.9 - t * 0.42 + sin(cp.x * 2.1 + t * 0.4));
  ca = pow(1.0 - abs(ca), 7.0);
  col += vec3(0.92, 0.96, 1.0) * ca * 0.05 * (1.0 - uDark * 0.5);

  // ---- lively light: aurora ribbons, drifting glow orbs, a slow sweeping beam and twinkling stars (all blue) ----
  vec3 live = vec3(0.0);
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float yy = sa.y + 0.12 * sin(sa.x * 2.2 + t * (0.25 + 0.07 * fk) + fk * 2.0) + 0.05 * sin(sa.x * 5.0 - t * 0.4 + fk);
    float c = 0.28 + 0.24 * fk + 0.05 * sin(t * 0.2 + fk * 1.7);
    float dd = yy - c;
    float rib = exp(-dd * dd / 0.0040) * (0.55 + 0.45 * sin(sa.x * 3.0 + t * 0.5 + fk * 4.0));
    live += mix(vec3(0.10, 0.30, 0.95), vec3(0.40, 0.78, 1.00), fk * 0.5) * rib * 0.30;
  }
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    vec2 p = vec2(uAspect * fract(0.13 + fi * 0.318 + t * (0.010 + 0.003 * fi)), 0.14 + 0.72 * fract(fi * 0.618 + 0.06 * sin(t * 0.12 + fi * 1.9)));
    float rad = 0.030 + 0.034 * fract(fi * 0.37 + 0.2);
    float dd = length(sa - p);
    float pulse = 0.55 + 0.45 * sin(t * 0.8 + fi * 2.1);
    float orb = exp(-dd * dd / (rad * rad * 0.9)) * 0.55 + smoothstep(0.010, 0.0, abs(dd - rad)) * 0.55;
    live += vec3(0.34, 0.60, 1.00) * orb * pulse * 0.24;
  }
  float bm = dot(sa, vec2(0.62, 0.78));
  float bpos = fract(t * 0.030) * 3.2 - 0.9;
  live += vec3(0.45, 0.72, 1.0) * exp(-(bm - bpos) * (bm - bpos) / 0.012) * 0.20;
  vec2 gp = sa * 64.0;
  float sh = hash21(floor(gp));
  float tw = pow(max(0.0, sin(t * (1.4 + 3.0 * fract(sh * 37.0)) + sh * 50.0)), 8.0);
  live += vec3(0.72, 0.86, 1.0) * step(0.982, sh) * tw * smoothstep(0.40, 0.0, length(fract(gp) - 0.5)) * 1.1;
  col += live * mix(0.30, 1.0, uDark);
  return col;
}



void main() {
  vec2 s = vec2(gl_FragCoord.x / uRes.x, 1.0 - gl_FragCoord.y / uRes.y);
  o = vec4(background(vec2(s.x * uAspect, s.y), vec2(0.0)), 1.0);
}`;

/* ------------------------------------------------------------------ */
/* Flow field: decay + diffuse + splat the cursor's velocity           */
/* ------------------------------------------------------------------ */
const FLOW_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uPrev;   // xy = displacement of the gel surface, zw = its velocity
uniform vec2 uRes;
uniform float uAspect;
uniform float uDt;
uniform vec4 uSeg;         // previous + current pointer position (aspect units)
uniform vec2 uPtr;         // current pointer position (aspect units)
uniform float uRadius;     // drag footprint
uniform float uPressR;     // press footprint
uniform float uPress;      // steady "finger on gel" strength (0 when the pointer is away)
uniform float uDragD;      // immediate displacement along the stroke
uniform float uImpulse;    // momentum handed to the gel along the stroke (-> overshoot, wobble)
uniform float uFirst;      // 1.0 on the first sub-step of a frame (pointer stroke applied once)
uniform float uK;          // wave stiffness  (ripple speed^2, in texels)
uniform float uS;          // spring back to rest
uniform float uDamp;       // viscous damping
uniform float uMax;
uniform float uEnc;        // 1.0 when the target is RGBA8 (no velocity channel: falls back to damped relax)
out vec4 o;

vec2 dec(vec4 c) { return uEnc > 0.5 ? (c.xy - 0.5) * (2.0 * uMax) : c.xy; }

void main() {
  vec2 tc = gl_FragCoord.xy / uRes;
  vec2 px = 1.0 / uRes;
  vec2 s = vec2(tc.x, 1.0 - tc.y);
  vec2 p = vec2(s.x * uAspect, s.y);

  vec4 cs = texture(uPrev, tc);
  vec2 d = dec(cs);
  vec2 v = uEnc > 0.5 ? vec2(0.0) : cs.zw;
  vec2 n1 = dec(texture(uPrev, tc + vec2(px.x, 0.0)));
  vec2 n2 = dec(texture(uPrev, tc - vec2(px.x, 0.0)));
  vec2 n3 = dec(texture(uPrev, tc + vec2(0.0, px.y)));
  vec2 n4 = dec(texture(uPrev, tc - vec2(0.0, px.y)));
  vec2 lap = n1 + n2 + n3 + n4 - 4.0 * d;

  // soft gel: neighbours drag each other (ripples travel), the surface springs home, and it is damped
  vec2 acc = uK * lap - uS * d - uDamp * v;

  // finger resting on the gel: a gentle outward push around the cursor (gradient of a gaussian)
  vec2 r = p - uPtr;
  float gp = exp(-dot(r, r) / (uPressR * uPressR));
  acc += (r / uPressR) * gp * uPress;

  v += acc * uDt;

  // pointer stroke: drag the surface along the motion and give it momentum
  if (uFirst > 0.5) {
    vec2 a = uSeg.xy;
    vec2 b = uSeg.zw;
    vec2 ab = b - a;
    float len2 = dot(ab, ab);
    if (len2 > 1e-10) {
      float t = clamp(dot(p - a, ab) / len2, 0.0, 1.0);
      vec2 q = a + ab * t;
      vec2 dq = p - q;
      float g = exp(-dot(dq, dq) / (uRadius * uRadius));
      d += ab * (g * uDragD);
      v += ab * (g * uImpulse);
    }
  }

  d += v * uDt;

  if (uEnc > 0.5) { d *= exp(-uDt * 6.0); v = vec2(0.0); }   // 8-bit fallback: no velocity, just relax
  float m = length(d);
  if (m > uMax) { d *= uMax / m; v *= 0.5; }                  // keep fast flicks sane
  o = uEnc > 0.5 ? vec4(d / (2.0 * uMax) + 0.5, 0.5, 1.0) : vec4(d, v);
}`;

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */
const SCENE_FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uAspect;
uniform float uTime;
uniform float uDark;
uniform float uIntro;
uniform vec4 uBox;          // text box: min.xy, size.xy (aspect units)
uniform vec2 uHTex;         // height texture size in texels
uniform float uR;           // tube radius in texels
uniform vec2 uMouse;
uniform float uMouseAct;
uniform float uEnc;
uniform float uMax;
uniform sampler2D uHeight;
uniform sampler2D uFlow;
uniform sampler2D uWrite;   // handwriting timeline (see buildWriteMap)
uniform sampler2D uSky;     // pre-rendered sky streaks (low resolution)
uniform sampler2D uAtlas;   // falling-sticker sprite atlas (premultiplied)
uniform vec4 uSA[16];       // per sticker: x, y, half size (viewport-height units), angle
uniform vec2 uSB[16];       // per sticker: atlas cell, alpha
uniform int uSN;            // number of live stickers
uniform float uPxU;         // pixels per viewport-height unit
uniform float uCellPx;      // atlas cell size in texels
out vec4 o;

${NOISE_GLSL}
vec2 flowAt(vec2 s) {
  vec4 c = texture(uFlow, vec2(s.x, 1.0 - s.y));
  return uEnc > 0.5 ? (c.xy - 0.5) * (2.0 * uMax) : c.xy;
}

// the sky is rendered once per frame at low resolution (see BG_FRAG) and just sampled here
vec3 skyAt(vec2 p) { return texture(uSky, vec2(p.x / uAspect, 1.0 - p.y)).rgb; }

// falling stickers, composited back-to-front with a soft shadow under each one
vec4 stickerLayer(vec2 sa) {
  vec4 acc = vec4(0.0);
  for (int i = 0; i < 16; i++) {
    if (i >= uSN) break;
    vec4 A = uSA[i];
    vec2 d = sa - A.xy;
    float hs = A.z;
    if (dot(d, d) > hs * hs * 2.0) continue;
    float c = cos(A.w), sn = sin(A.w);
    vec2 l = vec2(c * d.x + sn * d.y, -sn * d.x + c * d.y) / (2.0 * hs) + 0.5;
    if (l.x < 0.0 || l.x > 1.0 || l.y < 0.0 || l.y > 1.0) continue;
    vec2 cell = vec2(mod(uSB[i].x, 4.0), floor(uSB[i].x / 4.0));
    float lod = max(0.0, log2(uCellPx / max(2.0 * hs * uPxU, 1.0)));
    vec4 t = textureLod(uAtlas, (cell + l) / 4.0, lod) * uSB[i].y;
    vec2 ls = l - vec2(0.012, 0.030);                         // shadow: same sprite, offset down, blurred
    vec2 lc = clamp(ls, 0.02, 0.98);
    float sh = textureLod(uAtlas, (cell + lc) / 4.0, lod + 2.2).a * uSB[i].y;
    vec3 shc = mix(vec3(0.06, 0.14, 0.34), vec3(0.0, 0.0, 0.05), uDark);
    vec4 shadow = vec4(shc * sh * 0.26, sh * 0.26);
    acc = shadow + acc * (1.0 - shadow.a);
    acc = t + acc * (1.0 - t.a);
  }
  return acc;
}

// everything behind the glass: sky + falling stickers
vec3 worldAt(vec2 p) {
  vec4 st = stickerLayer(p);
  return st.rgb + skyAt(p) * (1.0 - st.a);
}

// time (0..1) at which the pen reaches this point of the script
float writeT(vec2 p) {
  return textureLod(uWrite, p, 0.0).r;
}

// soft rounded light-box used by the studio environment
float lbox(vec2 p, vec2 c, vec2 hs, float soft) {
  vec2 d = abs(p - c) - hs;
  return 1.0 - smoothstep(-soft, soft, max(d.x, d.y));
}

// procedural studio environment, looked up with the mirror direction (screen y points down)
vec3 studioEnv(vec3 R, float dark) {
  float ry = -R.y;                                               // +1 = up towards the sky
  vec3 deepB  = mix(vec3(0.05, 0.13, 0.50), vec3(0.03, 0.06, 0.28), dark);
  vec3 horiz  = mix(vec3(0.86, 0.94, 1.00), vec3(0.45, 0.60, 0.95), dark);
  vec3 skyTop = mix(vec3(0.34, 0.56, 0.98), vec3(0.16, 0.30, 0.78), dark);
  vec3 e = mix(deepB, horiz, smoothstep(-0.62, 0.02, ry));
  e = mix(e, skyTop, smoothstep(0.05, 0.95, ry));
  vec2 r = R.xy;
  float k = mix(1.0, 0.8, dark);
  // key softbox (top-left), kicker strip (right), cool strip (left), warm bounce card (bottom-right)
  e += vec3(1.00, 0.99, 0.97) * lbox(r, vec2(-0.36, -0.60), vec2(0.34, 0.085), 0.05) * 1.9 * k;
  e += vec3(1.00, 0.99, 0.97) * lbox(r, vec2( 0.60, -0.14), vec2(0.045, 0.36), 0.035) * 1.5 * k;
  e += vec3(0.55, 0.80, 1.00) * lbox(r, vec2(-0.74,  0.22), vec2(0.035, 0.30), 0.04) * 1.1 * k;
  e += vec3(1.00, 0.88, 0.72) * lbox(r, vec2( 0.42,  0.62), vec2(0.30, 0.07), 0.06) * 0.8 * k;
  return e;
}

float starAt(vec2 d, float size) {
  vec2 a = abs(d);
  float cr = smoothstep(size, 0.0, a.x) * smoothstep(size * 0.045, 0.0, a.y)
           + smoothstep(size, 0.0, a.y) * smoothstep(size * 0.045, 0.0, a.x);
  float core = exp(-length(d) / (size * 0.16));
  return cr * 0.9 + core * 0.7;
}

void main() {
  vec2 fc = gl_FragCoord.xy;
  vec2 s = vec2(fc.x / uRes.x, 1.0 - fc.y / uRes.y);
  vec2 sa = vec2(s.x * uAspect, s.y);

  vec2 tp = (sa - uBox.xy) / uBox.zw;                      // letters stay put: the flow only drives shading
  float inBox = step(0.0, tp.x) * step(tp.x, 1.0) * step(0.0, tp.y) * step(tp.y, 1.0);
  vec2 tx = 1.0 / uHTex;
  float rt = uIntro * 1.04;                                // how far the pen has got
  bool writing = uIntro < 1.0;

  vec3 bgPlain = worldAt(sa);                              // sky + falling stickers
  vec3 col = bgPlain;
  float cover = 0.0;

  // cheap, conservative test on the mip-blurred height field: only pixels at / near a letter pay for the glass
  float hb = textureLod(uHeight, tp, 3.0).r * inBox;
  if (hb > 0.0) {
    vec2 dfl = flowAt(s);
    float dmag = length(dfl);

    // handwriting: the tube swells out of a tapered nib behind the pen
    float GROW = 0.030;
    vec2 o2 = tx * 2.0;
    float tC = writing ? writeT(tp) : 0.0;
    float gC = writing ? smoothstep(0.0, GROW, rt - tC) : 1.0;
    float h  = textureLod(uHeight, tp, 0.0).r * inBox * gC;
    float hR = textureLod(uHeight, tp + vec2(o2.x, 0.0), 0.0).r;
    float hL = textureLod(uHeight, tp - vec2(o2.x, 0.0), 0.0).r;
    float hD = textureLod(uHeight, tp + vec2(0.0, o2.y), 0.0).r;
    float hU = textureLod(uHeight, tp - vec2(0.0, o2.y), 0.0).r;
    if (writing) {
      hR *= smoothstep(0.0, GROW, rt - writeT(tp + vec2(o2.x, 0.0)));
      hL *= smoothstep(0.0, GROW, rt - writeT(tp - vec2(o2.x, 0.0)));
      hD *= smoothstep(0.0, GROW, rt - writeT(tp + vec2(0.0, o2.y)));
      hU *= smoothstep(0.0, GROW, rt - writeT(tp - vec2(0.0, o2.y)));
    }
    vec2 grad = vec2(hR - hL, hD - hU) * 0.25 * uR;          // dh/dt of a circular tube == its normal tilt
    vec3 N = normalize(vec3(-grad, 1.0));
    N.xy *= 1.0 + clamp(dmag * 2.5, 0.0, 0.6);              // dragged glass gets a touch more relief
    if (dmag > 0.0005) {
      // the gel surface itself bends: highlights and reflections slide with the dent
      float de = 0.006;
      vec2 ex = vec2(de / uAspect, 0.0), ey = vec2(0.0, de);
      vec2 gm = vec2(length(flowAt(s + ex)) - length(flowAt(s - ex)),
                     length(flowAt(s + ey)) - length(flowAt(s - ey))) / (2.0 * de);
      N.xy += gm * 0.65;
      N = normalize(N);
    }

  // ---- lighting ----
  vec2 toM = uMouse - sa;
  vec3 V = vec3(0.0, 0.0, 1.0);
  float nz = clamp(N.z, 0.0, 1.0);
  float fres = pow(1.0 - nz, 2.0);
  float rimF = pow(1.0 - nz, 3.5);
  float up = -N.y;                                         // +1 faces the sky
  float thick = clamp(h, 0.0, 1.0);
  vec3 R = reflect(-V, N);                                 // mirror direction

  // key light, nudged a little by the cursor
  vec3 Ld = normalize(vec3(-0.42, -0.62, 0.78));
  vec3 Lm = normalize(vec3(clamp(toM * 0.9, -0.9, 0.9), 0.75));
  vec3 L = normalize(mix(Ld, Lm, 0.30 * uMouseAct));
  vec3 H = normalize(L + V);
  float ndl = dot(N, L);
  float calm = 1.0 - clamp(dmag * 2.0, 0.0, 0.30);        // fewer highlights while it is being dragged

  // 1) body: royal blue on top fading to milky frosted glass underneath
  vec3 blueHi = mix(vec3(0.205, 0.365, 0.880), vec3(0.28, 0.44, 0.94), uDark);
  vec3 blueLo = mix(vec3(0.420, 0.585, 0.945), vec3(0.34, 0.50, 0.90), uDark);
  vec3 milk   = mix(vec3(0.770, 0.840, 0.965), vec3(0.58, 0.68, 0.94), uDark);
  float vy = smoothstep(0.18, 0.98, tp.y + up * 0.07);
  col = mix(blueHi, milk, vy);
  col = mix(col, blueLo, smoothstep(0.05, 0.9, fres) * 0.55);
  col *= 0.80 + 0.30 * ndl;                                  // form shading

  // 2) inner light: sky on the upward faces, soft glow where light exits the lower lip
  float lower = smoothstep(0.0, 0.85, N.y);
  col += vec3(0.07, 0.11, 0.17) * smoothstep(-0.2, 0.9, up) * (1.0 - vy);
  col += vec3(0.09, 0.19, 0.30) * lower * (0.3 + 0.7 * thick) * (1.0 - uDark * 0.2);
  col += vec3(0.08, 0.15, 0.26) * pow(nz, 4.0) * 0.5;        // luminous core

  // 3) transparency: the sky refracted through the tube, with a hint of dispersion per channel
  vec3 refr;
  vec2 fl = dfl * 1.4 * h;                                   // liquid flowing inside the tube
  // sky: refracted per channel (dispersion). Stickers: a gentle lens-like look-through so they stay recognisable
  refr.r = skyAt(sa + N.xy * 0.060 * h + fl * 0.90).r;
  refr.g = skyAt(sa + N.xy * 0.069 * h + fl * 1.00).g;
  refr.b = skyAt(sa + N.xy * 0.078 * h + fl * 1.10).b;
  vec4 stL = stickerLayer(sa + N.xy * 0.022 * h + fl * 0.35);
  refr = stL.rgb + refr * (1.0 - stL.a);
  float see = (1.0 - smoothstep(0.0, 0.85, fres)) * 0.42;
  see = mix(see, max(see, 0.80), stL.a);                    // a sticker is falling right behind this bit of glass -> show it
  col = mix(col, refr * mix(vec3(0.97, 0.99, 1.0), vec3(0.62, 0.72, 1.0), uDark), see);

  // 3b) liquid flow: soft light/colour bands carried by the gel's motion (only exist while it moves)
  float amt = clamp(dmag * 9.0, 0.0, 1.0);
  if (amt > 0.002) {
    vec2 lp = vec2(tp.x * 9.0, tp.y * 4.0) + dfl * 22.0;
    float f1 = fbm(lp + vec2(uTime * 0.15, 0.0));
    float band = smoothstep(0.38, 0.78, f1);
    float core = smoothstep(0.05, 0.7, h) * (1.0 - 0.5 * fres);
    col = mix(col, col * vec3(0.80, 0.90, 1.05) + vec3(0.02, 0.05, 0.10), amt * (1.0 - band) * core * 0.55);   // deeper blue in the troughs
    col += vec3(0.50, 0.72, 1.00) * band * amt * core * 0.30;                                                   // glassy light in the crests
  }

  // 4) studio reflections: strong at grazing angles, still visible face-on
  vec3 envC = studioEnv(R, uDark);
  float F = 0.12 + 0.88 * rimF;
  col = col * (1.0 - F * 0.80) + envC * F * 0.92;
  col += envC * 0.05 * smoothstep(0.2, 1.0, nz);             // faint face-on mirror

  // 5) clear-coat: crisp glints + soft broad sheen
  float ndh = max(dot(N, H), 0.0);
  float spec  = pow(ndh, 260.0);
  float spec2 = pow(ndh, 60.0);
  float sheen = pow(ndh, 12.0);
  col += vec3(1.0) * spec * 1.9 + vec3(0.92, 0.97, 1.0) * spec2 * 0.30 * calm + vec3(0.8, 0.9, 1.0) * sheen * 0.07 * calm;
  // cool rim light from the lower right
  float rim = pow(max(dot(N, normalize(vec3(0.55, 0.60, 0.42))), 0.0), 14.0);
  col += vec3(0.45, 0.80, 1.00) * rim * 0.55;

  // 6) defined edge: deep-blue outline hugging the silhouette, with a bright inner lip just inside it
  float edge = smoothstep(0.80, 0.985, 1.0 - nz);
  col = mix(col, vec3(0.17, 0.30, 0.72), edge * 0.38);
  float lip = smoothstep(0.50, 0.78, 1.0 - nz) * (1.0 - smoothstep(0.78, 0.93, 1.0 - nz));
  col += vec3(0.45, 0.68, 1.0) * lip * 0.35 * (0.5 + 0.5 * up);

  // 7) thin-film iridescence, mostly at the edges and where the glass is being dragged
  vec3 irid = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + fres * 1.6 + tp.x * 0.8 + dmag * 3.0 + uTime * 0.02));
  col = mix(col, col * 0.80 + irid * 0.30, clamp(fres * 0.30 + dmag * 0.8, 0.0, 0.38));

  // fresh, glistening ink right behind the pen
  float tipBand = writing ? smoothstep(0.0, 0.004, rt - tC) * (1.0 - smoothstep(0.012, 0.05, rt - tC)) * (1.0 - smoothstep(0.97, 1.0, uIntro)) : 0.0;
  col += vec3(0.65, 0.85, 1.0) * tipBand * 0.55 * smoothstep(0.1, 0.8, h);

  // cursor-following sheen
  float mglow = exp(-dot(toM, toM) / 0.018) * uMouseAct;
  col += vec3(0.5, 0.7, 1.0) * mglow * 0.14 * smoothstep(0.0, 0.4, h);

  // sparkles
  vec2 sp[8] = vec2[8](
    vec2(0.176, 0.43), vec2(0.112, 0.70), vec2(0.405, 0.405), vec2(0.462, 0.84),
    vec2(0.585, 0.50), vec2(0.648, 0.80), vec2(0.866, 0.17), vec2(0.940, 0.52));
  float sparkle = 0.0;
  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    float tw = 0.5 + 0.5 * sin(uTime * (0.9 + 0.17 * fi) + fi * 2.3);
    tw = tw * tw * (3.0 - 2.0 * tw);
    vec2 d = (tp - sp[i]) * uBox.zw;
    sparkle += starAt(d, uBox.w * (0.05 + 0.075 * tw)) * (0.25 + 0.75 * tw);
  }
  col += vec3(1.0, 0.98, 0.95) * sparkle * smoothstep(0.1, 0.5, h) * 0.75 * smoothstep(0.88, 1.0, uIntro);

    // ---- coverage (anti-aliased with the height field's own derivative) ----
    float aa = clamp(0.5 * h / max(fwidth(h), 1e-4), 0.0, 1.0);
    cover = aa * smoothstep(0.0, 0.012, h);
    cover *= step(tC, rt);
  }

  // layered soft shadow: mip-blurred height field, offset down-right (smooth, no banding)
  vec3 bg = bgPlain;
  if (tp.x > -0.2 && tp.x < 1.2 && tp.y > -0.2 && tp.y < 1.2) {
    vec2 sTight = tp - vec2(0.008, 0.016) / uBox.zw;
    vec2 sWide  = tp - vec2(0.022, 0.042) / uBox.zw;
    float inT = step(0.0, sTight.x) * step(sTight.x, 1.0) * step(0.0, sTight.y) * step(sTight.y, 1.0);
    float inW = step(0.0, sWide.x) * step(sWide.x, 1.0) * step(0.0, sWide.y) * step(sWide.y, 1.0);
    float gT = writing ? smoothstep(0.0, 0.03, rt - 0.012 - writeT(sTight)) : 1.0;
    float gW = writing ? smoothstep(0.0, 0.03, rt - 0.012 - writeT(sWide)) : 1.0;
    float sh = textureLod(uHeight, sTight, 2.5).r * inT * 0.75 * gT + textureLod(uHeight, sWide, 4.5).r * inW * 0.55 * gW;
    float shadowA = smoothstep(0.0, 0.7, sh) * (1.0 - cover);
    vec3 shTint = mix(vec3(0.70, 0.78, 0.94), vec3(0.45, 0.55, 0.85), uDark);
    bg = mix(bgPlain, bgPlain * shTint, shadowA * 0.62);
  }

  vec3 outc = mix(bg, col, cover);
  outc += (hash21(fc + uTime) - 0.5) / 255.0;          // dither, kills banding in the gradients
  o = vec4(clamp(outc, 0.0, 1.0), 1.0);
}`;

/* ------------------------------------------------------------------ */

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error("shader: " + log);
  }
  return sh;
}
// With KHR_parallel_shader_compile the driver compiles on its own thread: we start all programs, keep the page responsive, and only
// touch a program (link status, uniforms) once `done()` says it has finished. Without the extension it behaves as before.
function program(gl, fs) {
  const par = gl.getExtension("KHR_parallel_shader_compile");
  const p = gl.createProgram();
  const vs = gl.createShader(gl.VERTEX_SHADER), fsh = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(vs, VERT); gl.compileShader(vs);
  gl.shaderSource(fsh, fs); gl.compileShader(fsh);
  gl.attachShader(p, vs); gl.attachShader(p, fsh);
  gl.linkProgram(p);
  const u = {};
  let finished = false;
  const finish = () => {
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error("link: " + gl.getProgramInfoLog(p) + gl.getShaderInfoLog(fsh));
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(p, i);
      u[info.name.replace(/\[0\]$/, "")] = gl.getUniformLocation(p, info.name);
    }
    finished = true;
  };
  const prog = { p, u, done() {
    if (finished) return true;
    if (par && !gl.getProgramParameter(p, par.COMPLETION_STATUS_KHR)) return false;
    finish(); return true;
  } };
  if (!par) finish();
  return prog;
}

function makeTarget(gl, w, h, encoded) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  if (encoded) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  gl.clearColor(encoded ? 0.5 : 0, encoded ? 0.5 : 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { tex, fbo, ok, w, h };
}

/**
 * @param {HTMLCanvasElement} canvas  full-size canvas (CSS size drives the render size)
 * @returns {{ pointer(x:number,y:number,inside:boolean):void, setDark(v:boolean):void, destroy():void } | null}
 */
export function createGlassScene(canvas, opts = {}) {
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "high-performance", preserveDrawingBuffer: !!opts.preserve });
  if (!gl) return null;

  let progFlow, progScene, progBg;
  try {
    progBg = program(gl, BG_FRAG);
    progFlow = program(gl, FLOW_FRAG);
    progScene = program(gl, SCENE_FRAG);
  } catch (e) {
    console.warn("[landing] WebGL shader failed", e);
    return null;
  }

  // the page-load overlay stays up until this scene has built its maps, compiled its shaders and drawn one warm frame
  const doneTask = loaderTask();
  let taskDone = false;
  const finishTask = () => { taskDone = true; doneTask(); };

  // float render targets if we can, otherwise 8-bit encoded
  gl.getExtension("EXT_color_buffer_float");
  gl.getExtension("EXT_color_buffer_half_float");
  gl.getExtension("OES_texture_float_linear");

  /* ---- height map ---- */
  // The two lookup maps (letter height field + pen timeline) are CPU-heavy to build. They are made in separate tasks AFTER the first
  // paint, so the page never freezes at start-up; the render loop simply waits until they (and the shaders) are ready.
  // On phones the height field is ~4x smaller (the glyphs are only ~400px wide there, so it is still sharper than the screen).
  const HSCALE = opts.heightScale || (IS_MOBILE ? 0.9 : 2.25);
  let hf = { w: 1, h: 1 }, wm = { total: 1 }, writeSeconds = 1, mapsReady = false;
  const heightTex = gl.createTexture();
  const writeTex = gl.createTexture();
  const buildHF = () => {
    hf = buildHeightField(HSCALE);
    gl.bindTexture(gl.TEXTURE_2D, heightTex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, hf.w, hf.h, 0, gl.RED, gl.FLOAT, hf.data);
    gl.generateMipmap(gl.TEXTURE_2D);                      // mips are only used for the soft shadow
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  };
  const buildWM = () => {
    wm = buildWriteMap();
    writeSeconds = (wm.total / PEN_SPEED) * 1.1;           // both pens move at PEN_SPEED, so the longer one sets the time
    gl.bindTexture(gl.TEXTURE_2D, writeTex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, wm.w, wm.h, 0, gl.RED, gl.FLOAT, wm.data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    mapsReady = true;
  };
  // gentle ease-in / ease-out of the pen (blend of linear and smoothstep): starts softly, glides, settles softly
  const easeWrite = (p) => p + (p * p * (3 - 2 * p) - p) * 0.45;
  let buildTimer = 0, buildRaf = 0;
  buildRaf = requestAnimationFrame(() => { buildTimer = setTimeout(() => { buildHF(); buildTimer = setTimeout(buildWM, 16); }, 0); });
  // falling-sticker sprite atlas (drawn behind the glass inside the shader)
  const sprites = opts.sprites || null;
  const atlasTex = gl.createTexture();
  let atlasVer = -1;
  gl.bindTexture(gl.TEXTURE_2D, atlasTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const spA = new Float32Array(64), spB = new Float32Array(32);
  const tubeR = (STROKE / 2) * HSCALE;

  /* ---- state ---- */
  const MAXD = 0.16;
  let W = 0, H = 0, aspect = 1, dpr = 1, quality = capDpr(2, 1.25);
  let flowA = null, flowB = null, encoded = false;
  let dark = 0, darkTarget = 0;
  let mouse = { x: 0, y: 0, tx: 0, ty: 0, has: false, inside: false, act: 0 };
  const drops = new Float32Array(64); let dropI = 0, lastDropX = 0, lastDropY = 0, lastDropT = -9, hadDrop = false;
  let last = performance.now();
  let t0 = performance.now();
  let raf = 0, destroyed = false, visible = true;
  let frameAvg = 16, slowFrames = 0, frameCount = 0;

  let qualityDirty = false;
  let renderScale = IS_MOBILE ? 0.8 : 1, paused = false;
  let sky = null;
  const allocSky = () => {
    const sw = Math.max(96, Math.round(W / 4)), sh = Math.max(64, Math.round(H / 4));
    if (sky && sky.w === sw && sky.h === sh) return;
    if (sky) { gl.deleteTexture(sky.tex); gl.deleteFramebuffer(sky.fbo); }
    sky = makeTarget(gl, sw, sh, true);
  };
  let cssW = 1, cssH = 1, sizeDirty = true;
  const ro = new ResizeObserver(() => { sizeDirty = true; });
  ro.observe(canvas);
  let activeUntil = 3.5;
  let introT0 = -1;

  const allocFlow = () => {
    const fw = IS_MOBILE ? 256 : 512;
    const fh = Math.max(96, Math.round(fw / aspect));
    for (const t of [flowA, flowB]) if (t) { gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fbo); }
    flowA = makeTarget(gl, fw, fh, encoded);
    if (!flowA.ok && !encoded) {
      encoded = true;
      gl.deleteTexture(flowA.tex); gl.deleteFramebuffer(flowA.fbo);
      flowA = makeTarget(gl, fw, fh, true);
    }
    flowB = makeTarget(gl, fw, fh, encoded);
  };

  const resize = () => {
    if (sizeDirty) {
      const r = canvas.getBoundingClientRect();
      cssW = Math.max(1, r.width); cssH = Math.max(1, r.height);
      sizeDirty = false;
    } else if (canvas.width === W && W > 0 && !qualityDirty) return;
    qualityDirty = false;
    dpr = quality * renderScale;
    W = Math.round(cssW * dpr);
    H = Math.round(cssH * dpr);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    const na = cssW / cssH;
    const changed = Math.abs(na - aspect) > 1e-4 || !flowA;
    aspect = na;
    if (changed) allocFlow();
    allocSky();
  };

  let cardT = 0, cardBottom = 0;
  const boxFor = () => {
    // text box in aspect units (1 = viewport height). Wide, centred, never taller than ~44% of the viewport
    let bw = (aspect < 1 ? 0.94 : 0.70) * aspect;
    const bh = bw * (MASK_H / MASK_W);
    const maxH = aspect < 1 ? 0.3 : 0.50;
    if (bh > maxH) bw = maxH * (MASK_W / MASK_H);
    const bhh = bw * (MASK_H / MASK_W);
    let cy = 0.51;
    if (aspect < 0.7) {
      // portrait phones: role line sits at the top and the headline at the bottom, so the lettering takes the optical centre between them
      cy = 0.47;
    }
    const cx = 0.495 * aspect;
    return [cx - bw / 2, cy - bhh / 2, bw, bhh];
  };

  /* ---- pointer ---- */
  const pointer = (x, y, inside = true) => {
    const cssH = canvas.clientHeight || 1;
    mouse.tx = x / cssH;
    mouse.ty = y / cssH;
    mouse.inside = inside;
    if (!mouse.has) { mouse.x = mouse.tx; mouse.y = mouse.ty; mouse.has = true; }
  };

  const drawTri = () => gl.drawArrays(gl.TRIANGLES, 0, 3);

  let progFail = false, warmFrames = 0;
  const progsOk = () => {
    if (progFail) return false;
    try { const a = progBg.done(), b = progFlow.done(), c = progScene.done(); return a && b && c; }
    catch (e) { progFail = true; finishTask(); console.warn("[landing] WebGL shader failed", e); return false; }
  };

  const frame = (now) => {
    if (destroyed) return;
    raf = requestAnimationFrame(frame);
    if (!visible || paused) { last = now; return; }
    if (!mapsReady || !progsOk()) { last = now; t0 = now; return; }
    // until the loader curtain opens: keep drawing (so everything gets warmed up) but hold the clock at zero, so the name is not
    // written and no sticker falls behind the loader
    const held = !isReleased() && !opts.fixedDt;
    if (held) {
      t0 = now;
      // a few frames are enough to warm shaders / textures: after that the hidden scene must not compete with the loader animation
      if (warmFrames >= 3 && taskDone) { last = now; return; }
      warmFrames++;
    }
    if (skipFrame(now, last)) return;
    const dt = opts.fixedDt || Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;
    if (opts.maxFrames && frameCount >= opts.maxFrames) return;
    frameCount++;

    // adaptive resolution: step down once if we are consistently slow
    frameAvg = frameAvg * 0.95 + dt * 1000 * 0.05;
    if (frameAvg > 21 && quality > 1) { if (++slowFrames > 12) { quality = quality > 1.4 ? Math.max(1, quality * 0.75) : 1; slowFrames = 0; qualityDirty = true; } } else slowFrames = 0;

    resize();

    // smooth pointer, splat the segment travelled this frame
    const k = 1 - Math.exp(-dt * 22);
    const px = mouse.x, py = mouse.y;
    if (mouse.has) { mouse.x += (mouse.tx - mouse.x) * k; mouse.y += (mouse.ty - mouse.y) * k; }
    mouse.act += ((mouse.inside ? 1 : 0) - mouse.act) * (1 - Math.exp(-dt * 4));
    const ax = px * 1, ay = py;
    const seg = [ax, ay, mouse.x, mouse.y];
    const speed = Math.hypot(seg[2] - seg[0], seg[3] - seg[1]);
    // pointer is tracked in aspect units because px/py are divided by css height

    dark += (darkTarget - dark) * (1 - Math.exp(-dt * 5));

    const tSec = (now - t0) / 1000;
    if (mouse.inside || speed > 1e-5) activeUntil = tSec + 4.0;
    const simulate = opts.fixedDt ? true : tSec < activeUntil;
    gl.disable(gl.BLEND);
    /* --- 1) update the gel: a few fixed sub-steps of a damped spring + wave simulation --- */
    const SUB = IS_MOBILE ? 2 : 3;
    const sdt = dt / SUB;
    const fu = progFlow.u;
    const texelsPerUnit = flowB.h;                       // 1 unit = viewport height
    const WAVE = 0.27;                                   // ripple speed, viewport-heights / second
    const K = Math.min(WAVE * WAVE * texelsPerUnit * texelsPerUnit, 0.30 / (sdt * sdt));
    const live = mouse.inside && mouse.has;
    gl.useProgram(progFlow.p);
    gl.uniform1i(fu.uPrev, 0);
    gl.uniform2f(fu.uRes, flowB.w, flowB.h);
    gl.uniform1f(fu.uAspect, aspect);
    gl.uniform1f(fu.uDt, sdt);
    gl.uniform4f(fu.uSeg, seg[0], seg[1], seg[2], seg[3]);
    gl.uniform2f(fu.uPtr, mouse.x, mouse.y);
    gl.uniform1f(fu.uRadius, 0.085 + Math.min(0.07, speed * 2.4));
    gl.uniform1f(fu.uPressR, 0.11);
    gl.uniform1f(fu.uPress, live ? 6.5 * mouse.act : 0.0);
    gl.uniform1f(fu.uDragD, live ? 0.40 : 0.0);
    gl.uniform1f(fu.uImpulse, live ? 6.5 : 0.0);
    gl.uniform1f(fu.uK, K);
    gl.uniform1f(fu.uS, 150.0);                          // ~2 Hz spring: soft, unhurried
    gl.uniform1f(fu.uDamp, 6.0);                         // under-damped: a couple of gentle overshoots, then calm
    gl.uniform1f(fu.uMax, MAXD);
    gl.uniform1f(fu.uEnc, encoded ? 1 : 0);
    gl.disable(gl.BLEND);
    gl.viewport(0, 0, flowB.w, flowB.h);
    for (let i = 0; simulate && i < SUB; i++) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, flowB.fbo);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, flowA.tex);
      gl.uniform1f(fu.uFirst, i === 0 ? 1 : 0);
      drawTri();
      const t = flowA; flowA = flowB; flowB = t;
    }

    if (sprites && !held) {
      // advance the sticker layer (piled physics + drifting paths) every frame
      const cssH2 = canvas.clientHeight || 1, cssW2 = canvas.clientWidth || 1;
      sprites.step(opts.time != null ? opts.time : (now - t0) / 1000, cssW2, cssH2, mouse.x * cssH2, mouse.y * cssH2, mouse.act > 0.05 && mouse.has, dt);
    }
    if (opts.sceneFrom && frameCount < opts.sceneFrom) return;   // (test hook: simulate without drawing)

    /* --- 1b) sky streaks at low resolution --- */
    gl.useProgram(progBg.p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, sky.fbo);
    gl.viewport(0, 0, sky.w, sky.h);
    gl.uniform2f(progBg.u.uRes, sky.w, sky.h);
    gl.uniform1f(progBg.u.uAspect, aspect);
    gl.uniform1f(progBg.u.uTime, opts.time != null ? opts.time : (now - t0) / 1000);
    gl.uniform1f(progBg.u.uDark, dark);
    {
      const tSec = opts.time != null ? opts.time : (now - t0) / 1000;
      if (mouse.inside && mouse.has) {
        const dd = Math.hypot(mouse.x - lastDropX, mouse.y - lastDropY);
        if (!hadDrop || (dd > 0.045 && tSec - lastDropT > 0.05)) {
          const sp = Math.min(1, dd * 9 + 0.35);
          drops[dropI * 4] = mouse.x; drops[dropI * 4 + 1] = mouse.y; drops[dropI * 4 + 2] = tSec; drops[dropI * 4 + 3] = 0.5 + 0.9 * sp;
          dropI = (dropI + 1) % 16; lastDropX = mouse.x; lastDropY = mouse.y; lastDropT = tSec; hadDrop = true;
        }
      } else hadDrop = false;
      if (progBg.u.uDrops) gl.uniform4fv(progBg.u.uDrops, drops);
    }
    drawTri();

    /* --- 2) scene --- */
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.useProgram(progScene.p);
    const su = progScene.u;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, heightTex);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, flowA.tex);
    gl.uniform1i(su.uHeight, 0);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, writeTex);
    gl.uniform1i(su.uFlow, 1);
    gl.uniform1i(su.uWrite, 2);
    gl.uniform2f(su.uRes, W, H);
    gl.uniform1f(su.uAspect, aspect);
    const tNow = (now - t0) / 1000;
    if (introT0 < 0 && (!sprites || sprites.loaded || tNow > 3)) introT0 = tNow + 0.3;   // start writing once the first (heavy) uploads are done
    if (sprites) {
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, atlasTex);
      if (sprites.version !== atlasVer) {
        atlasVer = sprites.version;
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sprites.atlas);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      }
      const n = Math.min(16, sprites.count);
      for (let i = 0; i < n; i++) {
        const o = i * 6;
        spA[i * 4] = sprites.data[o]; spA[i * 4 + 1] = sprites.data[o + 1]; spA[i * 4 + 2] = sprites.data[o + 2]; spA[i * 4 + 3] = sprites.data[o + 3];
        spB[i * 2] = sprites.data[o + 4]; spB[i * 2 + 1] = sprites.data[o + 5];
      }
      gl.uniform4fv(su.uSA, spA);
      gl.uniform2fv(su.uSB, spB);
      gl.uniform1i(su.uSN, n);
      gl.uniform1f(su.uPxU, H);
      gl.uniform1f(su.uCellPx, sprites.cell);
    } else {
      gl.uniform1i(su.uSN, 0);
    }
    gl.uniform1i(su.uAtlas, 3);
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, sky.tex);
    gl.uniform1i(su.uSky, 4);
    gl.uniform1f(su.uTime, opts.time != null ? opts.time : tNow);
    gl.uniform1f(su.uDark, dark);
    gl.uniform1f(su.uIntro, opts.intro != null ? opts.intro : (introT0 < 0 ? 0 : easeWrite(Math.min(1, Math.max(0, (tNow - introT0) / writeSeconds)))));
    const b = boxFor();
    gl.uniform4f(su.uBox, b[0], b[1], b[2], b[3]);
    gl.uniform2f(su.uHTex, hf.w, hf.h);
    gl.uniform1f(su.uR, tubeR);
    gl.uniform2f(su.uMouse, mouse.x, mouse.y);
    gl.uniform1f(su.uMouseAct, mouse.act);
    gl.uniform1f(su.uEnc, encoded ? 1 : 0);
    gl.uniform1f(su.uMax, MAXD);
    drawTri();
    if (!taskDone && (!sprites || (sprites.loaded && sprites.version === atlasVer))) finishTask();
  };

  const io = new IntersectionObserver((e) => { visible = e[0].isIntersecting; }, { threshold: 0 });
  io.observe(canvas);
  const onLost = (e) => e.preventDefault();
  canvas.addEventListener("webglcontextlost", onLost);

  resize();
  raf = requestAnimationFrame(frame);

  return {
    pointer,
    setDark(v) { darkTarget = v ? 1 : 0; },
    /** 0 = full quality, 1 = reduced resolution, 2 = frozen (keeps showing the last frame) */
    setLoad(m) {
      const rs = m === 1 ? 0.55 : IS_MOBILE ? 0.8 : 1;
      if (rs !== renderScale) { renderScale = rs; qualityDirty = true; }
      paused = m === 2;
    },
    destroy() {
      destroyed = true;
      finishTask();
      cancelAnimationFrame(raf);
      cancelAnimationFrame(buildRaf); clearTimeout(buildTimer);
      io.disconnect();
      ro.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
