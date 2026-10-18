import { program, NOISE } from "./glUtil.js";

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes; uniform vec2 uC; uniform float uSpan; uniform float uTilt;
uniform float uTime; uniform float uHaze; uniform float uCloud; uniform float uNight;
uniform float uDark; uniform float uAlpha; uniform sampler2D uReg;
out vec4 o;
${NOISE}
const vec4 REG = vec4(50., 110., -5., 40.);
const float D2R = .0174533;

// lon, lat, sigma(deg), brightness
const vec4 CITY[16] = vec4[16](
  vec4(80.2707,13.0827,.28,1.7), vec4(80.12,12.925,.11,1.0), vec4(79.98,12.69,.05,.5), vec4(80.044,12.823,.03,.9),
  vec4(77.5946,12.9716,.20,1.5), vec4(78.4867,17.385,.19,1.4), vec4(72.8777,19.076,.22,1.6), vec4(77.209,28.6139,.25,1.6),
  vec4(88.3639,22.5726,.20,1.4), vec4(76.2673,9.9312,.12,.9), vec4(73.8567,18.5204,.15,1.1), vec4(72.5714,23.0225,.14,1.0),
  vec4(79.86,6.93,.12,.9), vec4(78.1198,9.9252,.1,.7), vec4(80.95,26.85,.14,.9), vec4(75.8,26.9,.12,.8));

float cityField(vec2 ll, out float chn){
  float s = 0.; chn = 0.;
  for(int i=0;i<16;i++){
    vec4 c = CITY[i];
    float sg = max(c.z, uSpan*.0045);
    vec2 d = (ll - c.xy) * vec2(cos(c.y*D2R), 1.);
    float g = exp(-dot(d,d)/(sg*sg)) * c.w * min(1., c.z/sg*.7 + .3);
    s += g;
    if(i < 4) chn += g;
  }
  return s;
}

vec2 rot(vec2 p, float a){ float c=cos(a), s=sin(a); return vec2(c*p.x - s*p.y, s*p.x + c*p.y); }

float gridLines(vec2 x, out float node){
  vec2 id = floor(x);
  vec2 w = fwidth(x)*1.1 + 1e-5;
  vec2 d = abs(fract(x+.5)-.5);
  // random streets missing
  float hx = hash(vec2(floor(x.x+.5), 3.7)), hy = hash(vec2(floor(x.y+.5), 9.1));
  float lx = (1.-smoothstep(0., w.x, d.x)) * step(.22, hx);
  float ly = (1.-smoothstep(0., w.y, d.y)) * step(.22, hy);
  node = lx*ly * (.5+.5*sin(uTime*2.2 + hash(floor(x+.5))*30.));
  return max(lx, ly);
}

const vec4 HW[6] = vec4[6](
  vec4(80.2335,13.063,79.81,12.50), vec4(80.28,13.0,80.20,12.6), vec4(80.2,13.04,79.55,12.92),
  vec4(80.27,13.12,80.05,13.6), vec4(80.12,12.925,79.95,12.97), vec4(80.0444,12.823,79.98,12.95));

vec3 voro(vec2 x){
  vec2 n = floor(x), f = fract(x);
  float F1 = 8., F2 = 8., id = 0.;
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
    vec2 g = vec2(float(i), float(j));
    vec2 o = vec2(hash(n+g+.13), hash(n+g+7.7));
    vec2 r = g + .15 + .7*o - f;
    float d = dot(r,r);
    if(d < F1){ F2 = F1; F1 = d; id = hash(n+g); }
    else if(d < F2){ F2 = d; }
  }
  return vec3(sqrt(F1), sqrt(F2)-sqrt(F1), id);
}

