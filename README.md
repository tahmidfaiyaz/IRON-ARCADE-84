# IRON ARCADE ’84

An original, playable bodybuilding rhythm arcade built with HTML, CSS, and vanilla JavaScript. Original canvas artwork, bitmap typography, and synthesized Web Audio music; no external images, fonts, audio downloads, or runtime dependencies.

## Play

Launch the game with Python 3:

```sh
cd /workspace/IRON-ARCADE-84
python3 -m http.server 8000 --bind 0.0.0.0
```

Alternatively, `npm start` runs that same server. Open port **8000** in your browser. Serve this directory on any static web host to share it. No build step is required. The cloud browser blocks direct `file:` navigation, so validation uses the HTTP server. Browser privacy settings can limit persistent storage; the game remains playable and keeps progress for the current visit.

## Controls and rules

| Control | Action |
| --- | --- |
| Enter / Start Workout | Start a 30-second round |
| Space / click or tap LIFT! | Perform one rep |
| P / Escape / Pause | Pause or resume |
| R / Restart | Discard this round and start fresh |
| Play Again | Start another round after results |
| Sound | Enable or mute the original music and effects |
| ? | Open instructions; pauses an active workout |

Each successful lift earns **100 points and 10 XP**. The bar needs **450 ms** to recover. Lift **700–1,050 ms** after the previous rep, while the needle is in the cyan zone, for a perfect rep: **150 points × combo and 20 XP**. Perfect reps increase the multiplier up to **5×**; a good rep resets it to 1×. Holding a key does not automate reps.

Only completed rounds bank XP and best scores. Career ranks are **Gym Rookie** (0 XP), **Iron Grinder** (250 XP), **Muscle Machine** (1,000 XP), and **Iron Legend** (3,000 XP). Best score, best rep count, workouts, and total XP save locally under `iron-arcade-84:v1`; no account or network is needed. Pausing freezes both time and rhythm. Switching tabs automatically pauses. Sound starts muted. Reduced-motion preferences disable shake, particles, and character movement.

## Development and validation

Use Node.js 18+ for tests. Python 3 serves browser tests. Production play requires neither npm nor Node.

```sh
npm ci --cache /tmp/iron-npm-cache
npm test
npm run test:browser
```

Browser tests use Playwright and `/usr/bin/chromium` by default. Set `CHROMIUM_PATH` to another installed Chromium executable if needed. The test configuration starts a Python server on port 8000 when one is not already running. Browser tests exercise real DOM and input with a controlled clock, so full 30-second rounds can be validated quickly.

- `engine.js`: deterministic workout rules and validated, fault-tolerant storage.
- `game.js`: UI, input, progression, results, and animation orchestration.
- `scene.js`: original pixel gym and animated bodybuilder.
- `audio.js`: original synthesized music and arcade effects.
- `style.css`, `index.html`: responsive arcade cabinet and accessible controls.
- `assets/arcade.ttf`: bundled original bitmap font. Optional regeneration with `python3 tools/make_font.py` requires FontTools; regeneration is not needed to play or test.
- `tests/`: game-engine unit tests and Chromium integration tests.

The current cloud workspace is already isolated. Work in this checkout; a separate Git worktree is unnecessary.
