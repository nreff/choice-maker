// Slot machine: pull the lever, the reel spins through your choices and clunks to a stop on the winner.
// The winner is decided first; the reel strip is built so the winner is exactly on the pay line when it stops.
(() => {
  const { $, esc, randInt } = CM;
  const IH = 52, DUR = 3600;                      // item height (px), spin time (ms)
  let raf = 0, timers = [], strip = null, bulbs = [];

  const fitText = t => {
    const fs = Math.min(18, Math.floor(250 / t.length));
    return fs >= 8 ? { t, fs } : { t: t.slice(0, 30) + '.', fs: 8 };
  };
  const itemHtml = text => { const { t, fs } = fitText(text); return `<div class="sl-item" style="font-size:${fs}px">${esc(t)}</div>`; };
  const setY = y => { strip.style.transform = `translateY(${(IH - y).toFixed(1)}px)`; };

  CM.register({
    id: 'slots', name: 'SLOTS', action: 'PULL!', hint: 'PULL THE LEVER (OR TAP THE MACHINE)',
    mount(stage, ctx) {
      stage.innerHTML = `<div id="slot-machine" role="button" tabindex="0" aria-label="Pull the lever">
        <div id="slot-top"><span class="bulb"></span><span class="bulb"></span><span class="bulb"></span><span class="bulb"></span><span class="bulb"></span></div>
        <div id="slot-body">
          <div id="slot-window"><div class="payline l">&#9654;</div><div class="payline r">&#9664;</div>
            <div id="slot-strip"></div><div class="slot-shade t"></div><div class="slot-shade b"></div></div>
          <div id="slot-lever"><div id="slot-stick"></div><div id="slot-knob"></div></div>
        </div>
        <div id="slot-tray">JACKPOT</div></div>`;
      strip = $('slot-strip');
      bulbs = [...document.querySelectorAll('#slot-top .bulb')];
      const c = ctx.choices, three = [c[randInt(c.length)], c[randInt(c.length)], c[randInt(c.length)]];
      strip.innerHTML = three.map(itemHtml).join('');
      setY(IH);                                                    // centre the middle item
      const m = $('slot-machine');
      m.addEventListener('click', () => ctx.trigger());
      m.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ctx.trigger(); }
      });
    },
    roll(idx, done) {
      cancelAnimationFrame(raf); timers.forEach(clearTimeout); timers = [];
      const choices = CM.ctx.choices, n = choices.length;
      bulbs.forEach(b => b.classList.remove('on'));
      $('slot-tray').textContent = 'SPINNING';
      const lever = $('slot-lever'); lever.classList.remove('pull'); void lever.offsetWidth; lever.classList.add('pull');
      // strip: random items, the winner placed at FIN, random neighbours around it
      const N = 34, FIN = N - 2, items = [];
      let prev = -1;
      for (let i = 0; i < N; i++) {
        let k = randInt(n); if (n > 1 && k === prev) k = (k + 1 + randInt(n - 1)) % n;
        items.push(k); prev = k;
      }
      items[FIN] = idx;
      strip.innerHTML = items.map(k => itemHtml(choices[k])).join('');
      const target = FIN * IH, t0 = performance.now();
      let lastCell = 0;
      CM.audio.whoosh(0.5, 200, 1600);
      const step = now => {
        const t = Math.min(1, (now - t0) / DUR);
        const c1 = 1.1, c3 = c1 + 1, u = t - 1;                    // easeOutBack: slows down, overshoots slightly, settles
        const e = 1 + c3 * u * u * u + c1 * u * u;
        const y = target * e;
        setY(y);
        const cell = Math.floor((y + IH / 2) / IH);
        if (cell !== lastCell) { lastCell = cell; CM.audio.tick(0.7, 0.8 + (1 - t) * 0.5); }
        if (t < 1) { raf = requestAnimationFrame(step); return; }
        setY(target);
        CM.audio.thud(0.7);
        $('slot-tray').textContent = 'JACKPOT!';
        let f = 0;
        const iv = setInterval(() => {
          bulbs.forEach((b, i) => b.classList.toggle('on', (i + f) % 2 === 0));
          if (++f > 14) { clearInterval(iv); bulbs.forEach(b => b.classList.add('on')); }
        }, 110);
        timers.push(iv);
        CM.audio.kerching();
        done('> ' + choices[idx].toUpperCase());
      };
      raf = requestAnimationFrame(step);
    },
    unmount() { cancelAnimationFrame(raf); timers.forEach(t => { clearTimeout(t); clearInterval(t); }); timers = []; }
  });
})();