void main(){
  vec2 p = (gl_FragCoord.xy - .5*uRes) / (.5*uRes.y);
  float f = 1. + uTilt*(p.y+1.)*.9;
  vec2 g = vec2(p.x*f, -1. + (p.y+1.)*f);
  float cl0 = cos(uC.y*D2R);
  vec2 ll = vec2(uC.x + g.x*uSpan*.5/cl0, uC.y + g.y*uSpan*.5);
  float pxPerDeg = uRes.y / uSpan;
  float degPx = 1./pxPerDeg;

  vec2 uv = vec2((ll.x-REG.x)/(REG.y-REG.x), (REG.w-ll.y)/(REG.w-REG.z));
  float lod = max(0., log2(42.7*degPx));
  vec2 wv = (vec2(fbm3(ll*13.), fbm3(ll*13.+7.)) - .5) * .09 * min(1., uSpan*.45);
  wv += (vec2(fbm3(ll*90.), fbm3(ll*90.+3.)) - .5) * .012 * min(1., uSpan*2.);
  vec2 uvw = uv + wv/vec2(60.,45.);
  float m  = textureLod(uReg, uvw, lod).r;
  float b1 = textureLod(uReg, uv, 3.4).r;
  float b2 = textureLod(uReg, uv, 5.8).r;
  float land = smoothstep(.40,.60, m);

  // ---------- height
  float inl = smoothstep(.55,1., b2);
  float h = land * (.12 + .22*inl);
  float hiN = smoothstep(26., 31., ll.y + .1*(ll.x-80.));
  float rn = 1. - abs(2.*fbm3(ll*vec2(1.3,1.7)+3.) - 1.);
  h += land * hiN * (.4 + .75*rn*rn);
  float gl = smoothstep(7.,9.,ll.y) * (1.-smoothstep(21.,23.,ll.y));
  float gW = exp(-pow((ll.x-(73.3+(21.-ll.y)*.34))/.42, 2.)) * gl;
  float gE = exp(-pow((ll.x-(79.2+(ll.y-13.)*.55))/.5, 2.)) * smoothstep(11.,13.,ll.y) * (1.-smoothstep(20.,22.,ll.y));
  h += land * (.5*gW + .26*gE);
  // east-coast plain
  h *= mix(.35, 1., smoothstep(.2,.8, b1));
  float F[4] = float[4](.8, 6., 50., 400.);
  for(int i=0;i<4;i++){
    float fr = F[i];
    float cyc = fr*uSpan;
    float wgt = smoothstep(1.5,5.,cyc) * (1.-smoothstep(70.,170.,cyc));
    if(i==0) wgt = 1.-smoothstep(120.,260.,cyc);
    if(wgt > .002) h += land * wgt * .1/pow(fr,.9) * (fbm3(ll*fr + float(i)*11.) - .45) * 3.;
  }

  // ---------- hillshade from screen derivatives
  vec2 dh = vec2(dFdx(h), dFdy(h)) * pxPerDeg;
  vec3 nrm = normalize(vec3(-dh*2.4, 1.));
  vec3 Ld = normalize(vec3(-.55,.6,.65));
  float shade = clamp(dot(nrm, Ld), 0., 1.2);
  float flat0 = Ld.z;

  // ---------- colours (day)
  float dry = clamp(smoothstep(78.,71.,ll.x)*smoothstep(20.,26.,ll.y) + smoothstep(29.,33.,ll.y)*.85 + .3*smoothstep(.35,.8,fbm3(ll*.7)), 0., 1.);
  dry *= smoothstep(8.,12.,ll.y);
  vec3 green = vec3(.14,.3,.1), tan = vec3(.62,.5,.3), dgreen = vec3(.08,.2,.07);
  vec3 ground = mix(mix(green, dgreen, smoothstep(.0,.5,h)), tan, dry);
  ground *= 1. - (1.-uNight)*.0 + (fbm3(ll*pxPerDeg*.02 + 5.)-.5)*.36*(1.-uNight);
  ground = mix(ground, vec3(.5,.45,.4), smoothstep(.55,1.,h)*.8);
  ground = mix(ground, vec3(.93,.96,1.), smoothstep(.95,1.2,h + .08*fbm3(ll*6.))*.7);
  ground *= mix(.45 + .75*(shade/ max(flat0,.1)), .9, uNight*.75);

  vec3 deepC = vec3(.008,.045,.12), shalC = vec3(.04,.36,.46);
  vec3 sea = mix(deepC, shalC, smoothstep(.03,.4,b1));
  sea += vec3(.02,.05,.08) * fbm3(ll*pxPerDeg*.02 - uTime*.02);
  float foam = (1.-smoothstep(0.,.07, abs(m-.5))) * smoothstep(0.,6., uSpan*-1.+8.) ;
  vec3 col = mix(sea, ground, land);
  col += vec3(.8,.9,1.) * foam * .45;

  // ---------- night map
  float gray = dot(col, vec3(.3,.55,.15));
  vec3 night = vec3(.014,.024,.042) + gray*vec3(.16,.22,.3)*1.2 + land*vec3(.02,.026,.036);
  night += vec3(.03,.07,.1)*(1.-land)*smoothstep(0.,.5,b1)*.7;
  col = mix(col, night, uNight);

  // ---------- city lights (organic street network, ribbon development, glow)
  float chn;
  float u = cityField(ll, chn);
  vec2 lc2 = ll*vec2(cl0,1.);
  vec3 gold = vec3(1.,.70,.30), hot = vec3(1.,.93,.78);

  // highways: distance + position along nearest one
  float hwd = 1e3, hwAlong = 0., hwId = 0.;
  for(int i=0;i<6;i++){
    vec4 s = HW[i];
    vec2 A = s.xy*vec2(cl0,1.), B = s.zw*vec2(cl0,1.);
    vec2 pa = lc2-A, ba = B-A;
    float th = clamp(dot(pa,ba)/dot(ba,ba), 0., 1.);
    float d = length(pa - ba*th);
    if(d < hwd){ hwd = d; hwAlong = th*length(ba); hwId = float(i); }
  }
  float pch = smoothstep(.30,.62, fbm3(lc2*26.+3.));
  float ribbon = exp(-hwd/.010) * smoothstep(.04,.35,u+.12);
  float D = clamp(u*(.45+.9*pch) + ribbon*.9, 0., 1.7) * land;

  // neighbourhood zones: each has its own street-grid orientation
  vec3 zn = voro(lc2/.045 + 2.);
  float zang = zn.z*3.14159;
  vec2 zr = rot(lc2, zang);
  float pxw = fwidth(lc2.x)+fwidth(lc2.y);
  float pA = .0075, pB = .0029, pC = .0012;
  float cA = pA*pxPerDeg, cB = pB*pxPerDeg, cC = pC*pxPerDeg;
  vec2 xa = zr/pA, xb = zr/pB, xc = zr/pC;
  vec2 ia = floor(xa+.5), ib = floor(xb+.5), ic = floor(xc+.5);
  vec2 da = abs(fract(xa+.5)-.5), db = abs(fract(xb+.5)-.5), dc = abs(fract(xc+.5)-.5);
  // finite street segments (T-junctions, dead ends)
  float sxA = step(.22, hash(vec2(ia.x*1.7+zn.z*40., floor(xa.y/3.+hash(vec2(ia.x,1.))*3.))));
  float syA = step(.22, hash(vec2(ia.y*2.3+zn.z*60., floor(xa.x/3.+hash(vec2(ia.y,2.))*3.))));
  float sxB = step(.36, hash(vec2(ib.x*1.3+zn.z*30., floor(xb.y/2.5+hash(vec2(ib.x,3.))*3.))));
  float syB = step(.36, hash(vec2(ib.y*1.9+zn.z*50., floor(xb.x/2.5+hash(vec2(ib.y,4.))*3.))));
  float sxC = step(.50, hash(vec2(ic.x*1.1+zn.z*20., floor(xc.y/2.+hash(vec2(ic.x,5.))*3.))));
  float syC = step(.50, hash(vec2(ic.y*1.5+zn.z*70., floor(xc.x/2.+hash(vec2(ic.y,6.))*3.))));
  float wA = pxw/pA*1.1+1e-4, wB = pxw/pB*1.1+1e-4, wC = pxw/pC*1.1+1e-4;
  float gA = max((1.-smoothstep(0.,wA,da.x))*sxA, (1.-smoothstep(0.,wA,da.y))*syA);
  float gB = max((1.-smoothstep(0.,wB,db.x))*sxB, (1.-smoothstep(0.,wB,db.y))*syB);
  float gC = max((1.-smoothstep(0.,wC,dc.x))*sxC, (1.-smoothstep(0.,wC,dc.y))*syC);
  // ring / arterial roads between zones
  float e1 = (1.-smoothstep(0., pxw/.045*1.5+1e-4, zn.y)) * step(.2, hash(vec2(zn.z*91.,2.)));
  float vA = smoothstep(5.,26., cA), vB = smoothstep(6.,34., cB), vC = smoothstep(8.,46., cC);
  float roads = e1*smoothstep(3.,14.,.045*pxPerDeg)*.30*smoothstep(.15,.6,D)
              + gA*vA*.55*smoothstep(.10,.5,D) + gB*vB*.42*smoothstep(.3,.9,D) + gC*vC*.34*smoothstep(.55,1.2,D);
  roads *= (.35 + .65*clamp(D,0.,1.));
  // lit buildings: one lit pad per fine cell, brightness by density
  vec2 fc = fract(xc+.5)-.5; float hc = hash(ic+zn.z*13.);
  float pad = (1.-smoothstep(.06,.12, max(abs(fc.x),abs(fc.y)))) * step(.45, hc) * smoothstep(10.,60., cC) * smoothstep(.45,1.,D);
  vec2 fb = fract(xb+.5)-.5; float hb2 = hash(ib+zn.z*7.);
  float pad2 = (1.-smoothstep(.12,.2, max(abs(fb.x),abs(fb.y)))) * step(.5, hb2) * smoothstep(6.,34., cB) * smoothstep(.2,.7,D) * (1.-smoothstep(40.,120.,cC));
  vec3 tint = mix(gold, hot, smoothstep(.8,1.6,D));
  vec3 glow = vec3(0.);
  float farK = 1. - .55*smoothstep(10.,1.5,uSpan);
  glow += tint * D * (.13 + .14*smoothstep(0.,1.,u)) * farK;
  glow += mix(gold, hot, .35) * roads * .8;
  glow += mix(vec3(1.,.8,.5), vec3(.6,.9,1.), step(.82,hc)) * (pad*.55 + pad2*.3);
  // highways
  float hww = max(.0006, degPx*1.5);
  float hwl = 1. - smoothstep(hww*.4, hww, hwd);
  float flow = smoothstep(.62,1., fract(hwAlong*160. * (hwId<.5?1.:1.4) - uTime*(hwId<.5?.9:-.6) + hwId*.37));
  glow += mix(gold,hot,.5) * hwl * (.55 + 1.2*flow) * smoothstep(.0,.3,u+.2) * land;
  glow += gold * exp(-hwd*pxPerDeg*.06) * .05 * smoothstep(.0,.4,u+.3) * land;

  // ---------- campus (SRM KTR)
  vec2 K = vec2(80.0444, 12.8231);
  vec2 dk = (ll-K)*vec2(cl0,1.);
  float nearK = smoothstep(.5,.1, uSpan);
  if(nearK > .001){
    vec2 rd = normalize(vec2(-.4235,-.563)); vec2 pd = vec2(-rd.y, rd.x);
    vec2 cc = dk - vec2(-.0007,.0002);
    vec2 qq = abs(cc) - vec2(.0072,.0052);
    float sdf = length(max(qq,0.)) + min(max(qq.x,qq.y),0.) - .0012;
    float inside = 1. - smoothstep(-degPx*1.5, degPx*1.5, sdf);
    float edge = 1. - smoothstep(0., degPx*2.4, abs(sdf));
    vec2 q = vec2(dot(cc,rd), dot(cc,pd));            // campus axes follow GST road
    float ncamp = nearK * smoothstep(.16,.03,uSpan);
    // lake + sports ground
    vec2 dl = (ll - vec2(80.0365,12.8035))*vec2(cl0,1.);
    float lake = 1. - smoothstep(.0020,.0026, length(dl*vec2(1.,1.4)));
    col = mix(col, vec3(.01,.04,.08), lake*nearK*.85);
    glow += vec3(.2,.5,.8) * (1.-smoothstep(.0,degPx*2.,abs(length(dl*vec2(1.,1.4))-.0023))) * nearK * .5;
    vec2 gq = vec2(q.x+.0020, q.y-.0006);
    float gd = length(gq*vec2(1.,1.9));
    float ground = 1. - smoothstep(.0020,.0023, gd);
    // buildings
    float cell = .00115;
    vec2 g2 = q/cell; vec2 gi = floor(g2), gf = fract(g2);
    float hb = hash(gi+3.3), hs = hash(gi+8.8);
    vec2 sz = vec2(.34+.26*hb, .30+.30*hs);
    vec2 off = (gf-.5);
    vec2 bq = abs(off - (vec2(hash(gi+1.1),hash(gi+2.2))-.5)*.12) - sz*.5;
    float bsd = max(bq.x,bq.y);
    float bmask = (1. - smoothstep(-.02,.03,bsd)) * step(.30, hb) * (1.-ground) * (1.-lake);
    // windows
    vec2 wq = floor((off+.5)*vec2(7.,5.)*(1.+hs));
    float win = step(.38, hash(wq+gi*7.));
    vec3 bcol = mix(vec3(.55,.9,1.), vec3(1.,.82,.5), step(.62, hash(gi+4.4)));
    float stage = ncamp*inside;
    float bright = bmask*(.35+.65*win)*(.75+.25*sin(uTime*1.4+hb*30.));
    // faux height: extrude buildings toward screen-up when we tilt
    float ext = 0.;
    if(uTilt > .02){
      for(int s=1;s<=5;s++){
        vec2 q2 = q + vec2(0., float(s)*.00018*uTilt*(1.+hb)); 
        vec2 g3 = q2/cell; vec2 gi3 = floor(g3), gf3 = fract(g3)-.5;
        float hb3 = hash(gi3+3.3), hs3 = hash(gi3+8.8);
        vec2 sz3 = vec2(.34+.26*hb3, .30+.30*hs3);
        vec2 bq3 = abs(gf3 - (vec2(hash(gi3+1.1),hash(gi3+2.2))-.5)*.12) - sz3*.5;
        ext = max(ext, (1.-smoothstep(-.02,.03,max(bq3.x,bq3.y))) * step(.30,hb3) * (1.-ground) * (1.-.12*float(s)));
      }
    }
    glow += vec3(.18,.40,.62) * ext * stage * .55;
    glow += bcol * bright * stage * 1.5;
    // internal roads
    vec2 rr = abs(fract(g2)-.5);
    float inroad = (1.-smoothstep(0.,.05+degPx/cell*1.2, min(abs(rr.x-.5),abs(rr.y-.5)))) ;
    glow += vec3(1.,.8,.5) * inroad * inside * ncamp * .28;
    glow += vec3(.25,.5,.3) * ground * inside * ncamp * .22;
    glow += vec3(1.,.9,.6) * (1.-smoothstep(.0,degPx*1.6,abs(gd-.0021))) * inside * ncamp * .9; // track
    col = mix(col, col + vec3(.012,.03,.05), inside*nearK);
    glow += vec3(.35,.8,1.) * edge * (.65 + .35*sin(uTime*2.)) * nearK * .9;
    // GST road in front of campus is part of HW[0]; add frontage glow
    // beacon
    float bd = length(dk);
    float pulse = fract(uTime*.6);
    glow += vec3(1.,.85,.5) * (1.-smoothstep(0., degPx*5., bd)) * ncamp;
    glow += vec3(1.,.85,.5) * (1.-smoothstep(0., degPx*2., abs(bd - pulse*.006))) * (1.-pulse) * ncamp * .7;
  }
  col += glow * mix(.45, 1., uNight);

  // ---------- clouds: wisps -> broken cumulus -> a thick deck we punch through
  vec2 cq = p*1.6*pow(28./max(uSpan,.01), .22) + uC*.35 + vec2(uTime*.02, uTime*.007);
  float cn = fbm(cq*1.7);
  float cn2 = fbm(cq*1.7 + vec2(.06,-.05));
  float thr = mix(.80, .40, uCloud);
  float cm = smoothstep(thr, thr+.17, cn);
  float shadeC = clamp((cn - cn2)*9., -.5, .5);
  vec3 dayC = vec3(.95,.97,1.);
  vec3 ccol = mix(dayC, vec3(.10,.12,.18), uNight) * (.82 + shadeC*.5) + glow*.35*uNight;
  float fog = smoothstep(.0,.6,uHaze) * (.72 + .28*fbm3(cq*2.4));
  vec3 fogC = mix(vec3(.82,.88,.96), vec3(.12,.14,.20), uNight) * (.85+.3*fbm3(cq*.9)) + glow*.55*uNight + gold*u*.10*uNight;
  col = mix(col, ccol, cm*.9*(1.-fog));
  col = mix(col, fogC, clamp(fog,0.,1.)*.96);

  // ---------- horizon + finish
  float hor = smoothstep(.1,1.05, p.y) * uTilt;
  col = mix(col, vec3(.01,.014,.03) + vec3(.25,.18,.08)*exp(-abs(p.y-.92)*9.)*uTilt*uNight, hor);
  col *= 1. - .55*dot(p*.62,p*.62);
  col += (hash(gl_FragCoord.xy + fract(uTime)*60.)-.5)*.022;
  col *= 1. - uDark;
  col = pow(max(col,0.), vec3(.95));
  o = vec4(col*uAlpha, uAlpha);
}`;

export function createTerrain(gl) {
  const pr = program(gl, FRAG);
  if (!pr) return null;
  return {
    draw(w, h, s, t) {
      gl.useProgram(pr.p);
      gl.bindVertexArray(pr.vao);
      const u = pr.uni;
      gl.uniform2f(u.uRes, w, h);
      gl.uniform2f(u.uC, s.c[0], s.c[1]);
      gl.uniform1f(u.uSpan, s.span);
      gl.uniform1f(u.uTilt, s.tilt);
      gl.uniform1f(u.uTime, t);
      gl.uniform1f(u.uHaze, s.haze);
      gl.uniform1f(u.uCloud, s.cloud);
      gl.uniform1f(u.uNight, s.night);
      gl.uniform1f(u.uDark, s.dark);
      gl.uniform1f(u.uAlpha, s.alpha);
      gl.uniform1i(u.uReg, 1);
      if (s.alpha < 0.999) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      } else gl.disable(gl.BLEND);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}
