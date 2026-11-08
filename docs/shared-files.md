# Files the 3D game shares

[Picross Cubed](https://github.com/austinthedeveloper/picross-3d), the 3D game, copies
these files from this repo verbatim (`npm run sync:web` there, and its daily "Sync from the
web game" workflow). This repo owns them: a change here reaches the 3D game at its next sync.

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
puzzle. Its sync workflow then opens a "Web sync needs porting" issue there instead of a PR.
