# Shared files

This game is its own repo rather than part of a monorepo with the 2D game, so each keeps its
own docs, data and releases. The pieces worth sharing are copied in, unchanged, and the 2D
game stays their owner.

| File                                             | What it is                         |
| ------------------------------------------------ | ---------------------------------- |
| `src/styles/tokens.css`, `base.css`              | The palette, type and buttons      |
| `src/ui/sound.ts`                                | The synthesized sound effects      |
| `src/ui/haptics.ts` (and its test)               | Vibration, with the iOS fallback   |
| `src/ui/theme.ts`                                | The high-contrast switch           |
| `src/ui/dom.ts`, `motion.ts`                     | `el()` and the animation helpers   |
| `src/ui/components/homeLink.ts`, `muteButton.ts` | The Home button and sound toggle   |
| `src/game/storage.ts`                            | Safe localStorage reads and writes |
| `src/engine/random.ts`                           | Seeded random numbers              |

The list lives in `SHARED` in `scripts/sync-web.mjs`. They keep the same paths as in the 2D
game, so their imports work here: this repo has its own `src/game/settings.ts` with the
settings they read (`muted`, `haptics`, `highContrast`).

## Updating

With the 2D game checked out next to this repo (`../picross`):

```bash
npm run sync:web                              # copy them and update shared.lock.json
npm run check:shared -- --from ../picross     # just say what's changed there
```

Then run the tests and commit the copies with `shared.lock.json`, which records the 2D
game's commit and each file's hash.

## Don't edit them here

`npm run check:shared` (in CI) fails if a shared file no longer matches the lock. Make the
change in the 2D game, then sync. If this game needs something different, stop sharing that
file: take it out of `SHARED`, sync, and it becomes this repo's own.
