// The magic 8-ball: moved over unchanged from the original single-file version.
(() => {
  const { $, randInt, fit } = CM;
  let tri = null, spin = null;

  const TEMPLATE = `
    <div id="ball-wrap" role="button" tabindex="0" aria-label="Shake the eight ball">
      <svg id="ball" viewBox="0 0 32 32" shape-rendering="crispEdges"></svg>
      <div id="window"><svg id="win-back" class="win-svg" viewBox="0 0 20 20" shape-rendering="crispEdges"></svg><div id="tri-box"><div id="tri"><div id="tri-shape"></div><div id="answer"></div></div></div><svg id="win-rim" class="win-svg" viewBox="0 0 20 20" shape-rendering="crispEdges"></svg></div>
    </div>`;

  // ---- pixel ball: charcoal, banded shading with a glossy spot ----
  function drawBall() {
    const N = 32, c = 15.5, r = 15.5;
    const shades = ['#4a4a50', '#3a3a40', '#2b2b30', '#1f1f23', '#151518', '#0c0c0e'];
    let out = '';
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const d = Math.hypot(x - c, y - c);
      if (d > r) continue;
      const l = Math.hypot(x - 10, y - 8) / 26;           // distance from light, 0..~1
      let col = shades[Math.min(shades.length - 1, Math.floor(l * shades.length))];
      if (d > r - 1.2) col = '#050506';                     // outline
      else if (d > r - 2.2 && x > c && y < c) col = '#3a3a40'; // soft rim light, upper right
      if (Math.hypot(x - 9, y - 7) < 2.2) col = '#6a6a72';  // glossy spot
      out += `<rect x="${x}" y="${y}" width="1" height="1" fill="${col}"/>`;
    }
    $('ball').innerHTML = out;
  }

  function drawWindow() {
    const N = 20, c = 9.5, r = 9.5;
    let back = '', rim = '';
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const d = Math.hypot(x - c, y - c);
      if (d > r) continue;
      const cell = col => `<rect x="${x}" y="${y}" width="1" height="1" fill="${col}"/>`;
      back += cell('#04040a');                              // near-black liquid
      if (d > r - 1.2) rim += cell('#2e2e33');
      else if (d > r - 2.8) rim += cell('#08080a');
      else if (d > r - 3.6) rim += cell('#1b1b20');
    }
    $('win-back').innerHTML = back;
    $('win-rim').innerHTML = rim;
  }

  function hideTri() {
    clearInterval(spin);
    tri.classList.remove('on', 'bob');
    tri.style.cssText = '';
    $('answer').style.opacity = 0;
  }

  // Triangle tumbles in the dark liquid during the shake, then rises to the glass.
  function tumble(text, onDone) {
    const a = $('answer');
    a.textContent = text;
    a.style.fontSize = fit(text) + 'px';
    a.style.opacity = 0;
    tri.classList.add('on');
    const steps = 17;
    let t = 0, angle = randInt(360);
    tri.style.transition = 'transform .1s linear, opacity .1s linear, filter .1s linear';
    const frame = () => {
      const p = t / steps;                       // 0 = deep, 1 = at the glass
      const dark = p * p;
      tri.style.opacity = (0.12 + 0.88 * dark).toFixed(2);
      tri.style.filter = `brightness(${(0.25 + 0.75 * dark).toFixed(2)})`;
      // text only becomes legible in the last few steps
      a.style.opacity = p < 0.75 ? 0 : Math.min(1, (p - 0.75) / 0.2).toFixed(2);
      if (t >= steps) {
        clearInterval(spin);
        // ease to the nearest upright orientation with a slight tilt
        tri.style.transition = 'transform .45s ease-out, opacity .1s linear, filter .1s linear';
        tri.style.transform = `rotate(${Math.ceil(angle / 360) * 360 + randInt(11) - 5}deg) scale(1)`;
        tri.style.opacity = 1; tri.style.filter = 'none'; a.style.opacity = 1;
        spin = setTimeout(() => { tri.classList.add('bob'); onDone(); }, 450);
        return;
      }
      angle += 50 + randInt(110);                // keep turning the same way: smooth tumble
      const sc = 0.5 + 0.5 * p;
      tri.style.transform = `rotate(${angle}deg) scale(${sc.toFixed(2)})`;
      t++;
    };
    frame();
    spin = setInterval(frame, 100);
  }

  CM.register({
    id: 'eightball', name: '8-BALL', action: 'SHAKE!', hint: 'TAP THE BALL TO SHAKE',
    mount(stage, ctx) {
      stage.innerHTML = TEMPLATE;
      drawBall(); drawWindow();
      tri = $('tri');
      const wrap = $('ball-wrap');
      wrap.addEventListener('click', () => ctx.trigger());
      wrap.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ctx.trigger(); }
      });
    },
    roll(idx, done) {
      hideTri();
      const ball = $('ball-wrap');
      ball.classList.remove('shake'); void ball.offsetWidth; ball.classList.add('shake');
      setTimeout(() => ball.classList.remove('shake'), 650);
      tumble(CM.ctx.choices[idx], () => done('SHAKE AGAIN?'));
    },
    unmount() { clearInterval(spin); clearTimeout(spin); }
  });
})();
