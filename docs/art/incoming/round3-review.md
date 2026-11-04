# Round 3 review: gadgets, and the grid decision

Reviewed against `../prompts/README.md` and `../prompts/03-gadgets.md`. Each candidate was
looked at full size, then trimmed and rendered at a true 18 px and 40 px on paper and on
both dark backgrounds (`--surface` `#212329` and `--bg` `#17181c`), plus a palette scan
against `src/styles/tokens.css`.

## Picks

| Gadget           | Pick     | Why                                                                                             |
| ---------------- | -------- | ----------------------------------------------------------------------------------------------- |
| gadget-bomb      | **v1**   | Near-identical to v2. Its sticker border is thicker, so it holds better at 18 px.               |
| gadget-patch-kit | **v2**   | Four dots in a square on a bold pad, longer shape. v1's dots are scattered. Both read at 18 px. |
| gadget-sponge    | **none** | Both rejected. Regenerate from the rewritten prompt, as `gadget-sponge-v3.png` and `-v4.png`.   |

## Why the sponge failed

- **It reads as cheese.** A yellow block in perspective with holes is Swiss cheese (v1) or
  a block of butter or a box (v2). The hard corners and the large round holes do it.
- **The ink is invisible.** The drop is about one pixel at 18 px, and it sits on the
  outline, where squid ink is hard to tell from graphite. So nothing says "wipes ink",
  which is the gadget's mechanic.
- **This is the prompt's fault.** It asked for "a single small spot", and the correction
  pass followed that faithfully. The prompt in `03-gadgets.md` is rewritten: a pillowy
  shape, small pores, and a bold ink streak surrounded by yellow.

## Notes on the picks

- **Bomb on the dark theme.** The solid graphite body nearly matches the dark background,
  so at 18 px the bomb becomes a paper ring with a fuse and a flame. It still reads as a
  bomb, and the flame survives. Not blocking. I'll check it again in the real tray once
  it's wired in.
- **Palette** is clean on both picks: graphite, paper and the one accent.
- **Sticker borders** come out at about one pixel at 18 px once trimmed, which is enough.

## Grid decision: native grids accepted

The owner accepted the generated grids for all sets, so nothing gets regenerated for cell
count. Keep asking for the sizes in the README, because the ask is what keeps the art
chunky.

The earlier figures were too confident, so here are better ones. These come from the
length of the most common pixel run on each pick. They are approximate, especially on
art with big solid areas.

| Set     | Asked for | Measured cells across |
| ------- | --------- | --------------------- |
| Cast    | 48        | roughly 55 to 115     |
| Enemies | 32        | roughly 45 to 95      |
| Gadgets | 32        | roughly 32 to 48      |

Two consequences:

- **There is no single 96 grid for the cast.** The rounds 1 and 2 notes said otherwise and
  now carry a correction. A new cast candidate should match the cell size of the picks.
- **Snapping to a grid is not promised any more.** The cast and most enemies are not on one
  regular lattice, so a snap could shift edges and damage faces. Only the bomb and the
  patch kit come close to a regular grid. Cleanup will try snapping on one sprite first.
  The fallback is palette snap, trim and a clean downscale, which suits these display
  sizes: 38 px on a 2x screen is 76 device pixels, about one per cell.

## What happens next

For the generator:

1. Generate `gadget-sponge-v3.png` and `gadget-sponge-v4.png` from the rewritten prompt.
2. Move on to `../prompts/04-icons.md`. Glyphs are applied as CSS masks, so their alpha
   channel is the image: keep it fully opaque or fully transparent, with no soft fringe.

Leave `05-optional.md` until those are in. Cleanup and wiring remain my side, not the
generator's.
