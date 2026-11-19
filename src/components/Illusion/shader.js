// shader.js - the "illusion": a tilted, terraced, pearl bowl whose every sharp edge splits light into a rainbow.
// Rings live in log-polar space, so scrolling (uZ) pushes them outward forever = a dive into the centre.
export const VERT = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;

export const FRAG = `
precision highp float;
uniform vec2  uR;     // canvas px
uniform vec2  uM;     // pointer -1..1
uniform vec2  uC;     // centre of the bowl
uniform float uT;     // time
uniform float uZ;     // dive depth
uniform float uSat;   // 0 pearl .. 1 full spectrum bands
uniform float uHole;  // 0 .. 1 the void swallows the screen
uniform float uIn;    // arrive from the previous section
uniform float uP;     // progress
uniform float uWob;   // ring wobble
uniform float uTilt;  // viewing angle (1.6 = looking across, 1.0 = looking straight down)
const float K = 5.4;

vec3 pal(float t){ return 0.55 + 0.45 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67))); }
float hash(vec2 p){ p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }

// x: ring coordinate, y: warped log radius, z: radius
vec3 F(vec2 uv){
  vec2 p = mat2(0.94, -0.34, 0.34, 0.94) * uv;
  p.y *= uTilt;
  float r  = length(p) + 1e-4;
  float an = atan(p.y, p.x);
  float lr = log(r);
  float w = uWob * (0.15 * sin(2.0 * an + 0.85 * lr + uT * 0.23)
                  + 0.085 * sin(3.0 * an - 1.30 * lr - uT * 0.17 + uP * 5.0)
                  + 0.04 * sin(5.0 * an + 2.10 * lr + uT * 0.30))
          + uWob * uWob * 0.035 * sin(4.0 * an + 1.7 * lr - uT * 0.2);
  float lp = lr + w;
  return vec3(lp * K - uZ, lp, r);
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * uR) / uR.y;
  uv -= uC + uM * vec2(0.05, 0.035);

  vec3 a = F(uv);
  float x = a.x;

  // shadow wall: deep on the side of a ring that faces away from the light, shallow where it faces it
  vec2  Ld = normalize(vec2(0.55, 0.83) + uM * 0.3);
  float facing = dot(normalize(uv + 1e-4), Ld);
  float dk = 0.24 + 0.54 * (0.5 - 0.5 * facing);

  // sawtooth terrace: sharp edge, then a soft ramp up to the pearl plateau; each channel is shifted a little (dispersion = rainbow fringe)
  float fR = fract(x), fG = fract(x + 0.050), fB = fract(x + 0.105);
  vec3 sh = vec3(1.0 - dk * (1.0 - smoothstep(0.0, 0.88, fR)),
                 1.0 - dk * (1.0 - smoothstep(0.0, 0.88, fG)),
                 1.0 - dk * (1.0 - smoothstep(0.0, 0.88, fB)));

  // the plateaus take the band colour as we go deeper
  float band = floor(x);
  vec3 tint = 0.72 + 0.27 * cos(6.28318 * (band * 0.16 + fR * 0.22 + uT * 0.01 + vec3(0.0, 0.33, 0.67)));   // muted: dusty orange, blue, sage, mauve
  vec3 lit  = mix(vec3(1.0), tint, uSat * 0.68);
  vec3 col  = lit * sh * 0.94;

  // thin spectral line riding each edge (orange / yellow / green / blue / pink)
  vec3 fr = pal(fR * 3.6 + 0.08) * exp(-fR * 9.5);
  col += fr * 0.34 * (0.35 + 0.65 * dk) * (1.0 - 0.45 * uSat);

  // too dense to resolve near the centre of the bowl: melt into smooth pearl instead of moire
  float ringPx = a.z / K * uR.y;
  col = mix(vec3(0.80, 0.80, 0.82), col, smoothstep(1.3, 5.0, ringPx));

  col += (1.0 - 0.5 * uSat) * 0.30 * exp(-length(uv - vec2(0.36, -0.04)) * 2.1);   // blown-out glare, lower right

  // the opening
  float holeL = mix(-7.6, 2.5, uHole);
  float aa = (2.0 / uR.y) / exp(a.y);
  float inside = smoothstep(-aa, aa, holeL - a.y);
  float d = a.y - holeL;
  float near = exp(-max(d, 0.0) * K * 1.1);
  col *= 1.0 - 0.40 * near * step(0.0001, uHole);
  col += vec3(1.0, 0.56, 0.26) * exp(-pow(d / 0.04, 2.0)) * 0.45 * step(0.0, d) * smoothstep(0.0, 0.2, uHole);

  col *= 1.0 - 0.34 * uSat * (1.0 - uHole) * exp(-pow(length(uv * vec2(0.62, 1.5)) / 0.40, 2.0));   // pool of shade under the type
  col *= 0.80 + 0.20 * smoothstep(1.4, 0.25, length(uv));
  col = mix(vec3(0.016, 0.027, 0.06), col, uIn);
  col = mix(col, vec3(0.0), inside);
  col += (hash(gl_FragCoord.xy + fract(uT) * 91.0) - 0.5) * 0.04 * (1.0 - inside);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;
