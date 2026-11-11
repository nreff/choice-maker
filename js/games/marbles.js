// Marble mayhem: numbered marbles pour into an arena of bumpers, ramps and spinners, churn around in a funnel,
// and then the funnel "opens" -- and the winner is the one marble that makes it out of the exit.
//
// Fairness: the app draws the winner first. This is a real little physics sim, but the exit gate only lets the
// drawn marble through (everyone else is physically blocked), and the winner is steered to the exit once the
// funnel phase starts, with a straight-line fallback if it ever gets jammed. So the sim can look as wild as it
// likes without ever changing the result.
(() => {
  const { $, esc, randInt } = CM;
  const W = 320, H = 410, GRAV = 900, DT = 1 / 120;
  const T_FUN = 5.2;                                    // seconds of mayhem before the gate "opens"
  const GATE_Y = 388, EXIT_X = 160, WALL_L = 8, WALL_R = 312;
  const COLORS = ['#ef7d57', '#73eff7', '#ffcd75', '#a7f070', '#b4b4ff', '#41a6f6', '#f4f4f4', '#ff9ec4'];

  // static geometry ----------------------------------------------------------------------------
  const BUMPERS = [[78, 112, 14], [160, 92, 14], [242, 112, 14], [112, 160, 11], [208, 160, 11], [38, 170, 10], [282, 170, 10], [160, 246, 12]];
  const RAMPS = [[8, 232, 104, 262], [312, 232, 216, 262]];
  const FUNNEL = [[8, 300, 138, 384], [312, 300, 182, 384]];
  const STIRRERS = [{ cx: 160, cy: 196, L: 92, w: 2.5 }, { cx: 160, cy: 338, L: 72, w: -3.4 }];

  class Sim {
    constructor(n, idx, rand = Math.random) {
      this.n = n; this.idx = idx; this.t = 0; this.rand = rand; this.won = false; this.hits = [];
      const r = n <= 6 ? 10 : n <= 10 ? 9 : n <= 14 ? 8 : 7;
      this.r = r;
      this.ms = [...Array(n).keys()].map(i => ({
        id: i, r, x: 40 + rand() * 240, y: -20, vx: (rand() - 0.5) * 120, vy: 0,
        spawn: i * 0.1 + rand() * 0.06, on: false, ghost: false
      }));
      this.stir = STIRRERS.map(s => ({ ...s, a: rand() * 6.28 }));
      this.override = false;
    }
    segHit(m, ax, ay, bx, by, e, wvel) {
      const abx = bx - ax, aby = by - ay, l2 = abx * abx + aby * aby;
      let u = ((m.x - ax) * abx + (m.y - ay) * aby) / l2; u = Math.max(0, Math.min(1, u));
      const px = ax + abx * u, py = ay + aby * u;
      let dx = m.x - px, dy = m.y - py, d = Math.hypot(dx, dy);
      if (d >= m.r) return 0;
      if (d < 1e-6) { dx = -aby; dy = abx; d = Math.hypot(dx, dy); }
      const nx = dx / d, ny = dy / d;
      m.x += nx * (m.r - d); m.y += ny * (m.r - d);
      let vsx = 0, vsy = 0;
      if (wvel) [vsx, vsy] = wvel(px, py);
      const vn = (m.vx - vsx) * nx + (m.vy - vsy) * ny;
      if (vn < 0) { m.vx -= (1 + e) * vn * nx; m.vy -= (1 + e) * vn * ny; return -vn; }
      return 0;
    }
    step(dt = DT) {
      this.t += dt;
      const t = this.t, w = this.ms[this.idx], fun = t >= T_FUN;
      this.stir.forEach((s, i) => { s.a += s.w * (fun && i === 1 ? 1.6 : 1) * dt; });
      let hitV = 0, clack = 0;
      // 1. forces and motion
      for (const m of this.ms) {
        if (!m.on) { if (t >= m.spawn) m.on = true; else continue; }
        m.vy += GRAV * dt;
        if (fun) {                                                  // the funnel starts to pull everyone in
          const tx = EXIT_X - m.x, ty = GATE_Y - 20 - m.y, d = Math.hypot(tx, ty) || 1;
          let a = 110;
          if (m === w) a = 1600 * Math.min(1, (t - T_FUN) / 1.0);   // ...and the drawn marble is pulled much harder
          m.vx += tx / d * a * dt; m.vy += ty / d * a * dt;
          if (m === w) { m.vx *= 0.992; m.vy *= 0.996; }
        }
        // jam fallback: if the winner is still stuck 2.6 s into the funnel phase it ghosts straight to the exit
        if (m === w && fun && t - T_FUN > 2.6) { this.override = true; m.ghost = true; }
        if (m.ghost) {
          const tx = EXIT_X - m.x, ty = GATE_Y + 14 - m.y, d = Math.hypot(tx, ty) || 1, sp = 260;
          m.vx = tx / d * sp; m.vy = ty / d * sp;
        }
        const sp = Math.hypot(m.vx, m.vy);
        if (sp > 600) { m.vx *= 600 / sp; m.vy *= 600 / sp; }
        m.x += m.vx * dt; m.y += m.vy * dt;
      }
      // 2. marble vs marble (the drawn marble is heavy, so it plows through the pack)
      for (let i = 0; i < this.n; i++) {
        const a = this.ms[i]; if (!a.on || a.ghost) continue;
        for (let j = i + 1; j < this.n; j++) {
          const b = this.ms[j]; if (!b.on || b.ghost) continue;
          const dx = b.x - a.x, dy = b.y - a.y, md = a.r + b.r, d2 = dx * dx + dy * dy;
          if (d2 >= md * md || d2 < 1e-9) continue;
          const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ia = a === w ? 0.12 : 1, ib = b === w ? 0.12 : 1, o = md - d;
          a.x -= nx * o * ia / (ia + ib); a.y -= ny * o * ia / (ia + ib); b.x += nx * o * ib / (ia + ib); b.y += ny * o * ib / (ia + ib);
          const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (vn < 0) {
            const j2 = -(1 + 0.8) * vn / (ia + ib);
            a.vx -= j2 * ia * nx; a.vy -= j2 * ia * ny; b.vx += j2 * ib * nx; b.vy += j2 * ib * ny;
            clack = Math.max(clack, -vn);
          }
        }
      }
      // 3. static world (walls, bumpers, ramps, funnel, spinners, gate) gets the last word
      for (const m of this.ms) {
        if (!m.on || m.ghost) continue;
        if (m.x < WALL_L + m.r) { m.x = WALL_L + m.r; m.vx = Math.abs(m.vx) * 0.5; }
        if (m.x > WALL_R - m.r) { m.x = WALL_R - m.r; m.vx = -Math.abs(m.vx) * 0.5; }
        for (const [bx, by, br] of BUMPERS) {
          const dx = m.x - bx, dy = m.y - by, d = Math.hypot(dx, dy), md = br + m.r;
          if (d < md && d > 1e-6) {
            const nx = dx / d, ny = dy / d;
            m.x = bx + nx * md; m.y = by + ny * md;
            const vn = m.vx * nx + m.vy * ny;
            if (vn < 0) { m.vx -= 2 * vn * nx; m.vy -= 2 * vn * ny; m.vx += nx * 70; m.vy += ny * 70; hitV = Math.max(hitV, -vn); }
          }
        }
        for (const [ax, ay, bx, by] of RAMPS) hitV = Math.max(hitV, this.segHit(m, ax, ay, bx, by, 0.45));
        for (const [ax, ay, bx, by] of FUNNEL) hitV = Math.max(hitV, this.segHit(m, ax, ay, bx, by, 0.35));
        for (const s of this.stir) {
          const c = Math.cos(s.a), sn = Math.sin(s.a), hx = s.L / 2 * c, hy = s.L / 2 * sn;
          hitV = Math.max(hitV, this.segHit(m, s.cx - hx, s.cy - hy, s.cx + hx, s.cy + hy, 0.6,
            (px, py) => [-s.w * (py - s.cy), s.w * (px - s.cx)]));
        }
        const opens = m === w && fun;                              // the gate is closed to everyone but the drawn marble
        if (!opens) hitV = Math.max(hitV, this.segHit(m, EXIT_X - 26, GATE_Y, EXIT_X + 26, GATE_Y, 0.3));
        if (!opens) {                                              // safety net: nobody else can leave the funnel
          if (m.y > 300) {
            const lim = (m.y - 300) * 130 / 84;
            m.x = Math.max(WALL_L + lim + m.r * 0.8, Math.min(WALL_R - lim - m.r * 0.8, m.x));
          }
          if (m.y > GATE_Y - m.r) { m.y = GATE_Y - m.r; if (m.vy > 0) m.vy = 0; }
        }
      }
      this.hit = hitV; this.clack = clack;
      if (!this.won && w.on && w.y > GATE_Y + 6) { this.won = true; this.winT = t; }
      return this.won;
    }
  }
  CM.MarbleSim = Sim;                                   // exposed for testing

  // rendering ----------------------------------------------------------------------------------
  let raf = 0, timers = [], svg = null, sim = null, els = [], stirEls = [], lastSnd = 0, lastClack = 0;

  function staticScene() {
    let o = `<rect width="${W}" height="${H}" fill="#1a1c2c"/><rect x="${WALL_L}" y="0" width="${WALL_R - WALL_L}" height="${H}" fill="#222640"/>`;
    o += `<rect x="0" y="0" width="${WALL_L}" height="300" fill="#566c86"/><rect x="${WALL_R}" y="0" width="${W - WALL_R}" height="300" fill="#566c86"/>`;
    BUMPERS.forEach(([x, y, r]) => { o += `<circle cx="${x}" cy="${y}" r="${r}" fill="#b13e53" stroke="#000" stroke-width="3"/><circle cx="${x - r * .3}" cy="${y - r * .3}" r="${r * .28}" fill="#ef9ab0"/>`; });
    RAMPS.concat(FUNNEL).forEach(([a, b, c, d]) => { o += `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="#566c86" stroke-width="6" stroke-linecap="square"/><line x1="${a}" y1="${b - 3}" x2="${c}" y2="${d - 3}" stroke="#8ea4c0" stroke-width="2"/>`; });
    // below-funnel base and gate
    o += `<polygon points="138,384 182,384 192,${H} 128,${H}" fill="#2a2f4a"/>`;
    o += `<rect id="mm-gate" x="${EXIT_X - 26}" y="${GATE_Y - 2}" width="52" height="5" fill="#ef7d57" stroke="#000" stroke-width="1"/>`;
    o += `<text id="mm-lamp" x="${EXIT_X}" y="${GATE_Y + 24}" text-anchor="middle" font-size="7" fill="#ef7d57" font-family="'Press Start 2P',monospace">LOCKED</text>`;
    STIRRERS.forEach((s, i) => { o += `<g id="mm-st${i}"><rect x="${-s.L / 2}" y="-3" width="${s.L}" height="6" fill="#ffcd75" stroke="#000" stroke-width="1.5"/><circle r="6" fill="#ffcd75" stroke="#000" stroke-width="2"/></g>`; });
    o += `<text id="mm-msg" x="${W / 2}" y="20" text-anchor="middle" font-size="9" fill="#ffcd75" font-family="'Press Start 2P',monospace">READY?</text>`;
    return o;
  }

  function buildMarbles(n, r) {
    let o = '';
    for (let i = 0; i < n; i++) {
      const fs = Math.round(r * 1.05 * (i + 1 > 9 ? 0.82 : 1));
      o += `<g id="mm${i}" opacity="0"><circle r="${r}" fill="${COLORS[i % COLORS.length]}" stroke="#000" stroke-width="1.5"/>` +
        `<text y="${(fs * 0.36).toFixed(1)}" text-anchor="middle" font-size="${fs}" fill="#000" font-family="'Press Start 2P',monospace">${i + 1}</text></g>`;
    }
    return o;
  }

  function legend(choices) {
    return choices.map((c, i) => `<div class="mm-leg" id="mml${i}"><i style="background:${COLORS[i % COLORS.length]}">${i + 1}</i><span>${esc(c.length > 18 ? c.slice(0, 17) + '.' : c)}</span></div>`).join('');
  }

  function drawState() {
    sim.ms.forEach((m, i) => {
      const e = els[i];
      if (m.on) { e.setAttribute('opacity', '1'); e.setAttribute('transform', `translate(${m.x.toFixed(1)} ${m.y.toFixed(1)})`); }
    });
    sim.stir.forEach((s, i) => stirEls[i].setAttribute('transform', `translate(${s.cx} ${s.cy}) rotate(${(s.a * 57.2958).toFixed(1)})`));
  }

  CM.register({
    id: 'marbles', name: 'MARBLES', action: 'DROP!', hint: 'TAP THE ARENA TO DROP THE MARBLES',
    mount(stage, ctx) {
      const n = ctx.choices.length;
      stage.innerHTML = `<div id="marbles-wrap" role="button" tabindex="0" aria-label="Drop the marbles">` +
        `<svg id="marbles-svg" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">${staticScene()}<g id="mm-ms"></g></svg>` +
        `<div id="mm-legend">${legend(ctx.choices)}</div></div>`;
      svg = $('marbles-svg');
      sim = new Sim(n, 0);
      $('mm-ms').innerHTML = buildMarbles(n, sim.r);
      els = [...Array(n).keys()].map(i => $('mm' + i));
      stirEls = [$('mm-st0'), $('mm-st1')];
      // idle pose: marbles sit in the funnel basin, stirrers still
      sim.ms.forEach((m, i) => { m.on = true; m.x = 80 + (i % 7) * 26 + (Math.floor(i / 7) % 2) * 10; m.y = 360 - Math.floor(i / 7) * 16 - 18; });
      sim.ms.forEach(m => { m.y = Math.min(m.y, 364); });
      drawState();
      const wrap = $('marbles-wrap');
      wrap.addEventListener('click', () => ctx.trigger());
      wrap.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ctx.trigger(); }
      });
    },
    roll(idx, done) {
      cancelAnimationFrame(raf); timers.forEach(clearTimeout); timers = [];
      const choices = CM.ctx.choices, n = choices.length, msg = $('mm-msg');
      document.querySelectorAll('.mm-leg').forEach(l => l.classList.remove('win'));
      $('mm-gate').setAttribute('x', EXIT_X - 26); $('mm-gate').setAttribute('width', 52);
      $('mm-lamp').textContent = 'LOCKED'; $('mm-lamp').setAttribute('fill', '#ef7d57');
      sim = new Sim(n, idx);
      els.forEach(e => e.setAttribute('opacity', '0'));
      msg.textContent = 'MARBLES AWAY!';
      CM.audio.whoosh(0.7, 300, 1500);
      let acc = 0, last = performance.now(), phase = 0;
      const step = now => {
        acc += Math.min(0.05, (now - last) / 1000); last = now;
        let n2 = 0;
        while (acc >= DT && n2++ < 6) {
          acc -= DT;
          const was = sim.won;
          sim.step(DT);
          if (sim.hit > 150 && now - lastSnd > 40) { lastSnd = now; CM.audio.tick(0.35, 0.8 + Math.random() * 0.7); }
          if (sim.clack > 120 && now - lastClack > 70) { lastClack = now; CM.audio.clack(0.14, 1 + Math.random() * 0.6); }
          if (!was && sim.won) { finish(); return; }
        }
        if (phase === 0 && sim.t > 1.4) { phase = 1; msg.textContent = 'MAYHEM!'; }
        if (phase === 1 && sim.t >= T_FUN) {
          phase = 2; msg.textContent = 'FUNNEL TIME!';
          $('mm-lamp').textContent = 'OPEN'; $('mm-lamp').setAttribute('fill', '#a7f070');
          CM.audio.beep(660, 0.1); timers.push(setTimeout(() => CM.audio.beep(990, 0.18), 140));
        }
        drawState();
        raf = requestAnimationFrame(step);
      };
      const finish = () => {
        // the winner drops out of the funnel into the spotlight; everyone else dims
        drawState();
        msg.textContent = 'WINNER: #' + (idx + 1) + '!';
        els.forEach((e, i) => { if (i !== idx) e.setAttribute('opacity', '.35'); });
        $('mml' + idx).classList.add('win');
        const w = sim.ms[idx], r0 = performance.now(), x0 = w.x, y0 = w.y;
        CM.audio.chime(); CM.audio.roar(1.4);
        const fall = nn => {
          const u = Math.min(1, (nn - r0) / 700), e = u * u;
          const x = x0 + (EXIT_X - x0) * u, y = y0 + (H - 40 - y0) * e;
          els[idx].setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(1 + 0.8 * u).toFixed(2)})`);
          if (u < 1) raf = requestAnimationFrame(fall);
          else timers.push(setTimeout(() => done('> ' + choices[idx].toUpperCase()), 300));
        };
        raf = requestAnimationFrame(fall);
      };
      raf = requestAnimationFrame(step);
    },
    unmount() { cancelAnimationFrame(raf); timers.forEach(clearTimeout); timers = []; }
  });
})();
