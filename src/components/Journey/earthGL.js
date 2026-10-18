import { program, NOISE } from "./glUtil.js";

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes; uniform vec2 uOff; uniform float uR; uniform vec2 uLL;
uniform float uTime; uniform float uHaze; uniform float uDot; uniform sampler2D uWorld; uniform sampler2D uReg;
out vec4 o;
${NOISE}
const float PI = 3.14159265;

vec3 stars(vec2 p){
  vec3 c = mix(vec3(.004,.008,.02), vec3(.012,.02,.05), p.y*.5+.5);
  c = mix(c, vec3(.03,.016,.008)*(.6+.8*noise(p*1.7+3.)), uDot*smoothstep(-.4,.9,p.y)*.9);
  vec2 g = p*60.; vec2 id = floor(g); vec2 f = fract(g)-.5;
  float h = hash(id);
  if(h > .965){
    vec2 off = vec2(hash(id+3.1), hash(id+7.7))-.5; off*=.6;
    float d = length(f-off);
    float tw = .6+.4*sin(uTime*(1.+h*3.)+h*40.);
    c += vec3(.8,.9,1.) * smoothstep(.09,.0,d) * (h-.9)*9. * tw;
  }
  float neb = fbm(p*1.3+4.); c += vec3(.02,.03,.07)*smoothstep(.45,.8,neb);
  return c;
}

