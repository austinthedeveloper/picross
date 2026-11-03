# Round 2 review: cast v3s and enemy sprites

Reviewed against `../prompts/README.md` and `../prompts/02-enemies.md`. Every file was
looked at full size, at 38 px on paper and on the dark theme, and in a 4× nearest-neighbor
blow-up of the 38 px render, plus a palette scan against the full token list in
`src/styles/tokens.css` and a pixel-cell measurement.

## Cast v3s

All three replace the round-1 picks.

| Portrait     | Pick   | Why                                                                                                                                      |
| ------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| cast-curator | **v3** | v1's slicked hair, raised chin and down-the-nose look on v2's trimmed treatment. Exactly what was asked.                                 |
| cast-tess    | **v3** | Scar is now a short graphite line. Otherwise identical to v2.                                                                            |
| cast-gremlin | **v3** | Fur stripes gone; body is solid graphite with a paper face, which also matches the fight sprite's dark body. Reads far cleaner at 40 px. |

One flaw in gremlin-v3: a soft grey smudge inside the solid graphite of the chest (an
edit-pass ghost). It sits in a flat area, so it will be painted out on cleanup. No v4
needed.

The final cast is: rook v1, dee v1, bo v2, curator v3, forger v1, gremlin v3, tess v3.

## Enemy picks

Where an enemy has phase forms, the same variant is picked across the whole set so the
mid-fight swap reads as one creature.

| Enemy                    | Pick   | Why                                                                                                                                        |
| ------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| enemy-goblin             | **v1** | Crouched as briefed, sandwich clutched to the chest. v2 stands upright.                                                                    |
| enemy-fog-bat            | **v1** | The fog comes out of the mouth, which says the mechanic. v2's cloud sits beside the bat.                                                   |
| enemy-gremlin (3 forms)  | **v1** | Cleaner generator; v2 puts a lightning glyph on the panel, which is a symbol. Overcharged and blackout v1 keep v1's silhouette exactly.    |
| enemy-mimic (2 forms)    | **v1** | Compact closed chest with the seam grin and keyhole eye; hungry v1 is the same chest flung open. v2 pair is also fine but tilts and grows. |
| enemy-clockwork-owl      | **v1** | Yellow stays on the key and the gears. v2 adds yellow feet.                                                                                |
| enemy-forger (2 forms)   | **v2** | Same design as v1, slightly larger, and the master forger's frame is bigger, so it reads at 38 px.                                         |
| enemy-armored-beetle     | **v2** | The coral cracks are bold enough to read at 38 px; v1's are faint. v2's face is a little spidery, acceptable.                              |
| enemy-curator (3 forms)  | **v2** | Base v2 has the portrait's chin-up smirk; v1 scowls. Clockwork and overwound v2 follow.                                                    |
| enemy-electric-eel       | **v1** | Bolder zigzag, bigger grin. v2 is more serpent than bolt.                                                                                  |
| enemy-anglerfish         | **v1** | Rounder body, lure curls forward as briefed. v2 is equally usable.                                                                         |
| enemy-cuttlefish         | **v1** | Purple body, paper frill, ink only in the trailing splash. v2 paints ink stripes on the body, against the brief.                           |
| enemy-old-tess (2 forms) | **v2** | Furious v2 keeps the base's size and rears up with the splash. Furious v1 shrinks the octopus.                                             |
| enemy-unknown            | **v1** | A blob under a sheet. v2 is a ghost with feet.                                                                                             |

### Rejected for cause

- **gremlin-v2 set**: lightning symbol on the generator.
- **clockwork-owl-v2**: yellow outside the key and gears.
- **cuttlefish-v2**: ink color used for body stripes.
- **furious-tess-v1**: octopus smaller than its base form.

Everything else not picked is a fine spare, not a reject.

## Batch-wide findings

- **Sprite grid is roughly 40 to 64 cells, not 32.** Same situation as the portraits.
  Each sprite is clean stepped pixel art at its own cell size; the cell size varies by
  sprite. Recommendation: accept, and on cleanup snap each sprite to its own nearest
  grid. At 38 px the display is under one screen pixel per cell either way, so only the
  silhouette and accent survive, and those all hold.
- **Palette is clean** on every pick except the clockwork owl, where the steel plates are
  a lighter blue-grey than the metal token and about 15% of pixels sit between tokens. It
  gets recolored to `#3d4450` on cleanup; no regeneration.
- **Scale across the set needs normalizing on cleanup.** The fog bat fills only about 40%
  of its frame height; the curator is a sliver 35% of the frame wide; the goblin and Tess
  fill 85% to 90%. I will trim every sprite and fit it to a common box, with the three
  bosses a touch larger, so no regeneration is needed for this.
- **Sticker borders** are present on every pick and hold on the dark theme.
- **Phase forms keep their base silhouette** in every picked set. The overwound curator
  breaks pose (limbs askew), which the brief allows.
- **38 px legibility**: strongest are Tess, the eel, the anglerfish, the mimic and the
  goblin. Weakest are the two human sprites (curator, forger), whose faces go to mush,
  but the silhouettes (tall thin man, man with palette) still read.
- **Alpha is 253/254** on subject pixels again. Threshold on cleanup.

## What happens next

No round-3 asks for the cast or the enemies. The generator can move on to
`../prompts/03-gadgets.md`.

Cleanup (trim, grid snap, palette snap, alpha threshold, resize, the gremlin-v3 smudge,
the owl recolor) and wiring under `public/art/` is my side, and starts once the sprite
grid decision above is confirmed.
