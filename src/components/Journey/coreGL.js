import { program, NOISE } from "./glUtil.js";

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform float uZ; uniform float uA; uniform float uFlash; uniform float uCover; uniform float uPower;
out vec4 o;
${NOISE}
const float PITCH = 1.3, AISLE = 1.5, RH = 2.4, CEIL = 3.8, WALL = 5.3, LEN = 64.;
const vec3 GOLD = vec3(1., .70, .30), CYAN = vec3(.25, .75, 1.);

float sdBox(vec3 p, vec3 b){ vec3 q = abs(p) - b; return length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.); }

vec2 mapD(vec3 p){
  float d = p.y, m = 0.;
  float dc = CEIL - p.y; if(dc < d){ d = dc; m = 1.; }
  float dw = WALL - abs(p.x); if(dw < d){ d = dw; m = 2.; }
  vec3 q = p; q.z = mod(p.z + PITCH*.5, PITCH) - PITCH*.5; q.x = abs(p.x) - (AISLE + .55); q.y -= RH*.5;
  float dr = sdBox(q, vec3(.55, RH*.5, .6)); if(dr < d){ d = dr; m = 3.; }
  float dt = sdBox(vec3(abs(p.x) - 1.1, p.y - (CEIL - .35), 0.), vec3(.3, .07, 1.)); if(dt < d){ d = dt; m = 4.; }
  float de = LEN - p.z; if(de < d){ d = de; m = 5.; }
  return vec2(d, m);
}
vec3 nrm(vec3 p){ vec2 e = vec2(.003, 0.);
  return normalize(vec3(mapD(p+e.xyy).x - mapD(p-e.xyy).x, mapD(p+e.yxy).x - mapD(p-e.yxy).x, mapD(p+e.yyx).x - mapD(p-e.yyx).x)); }

vec2 march(vec3 ro, vec3 rd, int N){
  float t = .02; float m = -1.;
  for(int i = 0; i < 100; i++){
    if(i >= N) break;
    vec2 h = mapD(ro + rd*t);
    m = h.y;
    if(h.x < .0015*t + .0008) return vec2(t, m);
    t += h.x;
    if(t > 78.) return vec2(-1., -1.);
  }
  return t < 76. ? vec2(t, m) : vec2(-1., -1.);
}

float stripW(float z){ float d = abs(mod(z, 4.2) - 2.1); return exp(-d*d*1.1); }
vec3 lightAt(vec3 p){
  float w = stripW(p.z);
  float hgt = .55 + .45*clamp(p.y/CEIL, 0., 1.);
  return mix(vec3(.05,.07,.11), vec3(1.,.82,.55)*.9, w*hgt) * 1.0 + vec3(.012,.02,.035);
}

