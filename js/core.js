// Shared registry + helpers. Every "object" (8-ball, wheel, dice, ...) registers itself here.
//
// Game interface:
//   { id, name, action, hint,
//     mount(stage, ctx)  build DOM into `stage`; call ctx.trigger() when the user taps the object
//     roll(idx, done)    animate so the result lands on choice `idx`; call done(message?) when finished
//     unmount()          clear timers / listeners }
// The winner `idx` is always chosen by CM.randInt() in app.js BEFORE any animation runs, so every
// object is exactly as fair as the random draw -- animations are steered to the result, never the reverse.
(() => {
  const CM = window.CM = { games: [], ctx: { choices: [], trigger() {} }, MIN: 2, MAX: 20 };
  CM.$ = id => document.getElementById(id);
  CM.register = g => CM.games.push(g);
  CM.byId = id => CM.games.find(g => g.id === id);

  // Uniform random integer in [0, n) -- rejection sampling, no modulo bias.
  CM.randInt = n => {
    const max = Math.floor(0x100000000 / n) * n;
    const buf = new Uint32Array(1);
    do { crypto.getRandomValues(buf); } while (buf[0] >= max);
    return buf[0] % n;
  };

  // Font size (px) for text written on a small face, by length.
  CM.fit = text => {
    const n = text.length;
    return n <= 5 ? 20 : n <= 10 ? 15 : n <= 18 ? 12 : n <= 30 ? 10 : 8;
  };

  CM.esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
})();
