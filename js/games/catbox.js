// Schrodinger's box: every choice sits in superposition (the bars wobble at equal height) until you observe it.
// The "wave function" then collapses onto the winner, the lid pops open and a cat holds up the answer.
// The winner is decided first; the physics is purely theatrical.
(() => {
  const { $, esc, randInt, fit } = CM;
  const W = 320, H = 330;
  let raf = 0, timers = [], bars = [], n = 0;

  const CAT = [                                   // pixel cat head, 16 wide
    'kg............gk', 'kgg..........ggk', 'kgpggggggggggpgk', 'kgggggggggggggk', 'kggggggggggggggk',
    'kggyyggggggyyggk', 'kggykggggggykggk', 'kggggggggggggggk', 'kggggggppgggggk', 'kgwwggwwwwggwwgk',
    'kkggwwggggwwggkk', '.kkkggggggggkkk.'
  ].map(r => r.padEnd(16, '.').slice(0, 16));
  const PAL = { k: '#1a1c2c', g: '#8a8a98', p: '#ef9ab0', y: '#ffe070', w: '#e8e8f0' };

  function sprite(px, ox, oy) {
    let o = '';
    CAT.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch !== '.') o += `<rect x="${ox + x * px}" y="${oy + y * px}" width="${px}" height="${px}" fill="${PAL[ch]}"/>`;
    }));
    return o;
  }

  function build() {
    const bw = (W - 40) / n;
    let o = `<rect width="${W}" height="${H}" fill="#1a1c2c"/><rect width="${W}" height="150" fill="#202440"/>`;
    // probability bars
    for (let i = 0; i < n; i++) {
      o += `<rect id="pb${i}" x="${20 + i * bw + 1}" y="100" width="${Math.max(2, bw - 2)}" height="30" fill="#73eff7"/>`;
    }
    o += `<rect x="18" y="131" width="${W - 36}" height="2" fill="#566c86"/>`;
    o += `<text id="cat-eq" x="${W / 2}" y="26" text-anchor="middle" font-size="8" fill="#c9d3ff" font-family="'Press Start 2P',monospace">&#968; = 1/&#8730;${n} &#931; |choice&#10217;</text>`;
    o += `<text id="cat-p" x="${W / 2}" y="46" text-anchor="middle" font-size="7" fill="#566c86" font-family="'Press Start 2P',monospace">P = 1/${n} EACH</text>`;
    // geiger LED
    o += `<rect x="14" y="152" width="40" height="22" fill="#3b3f5c" stroke="#000" stroke-width="2"/><circle id="cat-led" cx="26" cy="163" r="4" fill="#5a1f1f"/>` +
      `<text x="33" y="167" font-size="6" fill="#ffcd75" font-family="'Press Start 2P',monospace">GM</text>`;
    // cat (hidden until opened) sits behind the front of the box
    o += `<g id="cat-cat" transform="translate(112 205)" opacity="0">${sprite(6, 0, 0)}</g>`;
    // box body
    o += `<rect x="80" y="200" width="160" height="110" fill="#8a5a1d" stroke="#000" stroke-width="3"/>`;
    for (let k = 0; k < 4; k++) o += `<rect x="83" y="${216 + k * 24}" width="154" height="3" fill="#6b4412"/>`;
    o += `<text id="cat-q" x="160" y="278" text-anchor="middle" font-size="34" fill="#ffcd75" font-family="'Press Start 2P',monospace">?</text>`;
    // lid, hinged at its left edge
    o += `<g id="cat-lid" transform="translate(76 200)"><rect x="0" y="-18" width="168" height="18" fill="#a8712a" stroke="#000" stroke-width="3"/><rect x="6" y="-12" width="156" height="3" fill="#c89048"/></g>`;
    return o;
  }

  function reset() {
    cancelAnimationFrame(raf); timers.forEach(t => { clearTimeout(t); clearInterval(t); }); timers = [];
    if (!$('cat-svg')) return;
    $('cat-lid').setAttribute('transform', 'translate(76 200)');
    $('cat-cat').setAttribute('opacity', '0'); $('cat-cat').setAttribute('transform', 'translate(112 205)');
    $('cat-q').setAttribute('opacity', '1');
    $('cat-sign').className = '';
    $('cat-box').style.transform = '';
    bars.forEach(b => { b.setAttribute('y', 100); b.setAttribute('height', 30); b.setAttribute('fill', '#73eff7'); });
    $('cat-p').textContent = `P = 1/${n} EACH`;
  }

  CM.register({
    id: 'catbox', name: 'CAT BOX', action: 'OBSERVE!', hint: 'TAP THE BOX TO OBSERVE THE CAT',
    mount(stage, ctx) {
      n = ctx.choices.length;
      stage.innerHTML = `<div id="cat-box" role="button" tabindex="0" aria-label="Open the box"><svg id="cat-svg" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">${build()}</svg>
        <div id="cat-sign"><span></span></div></div>`;
      bars = [...Array(n).keys()].map(i => $('pb' + i));
      const wrap = $('cat-box');
      wrap.addEventListener('click', () => ctx.trigger());
      wrap.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ctx.trigger(); }
      });
    },
    roll(idx, done) {
      reset();
      const choices = CM.ctx.choices, led = $('cat-led'), box = $('cat-box');
      const TOTAL = 3200, t0 = performance.now();
      let nextClick = 0, collapsed = false;
      const wob = bars.map(() => ({ f: 4 + Math.random() * 6, p: Math.random() * 6.28 }));
      const step = now => {
        const t = now - t0;
        if (t < TOTAL) {
          const k = t / TOTAL;                                   // 0 -> 1: the superposition gets more agitated
          bars.forEach((b, i) => {
            const h = 34 + 22 * Math.sin(t / 1000 * wob[i].f + wob[i].p) * (0.4 + k);
            b.setAttribute('height', h.toFixed(1)); b.setAttribute('y', (131 - h).toFixed(1));
          });
          box.style.transform = `translate(${((Math.random() - 0.5) * 6 * k).toFixed(1)}px, ${((Math.random() - 0.5) * 4 * k).toFixed(1)}px)`;
          if (t >= nextClick) {                                   // Geiger clicks speed up
            nextClick = t + 380 - 330 * k + Math.random() * 60;
            CM.audio.geiger(0.9);
            led.setAttribute('fill', '#ff4d4d'); timers.push(setTimeout(() => led.setAttribute('fill', '#5a1f1f'), 60));
          }
          raf = requestAnimationFrame(step); return;
        }
        if (!collapsed) {                                         // observation!
          collapsed = true;
          box.style.transform = '';
          $('cat-p').textContent = 'OBSERVED! COLLAPSE!';
          CM.audio.beep(880, 0.15);
          bars.forEach((b, i) => {
            b.setAttribute('fill', i === idx ? '#ffcd75' : '#3b3f5c');
            b.setAttribute('height', i === idx ? 110 : 2); b.setAttribute('y', i === idx ? 21 : 129);
          });
          timers.push(setTimeout(() => {
            $('cat-p').textContent = `P = 1 (${choices[idx].toUpperCase().slice(0, 14)})`;
            $('cat-lid').setAttribute('transform', 'translate(76 200) rotate(-105)');
            $('cat-q').setAttribute('opacity', '0');
            CM.audio.thud(0.8);
            $('cat-cat').setAttribute('opacity', '1');
            // cat rises out of the box
            const r0 = performance.now(), rise = n2 => {
              const u = Math.min(1, (n2 - r0) / 450);
              $('cat-cat').setAttribute('transform', `translate(112 ${(205 - 70 * u).toFixed(1)})`);
              if (u < 1) raf = requestAnimationFrame(rise);
            };
            raf = requestAnimationFrame(rise);
            const sign = $('cat-sign');
            sign.firstChild.textContent = choices[idx];
            sign.firstChild.style.fontSize = Math.round(fit(choices[idx]) * 0.9) + 'px';
            sign.className = 'up';
            CM.audio.meow(); CM.audio.chime();
            timers.push(setTimeout(() => done('> ' + choices[idx].toUpperCase()), 700));
          }, 450));
        }
      };
      raf = requestAnimationFrame(step);
    },
    unmount() { reset(); }
  });
})();