vec3 shade(vec3 p, vec3 n, float mat, vec3 rd, float t, bool refl){
  vec3 col = vec3(.012,.016,.024), em = vec3(0.);
  float fdst = smoothstep(7., 30., t);
  if(mat < .5){ // floor
    vec2 g = p.xz/.6; vec2 f = fract(g); vec2 id = floor(g);
    float ln = 1. - smoothstep(0., .035, min(min(f.x, 1.-f.x), min(f.y, 1.-f.y)));
    col = vec3(.014,.018,.026) + .006*hash(id);
    vec2 c = abs(fract(g*3.) - .5);
    col *= 1. - .55*smoothstep(.2, .14, length(c))*step(abs(p.x), 1.2);
    em += vec3(.05,.07,.1)*ln*(1.-fdst);
    float dash = step(.5, fract(p.z*.5 - uTime*.45));
    em += GOLD * smoothstep(.06, .0, abs(p.x)) * (.25 + .9*dash) * 1.1;
    em += CYAN * smoothstep(.025, .0, abs(abs(p.x) - 1.38)) * .7;
    em += CYAN * smoothstep(.02, .0, abs(abs(p.x) - .5)) * .12 * step(.5, fract(p.z*.8));
  } else if(mat < 1.5){ // ceiling
    vec2 g = p.xz/.6; vec2 f = fract(g);
    col = vec3(.012,.015,.022);
    em += vec3(.03,.04,.06) * (1. - smoothstep(0., .03, min(min(f.x, 1.-f.x), min(f.y, 1.-f.y))));
    float dz = abs(mod(p.z, 4.2) - 2.1);
    float strip = smoothstep(.17, .1, dz) * smoothstep(1.95, 1.75, abs(p.x));
    em += vec3(1.,.84,.58) * strip * 4.5;
    em += CYAN * smoothstep(.025, .0, abs(abs(p.x) - .62)) * .5;
  } else if(mat < 2.5){ // wall
    col = vec3(.010,.013,.020);
    em += GOLD * smoothstep(.04, .0, abs(p.y - .35)) * .35;
    em += CYAN * smoothstep(.03, .0, abs(p.y - 3.3)) * .45;
  } else if(mat < 3.5){ // racks
    vec3 side = vec3(0.);
    if(abs(n.x) > .5 && n.x*p.x < 0.){
      float lz = mod(p.z + PITCH*.5, PITCH) - PITCH*.5;
      float cell = floor((p.z + PITCH*.5)/PITCH) + (p.x > 0. ? 17. : 0.);
      float u = clamp((lz + .6)/1.2, 0., 1.), vv = p.y;
      col = vec3(.020,.025,.037);
      float bez = step(.04, u)*step(u, .96)*step(.1, vv)*step(vv, RH - .06);
      col = mix(vec3(.008,.01,.015), col, bez);
      float ny = 16.; float uy = (vv - .12)/(RH - .24)*ny;
      float id = floor(uy), fy = fract(uy);
      float h = hash(vec2(cell, id));
      float nrK = 1. - smoothstep(4., 24., t);
      float rate = .6 + h*3.;
      float tk = floor(uTime*rate + h*20.);
      if(bez > .5 && uy > 0. && uy < ny){
        if(h < .42){ // drive bays
          float cx = floor(u*8.), fx = fract(u*8.);
          float bay = step(.08, fx)*step(fx, .92)*step(.14, fy)*step(fy, .86);
          col += vec3(.03,.036,.05)*bay;
          float hh = hash3(vec3(cell, id, cx));
          float led = step(.12, fx)*step(fx, .32)*step(.4, fy)*step(fy, .62);
          float on = step(.28, hash3(vec3(cell, id, cx) + tk*.37));
          vec3 lc = hh > .93 ? vec3(1.,.2,.15) : (hh > .62 ? vec3(1.,.62,.2) : vec3(.2,1.,.5));
          em += lc * led * on * 2.6 * nrK;
          em += lc * .05 * on * (1.-nrK);
        } else if(h < .66){ // switch
          float cx = floor(u*14.), fx = fract(u*14.);
          float port = step(.15, fx)*step(fx, .85)*step(.2, fy)*step(fy, .7);
          col += vec3(.016,.02,.03)*port;
          float led = step(.3, fx)*step(fx, .7)*step(.74, fy)*step(fy, .9);
          float hh = hash3(vec3(cell, id, cx));
          float on = step(.2, hash3(vec3(cell, id, cx) + floor(uTime*(2.+hh*6.))));
          em += (hh > .5 ? CYAN : GOLD) * led * on * 2.4 * nrK;
          em += CYAN * .04 * (1.-nrK);
        } else if(h < .82){ // vent
          float v = step(.5, fract(u*34.));
          col += vec3(.012,.014,.02)*v*step(.2, fy)*step(fy, .8);
          float led = step(.06, u)*step(u, .09)*step(.4, fy)*step(fy, .62);
          em += vec3(.2,1.,.5) * led * 2. * nrK;
        } else { // compute node
          float bar = step(.08, u)*step(u, .92)*step(.3, fy)*step(fy, .7);
          float pulse = .55 + .45*sin(uTime*2. + h*40. + p.z*.4);
          em += GOLD * bar * pulse * .55 * (.4 + .6*nrK);
          col += vec3(.02,.02,.025)*bar;
        }
        col += vec3(.02,.024,.035) * step(.94, fy);
      }
      em += CYAN * smoothstep(.03, .0, abs(vv - (RH - .1))) * .5;
      float gl = pow(1. - abs(dot(n, -rd)), 3.);
      col += vec3(.04,.055,.085) * gl;
    } else { col = vec3(.008,.01,.014); }
  } else if(mat < 4.5){ // cable tray
    col = vec3(.02,.024,.032);
    if(n.y < -.5){
      float dash = step(.68, fract(p.z*.55 - uTime*.9 + (p.x > 0. ? .3 : 0.)));
      em += CYAN * dash * .9 * smoothstep(.22, .1, abs(abs(p.x) - 1.1));
    }
  } else { // portal wall at the end: THE CORE
    vec2 pp = p.xy - vec2(0., 1.9);
    float r = length(pp), ang = atan(pp.y, pp.x);
    col = vec3(.006,.008,.012);
    float core = exp(-r*1.2);
    em += vec3(1.,.8,.45) * core * 2.2;
    em += vec3(1.,.97,.9) * smoothstep(.55, .0, r) * 5.;
    float ringA = smoothstep(.04, .0, abs(r - .95));
    float ringB = smoothstep(.035, .0, abs(r - 1.45));
    float ringC = smoothstep(.03, .0, abs(r - 2.05));
    float tk1 = step(.55, fract(ang*9.549 + uTime*.35));
    float tk2 = step(.45, fract(ang*14. - uTime*.5));
    float tk3 = step(.6, fract(ang*20. + uTime*.7));
    em += GOLD * ringA * (.4 + 1.8*tk1) * 1.6;
    em += CYAN * ringB * (.3 + 1.6*tk2) * 1.4;
    em += vec3(1.,.9,.7) * ringC * (.3 + 1.2*tk3);
    em += CYAN * .5 * smoothstep(.02, .0, abs(r - 2.8)) * step(.5, fract(ang*5. - uTime*.2));
    float rays = pow(abs(sin(ang*12. + uTime*.3)), 40.) * exp(-r*.7);
    em += GOLD * rays * .8;
  }
  float mt = (mat > 4.5) ? 1. : 1.;
  vec3 L = lightAt(p);
  vec3 outc = col * L * 2.2 + em;
  float fg = 1. - exp(-t*.014);
  outc = mix(outc, vec3(.03,.03,.04) + GOLD*.012, fg);
  return outc;
}

