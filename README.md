# PORTFOLIO_001

A digital music portfolio with a built-in audio player. Static site, no build
step, no dependencies. Plain HTML / CSS / JavaScript with a Sword Art Online
HUD-inspired aesthetic (cyan accents, monospace numerals, corner brackets,
scanlines). Light by default, with a header toggle for the dark HUD mode.

## Features

- Track grid with active-track highlighting
- Projects tab for other work (code, writing, sound design, anything)
- Light / dark theme toggle (preference saved to localStorage)
- Sticky player bar with transport controls (play / pause / prev / next)
- Scrub bar rendered as a real waveform, decoded from the audio file
- Click / drag the waveform to seek
- Live frequency-bar visualizer (32 bars, cyan gradient)
- Queue panel with reorder-friendly remove and "play now"
- Keyboard shortcuts: `Space` play/pause, `←/→` seek 5s, `↑/↓` volume
- Accessible controls (proper `aria-*` attributes, keyboard-navigable)
- Honors `prefers-reduced-motion`

## Running locally

Open `index.html` directly in a browser — it works from `file://`.

> **Heads-up about waveform decoding:** the waveform module uses
> `fetch()` + `decodeAudioData()` to read the audio file's peaks. Most
> browsers allow this over `file://`, but some (notably older Safari
> builds) don't. If the waveform shows "waveform unavailable (file://?)",
> start a tiny local server:
>
> ```sh
> cd portfolio
> python3 -m http.server 8000
> # then open http://localhost:8000
> ```
>
> Playback and all other features still work either way; only the
> pre-rendered waveform is affected.

## Adding tracks

1. Drop your audio file (`.mp3`, `.ogg`, or `.wav`) into
   `assets/audio/`.
2. Open `js/tracks.js` and append an entry to the `TRACKS` array:

   ```js
   {
     id: "t_001",
     title: "First Light",
     artist: "Your Name",
     src: "assets/audio/first-light.mp3",
     duration: 0,        // optional; auto-detected on load
     cover: "assets/covers/first-light.jpg", // optional
   }
   ```

3. Reload the page. Your track appears in the grid.

## Adding projects

1. (Optional) Drop a cover image into `assets/projects/`.
2. Open `js/projects.js` and append an entry to the `PROJECTS` array:

   ```js
   {
     id: "p_001",
     title: "Algorithmic Composition Tool",
     year: 2025,
     kind: "CODE",
     summary: "One-line tagline.",
     description: "Longer paragraph about the project.",
     url: "https://example.com",
     image: "assets/projects/cover.jpg",
   }
   ```

3. Reload. Click the **PROJECTS** tab in the header to see it.

`kind` is a free-form badge label — pick anything (`CODE`, `WRITING`,
`MUSIC`, `SOUND`, `VIDEO`, etc.) and it'll render as a small pill on the card.

## Customizing the theme

All theme variables live at the top of `styles.css`. Light is the default
under `:root`; dark overrides are under `[data-theme="dark"]`.

| Variable        | Purpose                                  |
|-----------------|------------------------------------------|
| `--bg-base`     | Page background                          |
| `--bg-surface`  | Surfaces (cards, player bar)             |
| `--accent`      | Primary HUD cyan                         |
| `--accent-dim`  | Dormant / border state                   |
| `--highlight`   | Now-playing or warning accent            |
| `--text`        | Primary text                             |
| `--font-sans`   | Body / UI font                           |
| `--font-mono`   | Monospace font (numerals, time codes)    |

## File map

```
portfolio/
├── index.html          # page markup
├── styles.css          # theme + layout (light + dark)
├── js/
│   ├── tracks.js       # music catalogue (you edit this)
│   ├── projects.js     # projects catalogue (you edit this)
│   ├── theme.js        # light/dark toggle
│   ├── tabs.js         # tab switching + project rendering
│   ├── player.js       # controls, state, queue
│   ├── waveform.js     # Web Audio peaks → SVG
│   └── visualizer.js   # AnalyserNode → canvas bars
├── assets/
│   ├── audio/          # drop music tracks here
│   └── projects/       # drop project images here
└── README.md
```

## Deploying later

When you're ready to put it online, any static host will work
(GitHub Pages, Netlify, Vercel, Cloudflare Pages, etc.). The folder is
already the deployable artifact — no build step required.
