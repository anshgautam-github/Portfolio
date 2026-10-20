// The rush of air while you fall (optional: the visitor switches it on with the Sound button, because browsers only allow audio after a click).
// Pink noise through a low-pass filter: the faster you scroll, the louder and brighter it gets; a low rumble joins during atmospheric entry.
export function createWind() {
  let ctx = null, gain = null, lp = null, rGain = null, on = false;
  const noise = (c, pink) => {
    const buf = c.createBuffer(1, c.sampleRate * 3, c.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      if (pink) { b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2; }
      else d[i] = w;
    }
    const s = c.createBufferSource(); s.buffer = buf; s.loop = true; return s;
  };
  const init = () => {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    const a = noise(ctx, true);
    lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 220; lp.Q.value = 0.8;
    gain = ctx.createGain(); gain.gain.value = 0;
    a.connect(lp); lp.connect(gain); gain.connect(ctx.destination); a.start();
    const r = noise(ctx, false);
    const rl = ctx.createBiquadFilter(); rl.type = "lowpass"; rl.frequency.value = 85;
    rGain = ctx.createGain(); rGain.gain.value = 0;
    r.connect(rl); rl.connect(rGain); rGain.connect(ctx.destination); r.start();
    return true;
  };
  return {
    toggle() {
      if (!ctx && !init()) return false;
      if (ctx.state === "suspended") ctx.resume();
      on = !on;
      return on;
    },
    /** speed 0..1, heat 0..1 (how deep into the atmospheric entry we are) */
    set(speed, heat) {
      if (!ctx) return;
      const t = ctx.currentTime, v = on ? 1 : 0;
      gain.gain.setTargetAtTime(v * (0.015 + 0.22 * speed), t, 0.12);
      lp.frequency.setTargetAtTime(220 + 2600 * speed, t, 0.15);
      rGain.gain.setTargetAtTime(v * 0.55 * heat * (0.25 + 0.75 * speed), t, 0.2);
    },
    stop() {
      if (!ctx) return;
      const c = ctx; ctx = null; on = false;
      try { gain.gain.setTargetAtTime(0, c.currentTime, 0.12); rGain.gain.setTargetAtTime(0, c.currentTime, 0.12); } catch (e) { /* noop */ }
      setTimeout(() => { try { c.close(); } catch (e) { /* noop */ } }, 700);
    },
  };
}
