# Choice Maker

A minimalist 8-bit magic eight-ball that makes your decisions. Enter your choices, shake the ball, get one answer (every choice equally likely).

Static site, no build step. Open `index.html` locally, or host on GitHub Pages.

Enter your choices, then pick an object to decide: **8-BALL**, **WHEEL**, **DICE** (a D4/D6/D8/D12/D20 that fits your number of choices, with ROLL AGAIN faces for any spares) **MAGIC COIN** (works for any number of choices), **PLINKO**, **MARBLES** (numbered marbles pour into a bumper-and-spinner arena and funnel down to a winner), **SLOTS**, or **SCHRÖDINGER** (Schrödinger's cat: every choice at once until observed). The winner is drawn uniformly at random first; each animation is then steered to land on it, so every choice is equally likely whichever object you use.

## Deploy to GitHub Pages

1. Push to `main`.
2. Repo **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch `main`, folder `/ (root)`.
3. (Or use the included GitHub Actions workflow with Pages source set to "GitHub Actions".) Site appears at `https://nreff.github.io/choice-maker/`.

## Shareable links

Choices can be passed in the URL, one `c` parameter per choice (2–20, up to 40 characters each). An optional `g` picks the object (`eightball`, `wheel`, `dice`, `coin`, `plinko`, `marbles`, `slots`, `catbox`; default `eightball`):

```
https://nreff.github.io/choice-maker/?g=wheel&c=Pizza&c=Tacos&c=Sushi
```

Opening a link like that skips setup and goes straight to that object. The **COPY SHARE LINK** button builds one from your current choices.

## Adding an object

Create `js/games/<name>.js` that calls `CM.register({ id, name, action, hint, mount, roll, unmount })` (see the header of `js/core.js`), add a `<script>` tag in `index.html` before `js/app.js`, and add its styles to `css/games.css`.
