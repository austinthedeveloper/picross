# Cast portraits, round 1: review notes

Reviewed against the checklist in `../prompts/README.md`. Each candidate was looked at
full size, in the 140 px and 52 px circles on paper and on the dark theme, and at a flat
40 px, plus a palette scan and a pixel-grid measurement.

## Picks

| Portrait     | Pick   | Why                                                                                                                        |
| ------------ | ------ | -------------------------------------------------------------------------------------------------------------------------- |
| cast-rook    | **v1** | Every prop lands (pencil, name tag, clipboard, coral tick). The sweat drop sells "out of their depth". v2 is a fine spare. |
| cast-dee     | **v1** | Goggles, strap, raised brow, half-smile, wrench, crossed arms: all there and clean. v2 rejected (see below).               |
| cast-bo      | **v2** | Hood reads as a hood, calmer hair, kinder face. v1 is acceptable but the hair takes over the circle.                       |
| cast-curator | **v2** | Trimmed silhouette, monocle, bow tie, smirk, waistcoat. v1 rejected for the coral disc.                                    |
| cast-forger  | **v1** | Beret, brush behind ear, mustache, smeared smock, palette with coral blobs, narrowed eyes. Best in batch.                  |
| cast-gremlin | **v2** | Trimmed silhouette, no scene, wire and sparks read at 40 px. v1 rejected (see below).                                      |
| cast-tess    | **v2** | Composed for the circle; arms curl into the corners. v1 runs off the frame sides.                                          |

The seven picks sit together as one cast: same line weight, similar head size and shoulder
for the five humans, with the two monsters allowed to fill more of the frame.

## Rejected candidates

- **dee-v2, forger-v2.** A filled accent-colored disc behind the subject, and a blurred
  white smudge on the right side of the disc (a smoothing artifact from the edit pass).
  Both fail flat color.
- **curator-v1.** Coral disc fills the circle. At 40 px it is a red dot with a face, and it
  is the only human portrait with a colored backing, so it breaks the set. The face itself
  (slicked hair, chin up, looking down his nose) is closer to the brief than v2's, which
  has wavier hair and a flatter chin. Worth a v3: v1's head on v2's trimmed treatment.
- **gremlin-v1.** The disc is a generator interior (wires, vents, a plate), which is a
  scene. At 40 px the busy backing and the face merge into noise.
- **tess-v1.** Subject touches the left and right frame edges, so the sticker border is
  clipped there. Otherwise equal to v2.

## Notes on the picks

- **tess-v2.** The scar is a paper-white zigzag, which reads as a lightning bolt or a
  specular shine, not a scar. Ask for a short graphite line instead. Same note applies to
  v1.
- **gremlin-v2.** Fur is drawn as dense graphite stripes; at 40 px it still reads (ears,
  yellow eyes, wire, sparks) but a v3 with simpler fur would read cleaner. Ears are paper
  rather than yellow, which is fine and keeps the eyes as the accent.
- **rook-v1.** Reads a little masculine for a gender-neutral lead. Not a blocker; v2 is
  no better on this. Flagging in case it matters for a later pass.
- **curator-v2.** The waistcoat detail lines are thin and partly grey from smoothing; they
  will snap to graphite or drop out on cleanup.
- **Paper discs** behind rook (both), dee-v1 and gremlin-v2 are harmless: inside the circle
  crop they become the sticker, and they vanish on the paper theme. No change needed.

## Batch-wide findings

- **Pixel grid is ~96 cells, not 48.** Cells measure about 13 px on the 1254 px canvas,
  with some variation and anti-aliased edges (3% to 6% of subject pixels are mid-grey
  blends). The art is genuine stepped pixel art, so it can be re-snapped, but to a 96×96
  grid; snapping to 48 would destroy the faces. **Decision: accepted.** Cast portraits
  are on a 96×96 grid from here on (they show at 140 px, where 96 cells is still visibly
  pixel art, and the fight sprites at 38 px are no chunkier). Any round-2 cast candidate
  must match this: draw it at the same cell size as the round-1 picks, not 48. Sprites,
  gadgets and glyphs keep the sizes in the README.
  **Correction after round 3:** "96" was an overstatement from a rough estimate. Measured
  properly, the portraits vary from roughly 55 to 115 cells and are not on one regular
  lattice. See `round3-review.md`.
- **Palette is clean.** Apart from the edge blends, every pick is graphite, paper and its
  one accent. No stray hues. The two rejected smudges are the only real violations.
- **Alpha is 253/254, not 255,** on every subject pixel. Cosmetic; a threshold on cleanup
  fixes it.
- **Sticker border** is present and roughly even on every pick and holds up on the dark
  theme.
- **40 px legibility** is good on all seven picks. Tess and the Forger are the strongest;
  the Gremlin is the weakest but still identifiable.

## Round 2 asks (optional, not blocking)

1. curator-v3: v1's face and slicked hair, v2's trimmed silhouette, no disc.
2. tess-v3: graphite scar line instead of the white zigzag.
3. gremlin-v3: same design, simpler fur.

Save them as `cast-<id>-v3.png` beside the round-1 files. Keep the same cell size, line
weight, head size and sticker border as the picks above so the set stays matched. The
house-style block in each prompt still says "48x48 pixel grid"; for these three, replace
it with "96x96 pixel grid". Do not redo the other picks.

Then move on to `02-enemies.md`, where the 32×32 sprite rule stands as written.
