// Setup screen, object picker, URL state. Games live in js/games/*.js and register via CM.register().
(() => {
  const { $, MIN, MAX, ctx } = CM;
  let choices = [], game = null, busy = false;

  // ---- setup ----
  function clampCount() {
    let n = parseInt($('count').value, 10);
    if (isNaN(n)) n = 0;
    return Math.max(0, Math.min(MAX, n));
  }
  function renderFields() {
    const n = clampCount();
    const f = $('fields');
    const old = [...f.querySelectorAll('input')].map(i => i.value);
    f.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const inp = document.createElement('input');
      inp.type = 'text'; inp.maxLength = 40;
      inp.placeholder = 'CHOICE ' + (i + 1);
      inp.setAttribute('aria-label', 'Choice ' + (i + 1));
      inp.value = old[i] || '';
      f.appendChild(inp);
    }
  }
  function fillSetup(vals) {
    $('count').value = Math.max(MIN, vals.length || 3);
    renderFields();
    $('fields').querySelectorAll('input').forEach((inp, i) => { inp.value = vals[i] || ''; });
  }
  $('count').addEventListener('input', renderFields);

  // ---- URL: ?g=wheel&c=Pizza&c=Tacos  (g optional, defaults to the 8-ball) ----
  function shareUrl() {
    const q = ['g=' + game.id, ...choices.map(c => 'c=' + encodeURIComponent(c))].join('&');
    return location.href.split(/[?#]/)[0] + '?' + q;
  }
  function syncUrl() {
    try { history.replaceState(null, '', shareUrl()); } catch (e) { /* e.g. file:// */ }
  }

  // ---- picker + play ----
  function buildPicker() {
    const p = $('picker');
    CM.games.forEach(g => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'tile'; b.textContent = g.name; b.dataset.id = g.id;
      b.addEventListener('click', () => selectGame(g.id));
      p.appendChild(b);
    });
  }
  function selectGame(id) {
    if (game && game.unmount) game.unmount();
    busy = false;
    game = CM.byId(id) || CM.games[0];
    $('stage').innerHTML = '';
    game.mount($('stage'), ctx);
    $('hint').textContent = game.hint;
    $('action').textContent = game.action;
    $('share').textContent = 'COPY SHARE LINK';
    document.querySelectorAll('#picker .tile').forEach(b => b.classList.toggle('on', b.dataset.id === game.id));
    syncUrl();
  }
  ctx.trigger = () => {
    if (busy || !game) return;
    busy = true;
    const idx = CM.randInt(choices.length);      // winner decided here, uniformly, before any animation
    $('hint').textContent = '...';
    const g = game;
    g.roll(idx, msg => {
      if (g !== game) return;
      busy = false;
      $('hint').textContent = msg || 'AGAIN?';
    });
  };
  $('action').addEventListener('click', () => ctx.trigger());

  function startPlay(vals, gid) {
    choices = vals;
    ctx.choices = vals;
    $('setup').classList.add('hidden');
    $('play').classList.remove('hidden');
    selectGame(gid || (game && game.id) || 'eightball');
  }

  $('go').addEventListener('click', () => {
    const n = parseInt($('count').value, 10);
    if (!(n >= MIN && n <= MAX)) { $('err').textContent = `PICK ${MIN}-${MAX} CHOICES`; return; }
    const vals = [...$('fields').querySelectorAll('input')].map(i => i.value.trim());
    if (vals.some(v => !v)) { $('err').textContent = 'FILL IN EVERY CHOICE'; return; }
    $('err').textContent = '';
    startPlay(vals);
  });
  $('back').addEventListener('click', () => {
    if (game && game.unmount) game.unmount();
    busy = false;
    fillSetup(choices);
    $('play').classList.add('hidden');
    $('setup').classList.remove('hidden');
  });
  $('share').addEventListener('click', async () => {
    const url = shareUrl();
    try { await navigator.clipboard.writeText(url); $('share').textContent = 'COPIED!'; }
    catch (e) { window.prompt('Copy this link:', url); }
  });

  // ---- boot ----
  buildPicker();
  const params = new URLSearchParams(location.search);
  const fromUrl = params.getAll('c').map(v => v.trim().slice(0, 40)).filter(Boolean).slice(0, MAX);
  if (fromUrl.length >= MIN) { fillSetup(fromUrl); startPlay(fromUrl, params.get('g')); }
  else { renderFields(); if (fromUrl.length) fillSetup(fromUrl); }
})();
