// Dice: a real 3D platonic solid thrown onto a felt table. The solid matches your number of choices
// (D4 / D6 / D8 / D12 / D20). Spare faces say ROLL AGAIN and the die throws itself again until it lands on a choice.
//
// Fairness: the app draws the winning choice uniformly. A die that "lands on a spare face" first is purely
// cosmetic (the number of re-throws is independent of which choice wins), so every choice is equally likely.
(() => {
  const { $, randInt, fit } = CM;
  const PHI = (1 + Math.sqrt(5)) / 2;
  const DUR = 2100;                                          // ms per throw
  const HOPS = [[0.30, 0.52, 42], [0.52, 0.68, 16], [0.68, 0.79, 6], [0.79, 0.87, 2]];
  const CONTACTS = [0.30, 0.52, 0.68, 0.79, 0.87];

  // ---------- geometry ----------
  const sgn = [-1, 1];
  const perms = (f) => { const out = []; sgn.forEach(a => sgn.forEach(b => out.push(f(a, b)))); return out; };
  const VERTS = {
    4: [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]],
    6: [].concat(...sgn.map(a => perms((b, c) => [a, b, c]))),
    8: [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]],
    12: [].concat(
      ...sgn.map(a => perms((b, c) => [a, b, c])),
      perms((b, c) => [0, b / PHI, c * PHI]), perms((b, c) => [b / PHI, c * PHI, 0]), perms((b, c) => [b * PHI, 0, c / PHI])),
    20: [].concat(perms((b, c) => [0, b, c * PHI]), perms((b, c) => [b, c * PHI, 0]), perms((b, c) => [b * PHI, 0, c]))
  };
  const STYLE = {                                            // circumradius px, base colour
    4: { R: 90, rgb: [59, 93, 201] }, 6: { R: 76, rgb: [177, 62, 83] }, 8: { R: 88, rgb: [47, 143, 70] },
    12: { R: 98, rgb: [125, 70, 190] }, 20: { R: 94, rgb: [200, 110, 40] }
  };
  const dieFor = n => n <= 4 ? 4 : n <= 6 ? 6 : n <= 8 ? 8 : n <= 12 ? 12 : 20;

  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = a => Math.hypot(a[0], a[1], a[2]);
  const unit = a => { const l = len(a); return [a[0] / l, a[1] / l, a[2] / l]; };

  // 3x3 row-major matrices
  const mul = (A, B) => { const o = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o.push(A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c]); return o; };
  const app = (A, v) => [dot([A[0], A[1], A[2]], v), dot([A[3], A[4], A[5]], v), dot([A[6], A[7], A[8]], v)];
  const tr = A => [A[0], A[3], A[6], A[1], A[4], A[7], A[2], A[5], A[8]];
  const rx = a => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; };
  const ry = a => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; };
  const rz = a => { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1]; };
  const deg = Math.PI / 180;
  function axisRot(ax, a) {
    const c = Math.cos(a), s = Math.sin(a), t = 1 - c, [x, y, z] = ax;
    return [t * x * x + c, t * x * y - s * z, t * x * z + s * y, t * x * y + s * z, t * y * y + c, t * y * z - s * x, t * x * z - s * y, t * y * z + s * x, t * z * z + c];
  }
  function axisAngle(R) {                                    // rotation matrix -> {axis, ang}
    const ang = Math.acos(Math.max(-1, Math.min(1, (R[0] + R[4] + R[8] - 1) / 2)));
    if (ang < 1e-5) return { axis: [1, 0, 0], ang: 0 };
    if (Math.PI - ang < 1e-4) {                              // half turn: axis from the symmetric part
      const d = [(R[0] + 1) / 2, (R[4] + 1) / 2, (R[8] + 1) / 2], i = d.indexOf(Math.max(...d));
      const a = [0, 0, 0]; a[i] = Math.sqrt(d[i]);
      for (let j = 0; j < 3; j++) if (j !== i) a[j] = R[i * 3 + j] / (2 * a[i]);
      return { axis: unit(a), ang };
    }
    const s = 2 * Math.sin(ang);
    return { axis: [(R[7] - R[5]) / s, (R[2] - R[6]) / s, (R[3] - R[1]) / s], ang };
  }
  const css3d = M => `matrix3d(${M[0]},${M[3]},${M[6]},0,${M[1]},${M[4]},${M[7]},0,${M[2]},${M[5]},${M[8]},0,0,0,0,1)`;

  // Build the faces of solid `d`: centre, outward normal, in-plane basis, and 2D outline.
  function buildSolid(d) {
    const { R } = STYLE[d];
    const raw = VERTS[d], r0 = len(raw[0]);
    const V = raw.map(v => v.map(x => x * R / r0));
    const faces = [], seen = new Set();
    for (let i = 0; i < V.length; i++) for (let j = i + 1; j < V.length; j++) for (let k = j + 1; k < V.length; k++) {
      let n = cross(sub(V[j], V[i]), sub(V[k], V[i]));
      if (len(n) < 1e-6) continue;
      n = unit(n);
      let dd = dot(n, V[i]), pos = 0, neg = 0;
      V.forEach(v => { const s = dot(n, v) - dd; if (s > 1e-4) pos++; else if (s < -1e-4) neg++; });
      if (pos && neg) continue;
      if (dd < 0) { n = n.map(x => -x); dd = -dd; }
      const key = n.map(x => x.toFixed(3)).join(',');
      if (seen.has(key)) continue; seen.add(key);
      const on = V.filter(v => Math.abs(dot(n, v) - dd) < 1e-4);
      const c = [0, 1, 2].map(a => on.reduce((s, v) => s + v[a], 0) / on.length);
      const h = Math.abs(n[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
      const u = unit(cross(h, n)), v = cross(n, u);            // u x v = n  (proper rotation)
      const pts = on.map(p => { const w = sub(p, c); return [dot(w, u), dot(w, v)]; })
        .sort((p, q) => Math.atan2(p[1], p[0]) - Math.atan2(q[1], q[0]));
      let inr = Infinity, rad = 0;
      pts.forEach((p, a) => {
        const q = pts[(a + 1) % pts.length];
        inr = Math.min(inr, Math.abs(p[0] * q[1] - p[1] * q[0]) / Math.hypot(q[0] - p[0], q[1] - p[1]));
        rad = Math.max(rad, Math.hypot(p[0], p[1]));
      });
      faces.push({ n, c, u, v, pts, inr, rad, F: [...u, ...v, ...n] });
    }
    return { faces, inr: dd0(faces), R };
  }
  const dd0 = faces => dot(faces[0].n, faces[0].c);           // distance centre -> face (inradius of the solid)

  // ---------- the game ----------
  let raf = 0, timer = 0, cube = null, shadow = null, S = null, faceEls = [], faceOf = [], cur = null, d = 0;
  // View tilt. It must stay under half the angle between neighbouring faces so the winning face is always the
  // most frontal one (the D20's faces are only ~42 degrees apart, so it gets a gentler tilt).
  let TILT = mul(rx(-17 * deg), ry(-22 * deg));
  const LIGHT = unit([-0.35, -0.6, 0.75]);

  function paint(M) {                                          // pose + fake lighting from each face's world normal
    cube.style.transform = css3d(M);
    const [r, g, b] = STYLE[d].rgb;
    S.faces.forEach((f, i) => {
      const w = app(M, f.n), br = 0.38 + 0.62 * Math.max(0, dot(w, LIGHT));
      faceEls[i].inner.style.background = `rgb(${Math.round(r * br + 40 * br)},${Math.round(g * br + 40 * br)},${Math.round(b * br + 40 * br)})`;
    });
  }

  function label(el, text, face, spare) {
    el.span.textContent = text;
    const px = spare ? Math.max(6, face.inr * 0.30) : Math.max(6, Math.min(18, fit(text) * face.inr / 48));
    el.span.style.fontSize = px.toFixed(1) + 'px';
    el.span.style.color = spare ? '#1a1c2c' : '#fff';
    el.span.style.textShadow = spare ? 'none' : '1px 1px 0 #000';
    el.span.style.maxWidth = (face.inr * 1.9).toFixed(0) + 'px';
    el.inner.dataset.spare = spare ? '1' : '';
  }

  function throwTo(fi, done) {
    const target = S.faces[fi].F;
    const { axis, ang } = axisAngle(mul(cur, tr(target)));
    const dirs = () => (randInt(2) ? 1 : -1);
    const ax = 360 * (2 + randInt(2)) * dirs(), ay = 360 * (3 + randInt(2)) * dirs(), az = 360 * (1 + randInt(2)) * dirs();
    const xr = (randInt(2) ? 1 : -1) * (35 + randInt(30)), t0 = performance.now();
    let ci = 0;
    CM.audio.whoosh(0.45, 300, 1800);
    const step = now => {
      const t = Math.min(1, (now - t0) / DUR);
      const e = 1 - Math.pow(1 - Math.min(1, t / 0.9), 3), k = 1 - e;
      const B = axisRot(axis, ang * (1 - e));
      const Sp = mul(mul(rx(ax * k * deg), ry(ay * k * deg)), rz(az * k * deg));
      paint(mul(Sp, mul(TILT, mul(B, target))));
      let h = 0;
      if (t < 0.1) h = 105 * Math.sin(Math.PI / 2 * t / 0.1);                          // picked up
      else if (t < HOPS[0][0]) { const u = (t - 0.1) / (HOPS[0][0] - 0.1); h = 105 * (1 - u * u); }  // falls
      else for (const [a, b, p] of HOPS) if (t >= a && t < b) { const u = (t - a) / (b - a); h = 4 * p * u * (1 - u); break; }
      const x = xr * Math.sin(Math.PI * Math.min(1, t / 0.88));                        // out and back along the table
      cube.style.translate = `${x.toFixed(1)}px ${(-h).toFixed(1)}px`;
      shadow.style.transform = `translateX(${x.toFixed(1)}px) scale(${Math.max(0.35, 1 - h / 170).toFixed(3)})`;
      shadow.style.opacity = Math.max(0.15, 0.55 - h / 300).toFixed(2);
      while (ci < CONTACTS.length && t >= CONTACTS[ci]) { CM.audio.clack(1 - ci * 0.17, 0.85 + Math.random() * 0.3); ci++; }
      if (t < 1) { raf = requestAnimationFrame(step); return; }
      cur = target;
      paint(mul(TILT, target));
      cube.style.translate = '0 0';
      done();
    };
    raf = requestAnimationFrame(step);
  }

  CM.register({
    id: 'dice', name: 'DICE', action: 'ROLL!', hint: 'TAP THE DIE TO ROLL',
    mount(stage, ctx) {
      const n = ctx.choices.length;
      d = dieFor(n);
      S = buildSolid(d);
      TILT = d === 20 ? mul(rx(-9 * deg), ry(-11 * deg)) : mul(rx(-17 * deg), ry(-22 * deg));
      const spareCount = d - n;
      stage.innerHTML = `<div id="dice-box" role="button" tabindex="0" aria-label="Roll the die">
        <div id="dice-scene"><div id="dice-felt"></div><div id="dice-shadow"></div><div id="cube"></div></div>
        <div id="die-cap"></div></div>`;
      cube = $('cube'); shadow = $('dice-shadow');
      cube.style.bottom = `calc(24% + ${Math.round(S.inr)}px)`;
      // build one element per face
      faceEls = S.faces.map(f => {
        const Sz = Math.ceil(f.rad * 2 + 6), half = Sz / 2;
        const poly = k => 'polygon(' + f.pts.map(p => `${(half + p[0] * k).toFixed(1)}px ${(half + p[1] * k).toFixed(1)}px`).join(',') + ')';
        const el = document.createElement('div');
        el.className = 'dface';
        el.style.cssText = `width:${Sz}px;height:${Sz}px;left:${-half}px;top:${-half}px;clip-path:${poly(1)};` +
          `transform:matrix3d(${f.u[0]},${f.u[1]},${f.u[2]},0,${f.v[0]},${f.v[1]},${f.v[2]},0,${f.n[0]},${f.n[1]},${f.n[2]},0,${f.c[0]},${f.c[1]},${f.c[2]},1)`;
        const inner = document.createElement('div'); inner.className = 'din'; inner.style.clipPath = poly(0.88);
        const span = document.createElement('span'); inner.appendChild(span); el.appendChild(inner); cube.appendChild(el);
        return { el, inner, span };
      });
      // shuffle which face holds which slot; slots >= n are spare ROLL AGAIN faces
      const slot = [...Array(d).keys()];
      for (let i = d - 1; i > 0; i--) { const j = randInt(i + 1); [slot[i], slot[j]] = [slot[j], slot[i]]; }
      faceOf = Array(n);
      faceEls.forEach((fe, f) => {
        const s = slot[f];
        if (s < n) { faceOf[s] = f; label(fe, ctx.choices[s], S.faces[f], false); }
        else label(fe, 'ROLL AGAIN', S.faces[f], true);
      });
      cur = S.faces[faceOf[0]].F;
      paint(mul(TILT, cur));
      $('die-cap').textContent = `D${d}` + (spareCount ? `  |  ${spareCount} ROLL AGAIN FACE${spareCount > 1 ? 'S' : ''}` : '');
      const box = $('dice-box');
      box.addEventListener('click', () => ctx.trigger());
      box.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ctx.trigger(); }
      });
    },
    roll(idx, done) {
      cancelAnimationFrame(raf); clearTimeout(timer);
      const n = CM.ctx.choices.length, spare = faceEls.map((_, f) => f).filter(f => !faceOf.includes(f));
      let r = 0;                                              // cosmetic re-throws: geometric, capped at 3 for display
      if (spare.length) while (r < 3 && randInt(d) >= n) r++;
      const seq = [];
      for (let i = 0; i < r; i++) seq.push(spare[randInt(spare.length)]);
      seq.push(faceOf[idx]);
      const go = i => throwTo(seq[i], () => {
        if (i < seq.length - 1) {
          $('hint').textContent = 'ROLL AGAIN!';
          CM.audio.bloop();
          timer = setTimeout(() => go(i + 1), 950);
        } else done('> ' + CM.ctx.choices[idx].toUpperCase());
      });
      go(0);
    },
    unmount() { cancelAnimationFrame(raf); clearTimeout(timer); }
  });
})();
