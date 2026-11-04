# Sponge revisions, map icons and power glyphs

## Scope

`gadget-sponge-v3.png` and `gadget-sponge-v4.png` use the rewritten prompt: pillowy, nearly frontal, many small irregular pores, and a bold ink streak surrounded by yellow. Previous sponge candidates and approved gadget picks are preserved.

The map set contains two candidates each for `icon-fight`, `icon-dig`, `icon-rest`, `icon-boss`. The glyph set contains two candidates each for `glyph-fog`, `glyph-scramble`, `glyph-weak-point`, `glyph-forged`, `glyph-charge`, `glyph-ink`, `glyph-swap`, `glyph-call-out`, `glyph-shield`.

The prompts continue to request 32×32 for stickers and 16×16 for glyphs. Native generated grids are accepted per `round3-review.md`; no measured grid count is asserted. No art is trimmed or resized here.

## Glyph alpha

Glyphs must be black on transparent, with alpha restricted to 0 / 255. The generator returned partial alpha on the fog pilot despite explicit binary-alpha instructions; an alpha-only image-generation retry did so again. Raw generated glyphs therefore require an exact binary-mask export to meet the brief. Each file's measured status is in the manifest and review page. A visually correct CSS-mask preview is not a claim that its file passes binary alpha.

Strict black/binary-alpha mask export was explicitly approved and applied only to glyph files. No resizing, trimming or other artwork cleanup was performed.

## Review

Open `round4-review.html` for sponge previews at 18 / 40 px, map previews at 19 / 40 px, and glyph mask previews at 13 / 21 px, on paper and the actual dark surface/page colors. Exact submitted prompts and per-candidate observations are included in `round4-manifest.json`, together with PNG and alpha checks and file hashes.

Sticker palette/alpha cleanup and installation remain with the project owner. Existing incoming files are preserved. `05-optional.md` is deferred as requested.
