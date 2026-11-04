# Artwork prompt pack

Prompts for every image that replaces an emoji placeholder (the "Characters and sprites"
section of [art-direction.md](../../art-direction.md)). Each prompt is self-contained:
copy one fenced block into the image generator as-is.

## How to run them

1. Work through the files in order. Tier 1 is what the game needs; tiers 2 and 3 are
   small glyphs that can wait; tier 4 has no slot in the UI yet.
   - [01-cast.md](01-cast.md): portraits for the dialogue scenes (tier 1)
   - [02-enemies.md](02-enemies.md): fight sprites, including boss phase forms (tier 1)
   - [03-gadgets.md](03-gadgets.md): the three gadget icons (tier 1)
   - [04-icons.md](04-icons.md): map node icons and power glyphs (tiers 2 and 3)
   - [05-optional.md](05-optional.md): chapter banners (tier 4)
2. Generate 2 to 4 candidates per prompt. Square output, 1024×1024 or the generator's
   largest square. Transparent PNG if the tool supports it; otherwise a flat `#f6f3ec`
   background, which I can key out.
3. Save candidates as `docs/art/incoming/<id>-v1.png`, `<id>-v2.png`, and so on, using the
   `id` from each prompt's heading (for example `enemy-goblin-v1.png`). Tell me when a batch is
   there and I'll review it against the checklist below and send notes back.
4. Once a candidate is approved I'll clean it (palette, trim, resize) and
   wire it in under `public/art/`. No need to resize anything yourself.

## The house style

Every prompt repeats this, so the set stays consistent. It follows the art direction:
puzzle pictures are 1-bit pixel art, so the characters are pixel art too, in the palette,
with the risograph-sticker feel of the mood board.

- **Pixel art on a strict grid.** Sprites on 32×32, portraits on 48×48, glyphs on 16×16.
  These are what to ask for. Decided after rounds 1 to 3: the generator overshoots them
  and the native result is accepted, so a chunky stepped look matters more than the exact
  count (see `../incoming/round3-review.md`). Keep asking for these sizes, since the ask
  is what keeps the art chunky. A new cast candidate should match the cell size of the
  picks.
  Shown large with crisp hard-edged pixels. No anti-aliasing, blur, or smoothing.
- **Flat color.** No gradients, glossy highlights, 3D, photo, or painterly texture.
- **The palette only.** Graphite `#23262f` for outlines and detail, paper `#f6f3ec` for
  light areas, and one accent per subject (two at most, where the prompt says so). Accent
  hexes come from `src/styles/tokens.css`.
- **Die-cut sticker border.** A thick paper-colored (`#f6f3ec`) outline around the whole
  silhouette. This is what keeps graphite outlines readable on the dark theme, where the
  page is near-black.
- **One subject, centered,** filling about 80% of a square frame. Plain flat background.
- **No text, letters, numbers, watermarks, frames, or drop shadows.**
- **Silhouette tied to the mechanic.** The eel is a zigzag, the cuttlefish trails ink, the
  Forger carries a palette, the Mimic is a chest. Each prompt names the thing its
  silhouette must say at 40 pixels.

Glyphs (tier 3) are the one exception: solid black on transparent, no border and no
accent, because they're applied as CSS masks and take the theme's text color.

## Where each image goes

| Set       | Shown at                                                   | Final home            |
| --------- | ---------------------------------------------------------- | --------------------- |
| Enemies   | ~38 px in the battle bar; also the finisher's target       | `public/art/enemies/` |
| Cast      | 140 px circle in dialogue; 52 px circle in the sign-off    | `public/art/cast/`    |
| Gadgets   | ~22 px in buttons and the inventory; 30 px in the dig find | `public/art/gadgets/` |
| Map icons | ~26 px inside a 40 px circle on the path map; inline text  | `public/art/icons/`   |
| Powers    | ~21 px on tip cards; ~13 px beside clues; battle badges    | `public/art/icons/`   |

The file that each image replaces is listed in its prompt, so you can see where the emoji
lives today.

## Review checklist

What I'll check on every candidate, and the notes you'll get back:

- **Reads at 40 px.** I'll downscale it and look. If it turns to mush, the silhouette or
  the detail level needs to change.
- **Silhouette says the mechanic.** The named shape (zigzag, chest, palette…) must be the
  first thing you see.
- **Palette.** Graphite, paper, and the named accent only. Stray colors get rejected, or
  I'll recolor if they're minor.
- **Sticker border present** and roughly even all the way around.
- **Clean pixel grid.** Stepped edges, no half-pixels, no smoothing. An irregular or
  finer-than-asked grid is accepted. A smooth vector look is not.
- **Same scale across a set.** A beetle and a bat should be the same sprite size, with
  bosses allowed to be a touch bigger.
- **Phase forms keep the base silhouette.** Overcharged Gremlin must still be the gremlin.
- **No text, no extra subjects, no scene,** unless the prompt asks for one (tier 4).

## Not in this pack, on purpose

- **Puzzle pictures and murals.** They're the game's own art, made in the editor.
- **The favicon.** It's a 4×4 pixel picture already; it fits.
- **UI chrome** (buttons, cards, the board). The tokens and CSS cover it, and the art
  direction says UI never competes with the board.
- **Sound.** Separate pass.
