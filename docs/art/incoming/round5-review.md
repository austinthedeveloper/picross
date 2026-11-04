# Round 5 review: chapters 4 to 7

Reviewed against `../prompts/README.md`, `../prompts/06-cast-chapters-4-7.md` and
`../prompts/07-enemies-chapters-4-7.md`. Each candidate was looked at full size, then trimmed
and rendered at display size on paper and dark. The picks were also run through the cleanup
script's palette snap into a scratch folder, and lined up beside the approved art. None of
this has been seen in the game yet, and nothing in `public/art/` has changed.

No regeneration is needed. Every image has a usable pick.

## Portraits

| Portrait        | Pick   | Why                                                                             |
| --------------- | ------ | ------------------------------------------------------------------------------- |
| cast-hollis     | **v2** | Lowered brow and a flat mouth are the deadpan the brief asked for. v1 smiles.   |
| cast-bigsby     | **v2** | Worried brow and a lopsided smile read as rueful. v1 is too cheerful.           |
| cast-lund       | **v1** | Worried and hopeful, with frost on the glasses. v2 is too relaxed for the role. |
| cast-bramble    | **v2** | The eyes stay readable at 40 px, and it matches the v2 sprite set.              |
| cast-ringmaster | **v2** | Wide, fixed eyes as briefed. v1 is winking.                                     |
| cast-yeti       | **v2** | More baffled than v1, and the key is on the same side as the v2 sprite set.     |

## Enemies

Where an enemy has a phase form, the same variant is picked across the set.

| Enemy                    | Pick   | Why                                                                                       |
| ------------------------ | ------ | ----------------------------------------------------------------------------------------- |
| museum-rex (2 forms)     | **v1** | Wound-up v1 has the chunkier key and gears, and it's the form seen for most of the fight. |
| snapjaw                  | **v1** | Coral stays inside the trap. v2 adds coral cracks to the pot.                             |
| spore-puff               | **v2** | The cloud is as big as the mushroom, and the puffing face reads better.                   |
| ironbark                 | **v2** | Bolder cracks, which is what the armor mechanic needs.                                    |
| mother-bramble (2 forms) | **v2** | Thicker stem and a bigger key that survive at 38 px.                                      |
| funhouse-mirror          | **v2** | v1 has a blurred white smudge on the glass, which fails flat color.                       |
| madame-vesper            | **v2** | Clean sticker border and cleaner mist. v1's wisps run to the frame's edge.                |
| great-bruno              | **v2** | The cracks are far bolder than v1's. See the note on his trunks below.                    |
| ringmaster (2 forms)     | **v2** | Fixed stare matches the portrait, and Showstopper v2 keeps the pose exactly.              |
| whiteout                 | **v1** | The clearest snowman at 38 px. See the note on the hat and scarf below.                   |
| falling-star             | **v1** | The long diagonal tail fills the frame and says shooting star.                            |
| ice-mammoth              | **v2** | Bolder coral gaps, which stand out well against the ice.                                  |
| yeti (2 forms)           | **v2** | Avalanche v2 has the taller peak, so it reads as carrying a mountain.                     |
| tin-soldier              | **v2** | Broader and more clearly mid-march, as the brief asked.                                   |

## Calls worth a second look

- **Great Bruno's trunks.** v2 added coral stripes, and the brief kept coral for the cracks
  because coral means "hit here" on armored enemies. I'd recolor the stripes to graphite in
  cleanup and keep the costume. The alternative is v1, whose cracks are much weaker.
- **Whiteout's hat and scarf.** v1 added both, so v2 is closer to the brief. I picked v1
  because it's clearer at battle size. v2 is the swap if the bare snowman matters more.

## Known weak spots

None of these block the batch. Recheck them in the game once they're wired in.

- **Dr. Lund's coats.** The brief wants four separate collars, because the coats are the joke.
  Both candidates show about three. It still reads as someone in far too many coats.
- **Hollis.** The hat brim is wider than the brief's narrow one, and the bandaged finger
  isn't visible. The nose bandage and the shears both read.
- **Thorn vines and bones on dark.** Mother Bramble's graphite vines nearly match the dark
  background, so only their paper outlines show, like the bomb. Museum Rex is mostly thin
  bones and goes soft at 38 px on a 1x screen. Both read properly at 2x.
- **Tin Soldier's cracks** are thinner than the brief asked for, so the armor badge does more
  of the work at 38 px.
- **Yeti's portrait key** just touches the circle's edge. The Gremlin's approved portrait is
  cropped by about the same amount.

## Batch-wide findings

- **The palette snap is safe on all 24 picks.** It removes the off-brief steel and grey
  shading (the mirror's frame, Bramble's stem, Bigsby's bow tie) without damaging anything.
- **The set matches the approved art.** Line weight, head size and scale all hold up side by
  side. The new portraits sit inside their circles as well as the old ones.
- **Sticker borders** are present on every pick. Bigsby, Dr. Lund and Madame Vesper touch the
  bottom of the frame for a short stretch, which is harmless.
- **Phase forms keep their base silhouette and scale** in every picked set.

## Final picks

- **Portraits:** hollis v2, bigsby v2, lund v1, bramble v2, ringmaster v2, yeti v2.
- **Enemies:** snapjaw v1, spore-puff v2, ironbark v2, funhouse-mirror v2, madame-vesper v2,
  great-bruno v2, whiteout v1, falling-star v1, ice-mammoth v2, tin-soldier v2.
- **Enemy phase sets:** museum-rex and wound-up-rex v1; mother-bramble and
  mother-bramble-in-bloom v2; ringmaster and showstopper v2; yeti and avalanche-yeti v2.

## Cleanup results

Done, by `scripts/art-clean.py`. All 24 picks are in `public/art/` and wired into the game, so
all 67 images are in and no enemy or character is drawn as an emoji any more.

- **Great Bruno's trunks** are recolored from coral to graphite, so coral only marks his
  cracks. The script does this from a fixed row, and his cracks end above it.
- **The other existing art is byte-for-byte unchanged** by the rerun.
- **Chapter banners** stay deferred. They still have no slot in the UI.
- **Showstopper hasn't been seen by reaching its phase.** A bug outside the art stops the
  Ringmaster's phases from starting: scrambling crashes on his forged rows. Its art is in
  place and loads in the battle bar, and it will appear once that bug is fixed.