void main(){
  vec2 p = (gl_FragCoord.xy - .5*uRes) / (.5*uRes.y);
  vec3 col = stars(p);
  vec2 q = (p - uOff) / uR;
  float r = length(q);
  vec3 L = normalize(vec3(-.55,.5,.65));

  // atmosphere halo outside the limb
  float outside = max(r-1., 0.);
  float halo = exp(-outside*uR*7.) * step(1., r);
  float lit = smoothstep(-.5,.7, dot(r>0.001? q/r : vec2(0.), L.xy));
  float topw = smoothstep(-.25,.5, r>0.001 ? q.y/r : 0.);
  vec3 hcol = mix(vec3(.18,.45,1.), mix(vec3(.25,.5,1.), vec3(1.,.5,.16), topw), uDot);
  col += hcol * halo * (.25+.9*lit) * (.85 + .7*uDot*topw);
  col += mix(vec3(.35,.6,1.), mix(vec3(.4,.65,1.), vec3(1.,.72,.45), topw), uDot) * exp(-outside*uR*40.) * step(1., r) * (.2+lit) * .6;

  float fw = fwidth(r);
  float body = 1. - smoothstep(1.-fw, 1.+fw, r);
  if(body > 0.001){
    float z = sqrt(max(1.-r*r, 0.));
    vec3 n = vec3(q, z);
    float lo = uLL.x, la = uLL.y;
    vec3 f = vec3(cos(la)*cos(lo), cos(la)*sin(lo), sin(la));
    vec3 e = vec3(-sin(lo), cos(lo), 0.);
    vec3 nn = cross(f, e);
    vec3 P = e*n.x + nn*n.y + f*n.z;
    float lon = atan(P.y, P.x), lat = asin(clamp(P.z,-1.,1.));
    vec2 uv = vec2(lon/(2.*PI)+.5, .5-lat/PI);
    // fractal coastline: warp the lookup a little (in degrees)
    vec2 w = vec2(noise3(P*90.), noise3(P*90.+9.)) - .5;
    vec2 w2 = vec2(noise3(P*300.), noise3(P*300.+5.)) - .5;
    vec2 wd = w*.2 + w2*.045;
    vec2 uvw = uv + wd/vec2(360.,180.);
    float mW = textureLod(uWorld, uvw, .3).r;
    float sh = textureLod(uWorld, uv, 3.2).r;
    float dlon = degrees(lon), dlat = degrees(lat);
    vec2 rg = vec2((dlon-50.)/60., (40.-dlat)/45.) + wd/vec2(60.,45.);
    float inR = smoothstep(0.,.02,rg.x)*smoothstep(1.,.98,rg.x)*smoothstep(0.,.02,rg.y)*smoothstep(1.,.98,rg.y);
    float mR = textureLod(uReg, rg, 0.).r;
    float m = mix(mW, mR, inR);
    float fwm = fwidth(m);
    float land = smoothstep(.5-fwm*1.3-.015, .5+fwm*1.3+.015, m);
    float zw = smoothstep(1.8,3.6,uR);

    float dif = dot(n, L);
    float day = smoothstep(-.12,.5,dif);

    // ocean
    vec3 deep = vec3(.006,.05,.14), shal = vec3(.03,.34,.48);
    vec3 ocean = mix(deep, shal, smoothstep(.04,.55,sh)*.85);
    float shR = mix(sh, textureLod(uReg, rg, 3.2).r, inR);
    ocean = mix(ocean, vec3(.05,.46,.56), smoothstep(.08,.8,shR)*.5*(1.-land));
    ocean += vec3(.012,.02,.03) * (noise3(P*900.+uTime*.05)-.5) * zw;
    ocean += vec3(.05,.12,.22) * pow(1.-z, 2.) ;
    vec3 Hh = normalize(L + vec3(0,0,1));
    ocean += vec3(1.,.95,.85) * pow(max(dot(n,Hh),0.), 90.) * .55 * (1.-land);

    // land
    float ar = abs(lat);
    float dry = smoothstep(.1,.5, fbm(vec2(lon*3.,lat*3.)) ) * smoothstep(.65,.2,ar) * smoothstep(.1,.35,ar);
    dry = max(dry, smoothstep(.12,.36,ar)*smoothstep(.62,.38,ar)*.55);
    // India and surroundings read greener
    vec2 dI = vec2((lon-1.38)*1.1,(lat-.3)); dry *= smoothstep(.12,.45,length(dI));
    vec3 green = vec3(.1,.27,.09), tan = vec3(.58,.46,.27);
    vec3 ground = mix(green, tan, dry);
    ground *= .62 + .7*fbm3d(P*26.) + .25*(noise3(P*140.)-.5);
    ground *= 1. + zw*((fbm3d(P*260.)-.5)*.55 + (noise3(P*900.)-.5)*.35 + (noise3(P*2600.)-.5)*.2);
    float ice = smoothstep(1.13,1.28, ar) ;
    ground = mix(ground, vec3(.9,.94,1.), ice);
    ground = mix(ground, vec3(.9,.94,1.), smoothstep(.62,.7, fbm(vec2(lon*5.,lat*5.)+20.))*smoothstep(.5,.62,ar)*.3);

    // relief: Himalaya + noise, lit from the upper left
    float him = exp(-pow((dlat-30.5+(dlon-85.)*.08)/3.2,2.)) * smoothstep(68.,76.,dlon)*(1.-smoothstep(100.,106.,dlon));
    float hh = land * (.5*fbm3d(P*11.) + 1.1*him*(.7+.5*fbm3d(P*22.)) + zw*(.07*fbm3d(P*70.) + .025*fbm3d(P*230.)));
    vec2 dd = vec2(dFdx(hh), dFdy(hh)) * (uRes.y*.5*uR);
    float rs = clamp(dot(dd, vec2(-.7,.7))*.05, -.4, .4);
    ground = mix(ground, tan*.9, clamp(him*.9,0.,1.));
    ground = mix(ground, vec3(.92,.95,1.), smoothstep(.9,1.25, him*(.7 + fbm3d(P*30.)*.9 + zw*.4*fbm3d(P*160.)))*.9);
    ground *= 1. + rs;
    vec3 surf = mix(ocean, ground, land);
    surf += vec3(.8,.9,1.) * (1.-smoothstep(0., fwm*2.5+.03, abs(m-.5))) * .3 * zw;
    surf *= .14 + 1.05*day;
    // coast shimmer
    surf += vec3(.2,.5,.6) * smoothstep(.15,.5,m) * (1.-land) * .25 * day;

    // city lights on the night side
    float nightM = (1.-smoothstep(-.18,.12,dif)) * land;
    float cityN = smoothstep(.6,.78, noise3(P*55.)) * smoothstep(.4,.6,fbm3d(P*9.));
    surf += vec3(1.,.72,.35) * cityN * nightM * 1.2;

    // clouds
    float indM = 1. - smoothstep(9., 20., length(vec2((dlon-79.)*.9, dlat-20.)));
    float cthr = .64 + .06*zw + .12*indM;
    vec3 cp = P*3.0 + vec3(uTime*.012, uTime*.006, 0.);
    float c = fbm3d(cp)*.72 + fbm3d(cp*5.3+4.)*.28;
    float cdet = fbm3d(cp*13.+9.);
    float cl = smoothstep(cthr, cthr + mix(.14,.06,zw), c + (cdet-.5)*.1);
    vec3 cps = cp + vec3(.03,-.05,.02);
    float cs = fbm3d(cps)*.72 + fbm3d(cps*5.3+4.)*.28;
    surf *= 1. - .4*smoothstep(cthr,cthr+.08,cs)*(1.-cl)*day;
    float hz = uHaze * smoothstep(.3,.62, c + uHaze*.2);
    cl = max(cl*.92, hz);
    float thick = smoothstep(cthr,cthr+.18,c);
    vec3 ccol = mix(vec3(.74,.8,.92), vec3(1.), thick) * (.82 + .3*cdet) * (.12 + 1.05*day);
    surf = mix(surf, ccol, clamp(cl,0.,1.));

    // ---- stylised dotted globe (orbit stage) ----
    if(uDot > .001){
      float dl = .0285;
      float rowi = floor(lat/dl);
      float latc = (rowi + .5)*dl;
      float nn2 = max(1., floor(6.2832*cos(latc)/dl));
      float coli = floor((lon + PI)/(2.*PI)*nn2);
      float lonc = (coli + .5)/nn2*2.*PI - PI;
      vec2 dd2 = vec2((lon-lonc)*cos(latc), lat-latc);
      float dist = length(dd2);
      vec2 uvC = vec2(lonc/(2.*PI)+.5, .5 - latc/PI);
      float mWc = textureLod(uWorld, uvC, 1.).r;
      vec2 rgC = vec2((degrees(lonc)-50.)/60., (40.-degrees(latc))/45.);
      float inRc = step(0.,rgC.x)*step(rgC.x,1.)*step(0.,rgC.y)*step(rgC.y,1.);
      float mRc = textureLod(uReg, rgC, 0.).r;
      float landC = smoothstep(.42,.56, mix(mWc, mRc, inRc));
      float hh = hash(vec2(coli, rowi));
      float rad = dl*(.135 + .04*hh);
      float dotv = smoothstep(rad, rad*.5, dist) * landC;
      float difD = dot(n, L);
      float lightD = .35 + .65*smoothstep(-.35,.6,difD);
      float tw = .85 + .15*sin(uTime*1.7 + hh*60.);
      vec3 dcol = mix(vec3(.9,.92,1.), vec3(1.,.93,.82), smoothstep(.0,.8,n.y)) * lightD * tw;
      vec3 oc = vec3(.003,.006,.016) + vec3(.01,.03,.08) * pow(max(1.-z,0.), 2.2);
      // a faint graticule on the ocean
      float gl1 = smoothstep(.012,.0, abs(fract(degrees(lon)/15.)-.5)-.49) ;
      float gl2 = smoothstep(.012,.0, abs(fract(degrees(lat)/15.)-.5)-.49);
      oc += vec3(.02,.05,.1) * max(gl1,gl2) * .5;
      vec3 sd = oc + dcol * dotv * 1.4;
      // rim light: warm on top, cool on the bottom
      float rimk = pow(1.-z, 2.4);
      float tw2 = smoothstep(-.1,.55, n.y);
      sd += mix(vec3(.12,.34,1.), vec3(1.,.5,.15), tw2) * rimk * 1.35;
      sd += mix(vec3(.2,.5,1.), vec3(1.,.7,.4), tw2) * pow(1.-z, 9.) * .9;
      surf = mix(surf, sd, uDot);
    }
    // atmosphere on the sphere
    float rim = pow(1.-z, 3.);
    surf += vec3(.22,.5,1.) * rim * (.25 + 1.2*day) * 1.4 * (1.-uDot);
    surf = mix(surf, surf + vec3(.1,.2,.4)*.5, pow(1.-z,1.5)*.4*(1.-uDot));
    col = mix(col, surf, body);
  }

  // faint warm glow top-left (sun)
  col += vec3(1.,.8,.55) * exp(-length(p-vec2(-1.5,1.1))*1.6) * .09;
  float vg = 1. - .35*dot(p*.5,p*.5);
  col *= vg;
  col = pow(col, vec3(.93));
  o = vec4(col, 1.);
}`;

export function createEarth(gl) {
  const pr = program(gl, FRAG);
  if (!pr) return null;
  return {
    draw(w, h, s, t) {
      gl.useProgram(pr.p);
      gl.bindVertexArray(pr.vao);
      gl.uniform2f(pr.uni.uRes, w, h);
      gl.uniform2f(pr.uni.uOff, s.off[0], s.off[1]);
      gl.uniform1f(pr.uni.uR, s.R);
      gl.uniform2f(pr.uni.uLL, s.lo, s.la);
      gl.uniform1f(pr.uni.uTime, t);
      gl.uniform1f(pr.uni.uHaze, s.haze);
      gl.uniform1f(pr.uni.uDot, s.dot);
      gl.uniform1i(pr.uni.uWorld, 0);
      gl.uniform1i(pr.uni.uReg, 1);
      gl.disable(gl.BLEND);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}