void main(){
  vec2 uv = (gl_FragCoord.xy - .5*uRes) / uRes.y;
  float z0 = mix(1.5, LEN - 9., uZ);
  vec3 ro = vec3(.12*sin(z0*.31), 1.55 + .035*sin(z0*2.3), z0);
  vec3 tg = vec3(.05*sin(z0*.31 + .6), 1.7 + .02*sin(z0*1.3), z0 + 6.);
  vec3 fw = normalize(tg - ro), rt = normalize(cross(vec3(0,1,0), fw)), up = cross(fw, rt);
  vec3 rd = normalize(fw*1.55 + rt*uv.x + up*uv.y);

  vec2 hit = march(ro, rd, 96);
  vec3 col = vec3(.02,.02,.03);
  float tH = hit.x;
  if(tH > 0.){
    vec3 p = ro + rd*tH;
    vec3 n = nrm(p);
    col = shade(p, n, hit.y, rd, tH, false);
    if(hit.y < .5){ // glossy floor reflection
      vec3 r2 = reflect(rd, n);
      vec2 h2 = march(p + n*.01, r2, 48);
      vec3 rc = vec3(.02,.02,.03);
      if(h2.x > 0.){ vec3 p2 = p + n*.01 + r2*h2.x; rc = shade(p2, nrm(p2), h2.y, r2, h2.x + tH, true); }
      float fr = .14 + .5*pow(1. - abs(dot(n, -rd)), 4.);
      float hole = 1.;
      col = mix(col, rc, fr*hole);
    }
  } else tH = 78.;

  // volumetric haze lit by the ceiling strips + dust
  vec3 vol = vec3(0.);
  float jit = hash(gl_FragCoord.xy + fract(uTime)*17.);
  float vt = min(tH, 42.);
  for(int i = 0; i < 20; i++){
    float s = (float(i) + jit)/20.*vt;
    vec3 sp = ro + rd*s;
    float w = stripW(sp.z);
    float inside = smoothstep(1.9, 1.2, abs(sp.x)) * smoothstep(CEIL, CEIL - 1.2, sp.y);
    float dens = .02 + .05*fbm3(sp.xz*.35 + uTime*.03);
    vol += (GOLD*w*1.1 + vec3(.08,.12,.2)*.4) * inside * dens * (vt/20.) * .32;
    vec3 dc = sp*3.5 + vec3(0., uTime*.05, 0.);
    vec3 di = floor(dc);
    vec3 dpos = vec3(hash3(di+1.3), hash3(di+7.1), hash3(di+3.7));
    float dd = length(fract(dc) - dpos);
    float dmo = step(.82, hash3(di)) * smoothstep(.07, .0, dd);
    vol += vec3(1.,.85,.6) * dmo * inside * .5 * (1. - smoothstep(8., 30., s));
  }
  col += vol;

  // scanning rings the camera flies through
  for(int k = 0; k < 6; k++){
    float zr = 10. + float(k)*9.5;
    float tt = (zr - ro.z)/rd.z;
    if(tt > 0. && (hit.x < 0. || tt < hit.x)){
      vec3 hp = ro + rd*tt;
      float e = length(vec2(hp.x/1.42, (hp.y - 1.9)/1.8));
      float gl = exp(-pow((e - 1.)*16., 2.));
      float ang = atan(hp.y - 1.9, hp.x);
      float tick = .45 + .55*step(.5, fract(ang*5.093 + uTime*.4*(k%2==0?1.:-1.)));
      float inten = .25 + .75*pow(.5 + .5*sin(uTime*1.6 - float(k)*1.1), 3.);
      float near = smoothstep(1., 5., abs(tt));
      col += mix(GOLD, CYAN, .25 + .5*mod(float(k),2.)) * gl * tick * inten * 1.5 * near;
      col += GOLD * exp(-pow((e - .86)*30., 2.)) * .35 * inten * near * step(e, 1.);
    }
  }

  // grade
  float vg = 1. - .55*dot(uv*vec2(.85,1.1), uv*vec2(.85,1.1));
  col *= clamp(vg, 0., 1.);
  col += (hash(gl_FragCoord.xy + uTime) - .5) * .018;
  // filmic
  col = (col*(2.51*col + .03))/(col*(2.43*col + .59) + .14);
  col = pow(clamp(col, 0., 1.), vec3(.92));
  float pw = uPower*uPower*(3.-2.*uPower);
  float fl = step(.5, hash(vec2(floor(uTime*14.), 3.7))) * (1.-pw)*smoothstep(.0,.3,uPower);
  col *= mix(.05, 1., pw) + fl*.25;
  float al = 1. - (1.-uCover)*(1.-uA);
  vec3 fcol = GOLD * uFlash * max(1.1 - length(uv)*.9, 0.) * .9;
  o = vec4(col*uA + fcol, al);
}`;

export function createCore(gl) {
  const pr = program(gl, FRAG);
  if (!pr) return null;
  return {
    draw(w, h, z, a, flash, t, cover, power) {
      gl.useProgram(pr.p);
      gl.bindVertexArray(pr.vao);
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform2f(pr.uni.uRes, w, h);
      gl.uniform1f(pr.uni.uTime, t);
      gl.uniform1f(pr.uni.uZ, z);
      gl.uniform1f(pr.uni.uA, a);
      gl.uniform1f(pr.uni.uFlash, flash);
      gl.uniform1f(pr.uni.uCover, cover);
      gl.uniform1f(pr.uni.uPower, power);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disable(gl.BLEND);
    },
  };
}
