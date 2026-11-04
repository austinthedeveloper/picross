# Round 2 artwork candidates

## Delivered

- Three requested cast refinements: `cast-curator-v3.png`, `cast-tess-v3.png`, `cast-gremlin-v3.png`. The other accepted cast portraits were not regenerated.
- Forty enemy PNGs: two candidates for each of the twenty base/phase/fallback prompts in `../prompts/02-enemies.md`.
- `round2-review.html`: paired previews on light and dark, 140 px circles for cast, 38 px / 40 px for enemies, and base-to-phase comparisons.
- `round2-manifest.json`: exact submitted prompts, input reference filenames, requested grid sizes, generation notes, PNG/alpha metadata and SHA-256 hashes.

## How the round 1 review was applied

- Cast refinements retain the accepted 96×96 pixel scale and original identities, with the requested targeted changes.
- Curator v3 combines v1's head and raised-chin expression with a trimmed border treatment.
- Tess v3 replaces the long white zigzag with a short graphite healed scar.
- Gremlin v3 removes most of the dense internal fur stripes while retaining ears, eyes, grin, wire and sparks.
- Enemy prompts reinforce the 32×32 grid, broad shapes, plain transparency, closely following sticker borders, clear margins, exact palette and no colored backing discs or scenery.
- Speaking enemy sprites use the matching cast portraits as identity references, while explicitly requesting the coarser sprite grid and full body.
- Each phase candidate uses its corresponding base candidate as an image reference. Overwound Curator also uses the matching Clockwork Curator form.

## Review status

Original generated PNGs are preserved without resizing, palette conversion, alpha thresholding or pixel-grid cleanup. Actual pixel-grid fidelity, palette and alpha cleanup remain review items, as in round 1. Per-candidate visual observations appear in the review page and manifest. These observations are not a final approval.

Several speaking-enemy sprites and their phase forms retain facial detail finer than the strict 32×32 brief. They are flagged in the individual notes for review/simplification; the cast's accepted 96×96 exception has not been extended to enemies. Clockwork Owl candidates also place yellow outside the key/one-gear restriction, and Cuttlefish v2 uses dark ink-purple on body stripes. Those accent placements are flagged rather than silently treated as approved.

Filename phase suffixes are derived from the phase names in the enemy brief; the manifest's `base` and `phase` fields map each back to its base enemy. All pre-existing incoming files are preserved.

## Remaining

The next prompt file is `03-gadgets.md`. Map icons, power glyphs and optional chapter banners also remain for later batches.
