// Tiny synthesized sound kit (Web Audio, no asset files). Every call is a safe no-op when audio is
// unavailable or muted. Browsers only allow sound after a user gesture, so ctx.trigger() calls unlock().
(() => {
  let ac = null, master = null, noiseBuf = null, muted = false, lastTick = 0;
  try { muted = localStorage.getItem('cm-muted') === '1'; } catch (e) { /* storage blocked */ }

  function ctx() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ac = new AC(); } catch (e) { return null; }
      master = ac.createGain();
      master.gain.value = muted ? 0 : 0.6;
      master.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }

  // filtered noise burst
  function noise(t, dur, type, freq, q, peak, attack = 0.003) {
    const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }
  function tone(t, type, f0, f1, dur, peak) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }

  CM.audio = {
    get muted() { return muted; },
    setMuted(m) {
      muted = m;
      try { localStorage.setItem('cm-muted', m ? '1' : '0'); } catch (e) { /* ignore */ }
      if (master) master.gain.value = m ? 0 : 0.6;
    },
    unlock() { ctx(); },

    // Wheel of Fortune peg clink
    tick(vol = 1, pitch = 1) {
      const c = ctx(); if (!c) return;
      const t = c.currentTime;
      if (t - lastTick < 0.016) return;                      // keep very fast spins from turning to mush
      lastTick = t;
      tone(t, 'square', 1700 * pitch, 800 * pitch, 0.045, 0.16 * vol);
      noise(t, 0.025, 'bandpass', 3400, 2, 0.2 * vol, 0.001);
    },
    // liquid sloshing: swelling, sweeping filtered noise
    slosh(dur = 1.4) {
      const c = ctx(); if (!c) return;
      const t = c.currentTime;
      const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      src.buffer = noiseBuf; src.loop = true; f.type = 'bandpass'; f.Q.value = 2.5;
      g.gain.setValueAtTime(0.0001, t);
      for (let s = 0, i = 0; s < dur; s += 0.21, i++) {
        const peak = 0.12 + Math.random() * 0.14;
        f.frequency.setValueAtTime(260, t + s);
        f.frequency.linearRampToValueAtTime(700 + Math.random() * 500, t + s + 0.1);
        f.frequency.linearRampToValueAtTime(300, t + s + 0.21);
        g.gain.linearRampToValueAtTime(peak, t + s + 0.09);
        g.gain.linearRampToValueAtTime(0.02, t + s + 0.2);
      }
      g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.1);
      src.connect(f); f.connect(g); g.connect(master);
      src.start(t, Math.random()); src.stop(t + dur + 0.2);
    },
    bloop() {
      const c = ctx(); if (!c) return;
      const t = c.currentTime;
      tone(t, 'sine', 420, 150, 0.22, 0.3);
      tone(t + 0.07, 'sine', 640, 260, 0.16, 0.12);
    },
    thud(vol = 1) {
      const c = ctx(); if (!c) return;
      const t = c.currentTime;
      tone(t, 'sine', 170, 45, 0.16, 0.5 * vol);
      noise(t, 0.08, 'lowpass', 400, 0.7, 0.3 * vol);
    },
    // dice-on-felt impact
    clack(vol = 1, pitch = 1) {
      const c = ctx(); if (!c) return;
      const t = c.currentTime;
      noise(t, 0.06, 'bandpass', 2100 * pitch, 1.1, 0.5 * vol, 0.001);
      tone(t, 'triangle', 900 * pitch, 380 * pitch, 0.05, 0.25 * vol);
      tone(t, 'sine', 140, 70, 0.08, 0.3 * vol);
    },
    // coin ring
    ting(pitch = 1, vol = 1) {
      const c = ctx(); if (!c) return;
      const t = c.currentTime;
      [[1, 0.16], [2.76, 0.09], [5.4, 0.05]].forEach(([m, p]) => tone(t, 'sine', 2600 * pitch * m, 2600 * pitch * m, 0.6 / m + 0.15, p * vol));
    },
    whoosh(dur = 0.5, f0 = 400, f1 = 2500) {
      const c = ctx(); if (!c) return;
      const t = c.currentTime;
      const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      src.buffer = noiseBuf; f.type = 'bandpass'; f.Q.value = 1.5;
      f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.2, t + dur * 0.4);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(master); src.start(t, Math.random()); src.stop(t + dur + 0.05);
    },
    chime() {
      const c = ctx(); if (!c) return;
      const t = c.currentTime;
      [523, 659, 784, 1046].forEach((f, i) => tone(t + i * 0.09, 'triangle', f, f, 0.4, 0.22));
    },
    beep(freq = 660, dur = 0.12, vol = 1) {
      const c = ctx(); if (!c) return;
      tone(c.currentTime, 'square', freq, freq, dur, 0.18 * vol);
    },
    // Geiger counter click
    geiger(vol = 1) {
      const c = ctx(); if (!c) return;
      noise(c.currentTime, 0.014, 'highpass', 2600, 0.7, 0.45 * vol, 0.0005);
    },
    // slot-machine payout
    kerching() {
      const c = ctx(); if (!c) return;
      const t = c.currentTime;
      [0, 0.07, 0.14, 0.24, 0.31, 0.38].forEach((d, i) => {
        tone(t + d, 'triangle', 1900 + (i % 3) * 420, 1900 + (i % 3) * 420, 0.25, 0.16);
        noise(t + d, 0.03, 'bandpass', 5200, 3, 0.18, 0.001);
      });
    },
    meow() {
      const c = ctx(); if (!c) return;
      const t = c.currentTime, o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
      o.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 1700; f.Q.value = 4;
      o.frequency.setValueAtTime(520, t);
      o.frequency.linearRampToValueAtTime(980, t + 0.16);
      o.frequency.linearRampToValueAtTime(430, t + 0.55);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.2, t + 0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t + 0.65);
    },
    roar(dur = 1.4) {
      const c = ctx(); if (!c) return;
      const t = c.currentTime;
      const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      src.buffer = noiseBuf; src.loop = true; f.type = 'bandpass'; f.frequency.value = 850; f.Q.value = 0.5;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.28, t + dur * 0.3);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(master); src.start(t, Math.random()); src.stop(t + dur + 0.05);
    }
  };
})();
