# Roadmap

What this game has carried over from the 2D game so far, and what's left. The 2D game is
the reference for how each should feel.

## In

- Free play: the list by size, best times, progress saved mid-puzzle, names kept secret
  until solved
- Relaxed and Hearts modes, three hints, undo/redo, reset, a timer that pauses when hidden
- The look: tokens, type and buttons (shared), sound effects and haptics (shared), high
  contrast, light and dark
- Keyboard play and screen-reader descriptions
- How to play (the rules, then the first puzzle)
- Unit tests, a solvability check for every puzzle, phone-sized browser tests, CI

## Next

The backlog lives on GitHub: the [project board](https://github.com/users/austinthedeveloper/projects/8)
and [milestones](https://github.com/austinthedeveloper/picross-3d/milestones). Epics (label
`epic`) group user stories (label `story`):

| Milestone              | Epics                                                          |
| ---------------------- | -------------------------------------------------------------- |
| v0.2 Free play+        | Free play, bigger and better (#1); Puzzle editor (#10)         |
| v0.3 Story foundations | Story mode, structure (#14); scenes and the story import (#20) |
| v0.4 Fights            | Story mode, fights (#24)                                       |
| v0.5 Story content     | Story content (#37)                                            |
| v1.0 Launch            | Extras and launch (#42)                                        |

Story mode follows the 2D game, which stays the source of truth for the story: an import
with a compatibility gate and a daily sync, like the SNES demake's.
