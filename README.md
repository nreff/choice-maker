# Choice Maker

A minimalist 8-bit magic eight-ball that makes your decisions. Enter your choices, shake the ball, get one answer (every choice equally likely).

Static site, no build step. Open `index.html` locally, or host on GitHub Pages.

## Deploy to GitHub Pages

1. Push to `main`.
2. Repo **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch `main`, folder `/ (root)`.
3. Site appears at `https://nreff.github.io/choice-maker/`.

## Shareable links

Choices can be passed in the URL, one `c` parameter per choice (2–20, up to 40 characters each):

```
https://nreff.github.io/choice-maker/?c=Pizza&c=Tacos&c=Sushi
```

Opening a link like that skips setup and goes straight to the eight ball. The **COPY SHARE LINK** button builds one from your current choices.
