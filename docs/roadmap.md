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

- **More puzzles**, toward 10×10×10, and themed batches like the 2D game's sheets
- **An editor** for drawing shapes layer by layer, with the solvability check built in
- **A guided tutorial** on a real block, like the 2D game's how-to-play
- **Daily puzzle** with a streak
- **Badges** and overall stats
- **Story mode**: the 2D game's jobs and fights, once its story settles there. Fights would
  need 3D versions of the enemy powers (fog on faces, turning the block, scrambled clues)
- **Deploys**: GitHub Pages for main (in `ci.yml`, once the repo has Pages on), and a
  production site for releases like the 2D game's Azure one
