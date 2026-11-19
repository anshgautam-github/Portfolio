// clouds.js - the loader -> landing transition: a real-looking cloud bank, drawn live with a small WebGL shader (domain-warped fbm).
// You have just fallen through the cloud deck, so the site is revealed the same way: clouds billow in from every side and rush toward the
// lens (zoom + drift), fill the window, hide the hand-over, then part from the centre outward, with sun-lit tops, blue-grey shadowed
// bellies, a warm rim and a few soft light shafts, to show the landing underneath. k runs 0 -> 1.
const VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
const FS = `
precision highp float;
uniform vec2 uRes; uniform float uT; uniform float uK;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y); }
float fbm(vec2 p){ float v = 0., a = .5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6); for (int i = 0; i < 6; i++) { v += a * noise(p); p = m * p; a *= .5; } return v; }
float cloud(vec2 p, float t){
  vec2 q = vec2(fbm(p + vec2(0., t * .05)), fbm(p + vec2(5.2, 1.3) - vec2(t * .04, 0.)));
  return fbm(p + 1.7 * q + vec2(t * .035, -t * .01));
}
void main(){
  vec2 uv = (gl_FragCoord.xy - .5 * uRes) / uRes.y;
  float k = uK, t = uT;
  float cin = smoothstep(0., .44, k), cout = smoothstep(.5, 1., k);
  // flying through the cloud: the whole bank expands toward the lens while it drifts
  float zoom = 1. + 1.9 * smoothstep(0., 1., k);
  vec2 p = uv / zoom * 2.3 + vec2(.0, -k * .5);
  float d = cloud(p, t);
  // sun from the upper left: compare the density a step toward the sun (silver lining on the lit side, dark belly away from it)
  float dl = cloud(p + vec2(-.07, .09), t);
  float lit = clamp((d - dl) * 5.5 + .55, 0., 1.);
  // coverage: threshold falls while the clouds roll in, then rises from the centre outward as they part
  float r = length(uv);
  float open = clamp(cout * 1.55 - r * .75, 0., 1.) * 1.35;
  float thr = mix(1.05, -.25, cin) + open + smoothstep(.88, 1., k) * 1.3;
  float a = smoothstep(thr, thr + .26, d);
  a = max(a, cin * (1. - cout) * .22);                               // a soft overall veil so the fill never looks patchy
  // colour: warm sunlit tops, cool blue-grey bellies, a warm rim on the thin edges
  vec3 shade = vec3(.50, .58, .72), sun = vec3(1., .97, .92);
  vec3 col = mix(shade, sun, lit * (.55 + .45 * smoothstep(thr, thr + .4, d)));
  float edge = a * (1. - a) * 4.;
  col = mix(col, vec3(1., .80, .58), edge * .35 * lit);
  // light shafts burst through while the cloud opens
  float shaft = pow(max(0., 1. - abs(uv.x + uv.y * .45 + .1 * sin(t * .4)) * 1.8), 3.) * cout * (1. - smoothstep(.85, 1., k)) * .22;
  col += vec3(1., .93, .78) * shaft;
  gl_FragColor = vec4(col * a, a);
}`;

export function createClouds(canvas) {
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
  const vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return null;
  const pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
  gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uRes = gl.getUniformLocation(pr, 'uRes'), uT = gl.getUniformLocation(pr, 'uT'), uK = gl.getUniformLocation(pr, 'uK');
  // the cloud is soft by nature: render at ~half resolution and let the browser smooth it up
  const resize = () => {
    const s = Math.min(0.55, 900 / Math.max(1, canvas.clientWidth)) * Math.min(devicePixelRatio || 1, 1.5);
    const w = Math.max(2, Math.round(canvas.clientWidth * s)), h = Math.max(2, Math.round(canvas.clientHeight * s));
    if (w !== canvas.width || h !== canvas.height) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  resize();
  return {
    resize,
    draw(k, t) {
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uRes, canvas.width, canvas.height); gl.uniform1f(uT, t); gl.uniform1f(uK, k);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    destroy() { const e = gl.getExtension('WEBGL_lose_context'); if (e) e.loseContext(); },
  };
}
