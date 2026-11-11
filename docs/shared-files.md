# Files the 3D game shares

Picross Cubed, the 3D game in `apps/cubed/`, copies these files from the 2D game's `src/`
and `public/` (in `apps/picross/`) verbatim (`npm -w apps/cubed run sync:web`). The 2D game
owns them: after changing one, sync and commit the copies; CI (`npm run check:cubed`) fails
if they differ. The paths below are the same in both apps.

| What       | Files                                                                                                                                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Look       | `src/styles/tokens.css`, `base.css`; `run.css`, `fight.css`, `dig.css`, `dialogue.css`, `art.css`                                                                                                                               |
| Feel       | `src/ui/sound.ts`, `haptics.ts` (and its test), `theme.ts`, `dom.ts`, `motion.ts`                                                                                                                                               |
| Plumbing   | `src/game/storage.ts`, `src/engine/random.ts`, `src/ui/components/homeLink.ts`, `muteButton.ts`                                                                                                                                 |
| Story code | `src/puzzles/scenes.ts`, `backdrops.ts` (and their tests), `gadgets.ts`, `src/game/dialogue.ts` (and its test), `src/ui/art.ts` (and its test), `src/ui/components/dialogue.ts`, `backdrop.ts`, `src/ui/screens/sceneScreen.ts` |
| Story data | `src/puzzles/{scenes,backdrops,chapters,runs,encounters,run}/*.json`                                                                                                                                                            |
| Art        | `public/art/{cast,enemies,gadgets,icons}/`                                                                                                                                                                                      |

**Keep them self-contained:** a shared file may import only other shared files (or ones
the 3D game has under the same name with the same exports, like `game/settings.ts`'s
`getSettings().muted`). That's why `backdrops.test.ts` doesn't import `runs.ts`: its runs
check lives in `runs.test.ts`.

**The story gate:** the 3D game reads the jobs and encounters for blocks and fails its tests
when the story uses a field, power or kind it can't play yet, or an encounter without a 3D
puzzle (`apps/cubed/src/story/story.test.ts`). Run `npm test` after a story change.

**Outside this repo:** the SNES demake (`../snes/picross-snes`) imports the pack, art and
story with `make import`, reading `src/puzzles/` and `public/art/` from its `WEB` path. Those
are now in `apps/picross/`, so its `WEB` is `../../picross/apps/picross` (it was
`../../picross` before the 2D game moved, #142).
