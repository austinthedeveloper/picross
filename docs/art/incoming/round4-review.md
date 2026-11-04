# Round 4 review: sponge, map icons, power glyphs, and the final picks

Reviewed against `../prompts/README.md`, `../prompts/03-gadgets.md` and
`../prompts/04-icons.md`. Stickers were trimmed and rendered at their display sizes on
paper and dark, and map icons also inside the 40 px circle. Glyphs were rendered as masks
in the theme's text colors at 13 px and 21 px, and the close calls again at 2x. These are
simulated renders. Nothing has been checked in the game yet.

## Picks

| Image            | Pick   | Why                                                                                                    |
| ---------------- | ------ | ------------------------------------------------------------------------------------------------------ |
| gadget-sponge    | **v4** | The rewrite worked: it now reads as a sponge. v4's smooth streak stays clean at 18 px; v3's is jagged. |
| icon-fight       | **v2** | Fewer interior lines. v1's pencil stripes turn into a checkerboard at 19 px.                           |
| icon-dig         | **v1** | Plain trowel blade and plain mound. v2's blade groove and speckled dirt go to mush.                    |
| icon-rest        | **v2** | Wavy steam as briefed, and a wider mug. The strongest map icon.                                        |
| icon-boss        | **v2** | Taller center point and more distinct points.                                                          |
| glyph-fog        | **v1** | Rounder lobes. v2 has tower-like bumps and a non-square frame.                                         |
| glyph-scramble   | **v1** | Thicker body and smaller hole, so it stays a gear at 13 px.                                            |
| glyph-weak-point | **v1** | The center dot stays separate. On v2 the ticks reach it and it becomes a cross in a ring.              |
| glyph-forged     | **v1** | Taller face, and the eyes survive at 13 px. v2's eyes smear.                                           |
| glyph-charge     | **v1** | The chunkier of the two, as briefed.                                                                   |
| glyph-ink        | **v1** | Fuller body that reads as a splat. v2 reads as a diamond or a leaf.                                    |
| glyph-swap       | **v2** | Larger teeth and no corner ticks. Cleaner at 2x.                                                       |
| glyph-call-out   | **v1** | Thicker ring, as briefed. v2's ring thins out at 13 px.                                                |
| glyph-shield     | **v1** | Closer to a heater shield. v2 tapers into a V.                                                         |

## Known weak spots

None of these block the batch. Recheck them in the game once they're wired in.

- **icon-fight at 1x.** At 19 px on a 1x screen it is a grey X with a coral corner. The
  tools only become recognizable at 2x. If it looks poor on the real path map, the fix is
  a new candidate with solid-filled tools and no interior lines.
- **glyph-ink's three dots.** They fade to a faint smudge at 13 px on 1x. The body still
  reads as a splat.
- **glyph-swap's teeth.** They blur into a grey band at 13 px on 1x, and are clear at 2x.
- **glyph-weak-point's ring.** It is thinner than the "thick ring" in the brief, and
  slightly diamond-shaped.
- **glyph-forged.** The horned top corners look a little like a cat at 13 px on 1x.

## Batch-wide findings

- **Glyph alpha passes.** Every glyph is pure black with only fully opaque or fully
  transparent pixels. The hard threshold left a few tiny notches on some edges, which
  don't show at display size.
- **Glyphs vary in size within the frame.** Fog fills 92% of the frame's width and the
  shield 69%, and they are masks scaled by their frame. Cleanup will fit them to even
  optical sizes.
- **Palette is clean** on all sticker picks.
- **Sticker margins** are clear on all picks, with nothing touching the frame.

## Final picks across all rounds

- **Cast:** rook v1, dee v1, bo v2, curator v3, forger v1, gremlin v3, tess v3.
- **Enemies:** goblin v1, fog-bat v1, clockwork-owl v1, armored-beetle v2, electric-eel v1,
  anglerfish v1, cuttlefish v1, unknown v1.
- **Enemy phase sets:** gremlin, overcharged-gremlin and blackout-gremlin v1; mimic and
  hungry-mimic v1; forger and master-forger v2; curator, clockwork-curator and
  overwound-curator v2; old-tess and furious-tess v2.
- **Gadgets:** bomb v1, patch-kit v2, sponge v4.
- **Map icons:** fight v2, dig v1, rest v2, boss v2.
- **Glyphs:** fog v1, scramble v1, weak-point v1, forged v1, charge v1, ink v1, swap v2,
  call-out v1, shield v1.

## What happens next

No more generation is needed for tiers 1 to 3. The chapter banners in
`../prompts/05-optional.md` have no slot in the UI yet, so they stay deferred unless the
owner asks for them. Cleanup and wiring under `public/art/` are next, and are not the
generator's job.

## Cleanup results

Done, by `scripts/art-clean.py`. All 43 picks are in `public/art/` and wired into the game.

- **Grid snapping was tried and dropped.** On four test images it scrambled Tess's face and
  damaged the Forger's, and the unsnapped versions stay clean at display size. Cleanup snaps
  the palette, trims and downscales instead.
- **The cleanup fixed** the gremlin-v3 chest smudge, the clockwork owl's off-token steel, and
  the 253/254 alpha, with no regeneration.
- **The path map and gadget icons are drawn larger than briefed,** at about 26 px and 22 px.
  That settled the fight icon's weak spot: it reads well on the real map at that size.
- **Still emoji, because the pack has no art for them:** the lock, the streak flame, the ✨
  for a dig with no gadget, and the debug panel's gadget list.
