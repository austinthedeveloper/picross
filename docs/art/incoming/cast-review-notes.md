# Cast portrait candidates — first review batch

Fourteen original generated PNGs: two candidates for each of the seven portraits in `../prompts/01-cast.md`. Generated with the built-in image_gen tool. Exact submitted prompts and file checks are in `cast-batch-manifest.json`.

Open `cast-review.html` for paired previews on paper and dark backgrounds, with circular 140 px portraits and 52 px / 40 px previews. The page only changes display size; the PNGs retain their original generated resolution.

## Review findings

- The characters, signature props, limited accent families and paper sticker borders are present in the batch.
- The generated pixel sizes are not a uniform 48×48 grid. Border edges and fills contain smoothing / texture / color variation. These candidates do not yet pass the exact-grid and exact-palette checks.
- Bo v2 was corrected to remove aquarium scenery. Gremlin v2 was corrected to remove unsolicited goggles and overalls. Tess v2 was corrected to remove a blurred red mark while keeping her one crisp old scar.
- Some candidates use a filled badge-like backing rather than a closely trimmed silhouette border. Check circle crops and small-size legibility before selecting.
- All files were checked for square dimensions, PNG format, actual transparent pixels and opaque subject pixels. Copies were verified by SHA-256.

## Next batch

This completes the cast review batch described in the prompt pack. Enemy sprites, phase forms, gadgets, map icons, glyphs and optional banners have not been generated. No files in `public/art/` were changed.
