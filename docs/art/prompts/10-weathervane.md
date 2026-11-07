# Enemy sprite: the Weathervane

The standalone boss fight unlocked by Summit Station (#83): a rooster weathervane from the
observatory roof that turns the whole board a quarter clockwise every few lines. Same house
style, palette rules, and size as [02-enemies.md](02-enemies.md). It's a boss, so it carries
the brass key, and the key is the only yellow thing on it.

### enemy-weathervane (boss, 2 forms)

"Something on the observatory roof is still spinning after the storm." Turns the board.
Whirling Weathervane (at 60% HP) turns it more often. Placeholder today: 🐓 for both.
Silhouette: a flat iron rooster on an arrow, on a pole with four crossed arms.

**Base**, id `enemy-weathervane`. Accents: job stamp coral `#d9534f` (comb and wattle) and
spark yellow `#e0a800` (the key). Two accents allowed.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, coral red #d9534f, plus a second accent, warm yellow #e0a800, used only for the wind-up key. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: a rooftop weathervane seen side-on: a flat cut-iron rooster in solid graphite with a big fanned tail, standing on a long horizontal arrow with a broad arrowhead on one end and a wide fletched tail on the other. Under it, a short pole with four plain crossed arms ending in small round knobs, with no letters on them. A small coral red comb and wattle on the rooster, and one bold paper-colored eye with a mean squint. A large yellow wind-up key sticks out of the rooster's back. Reads at 40 px as: an iron rooster on an arrow, with a key in its back.
```

**Phase "Whirling Weathervane"** (at 60% HP), id `enemy-whirling-weathervane`. Accents: job
stamp coral `#d9534f` and spark yellow `#e0a800` (the key). Two accents allowed.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, coral red #d9534f, plus a second accent, warm yellow #e0a800, used only for the wind-up key. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: the same iron rooster weathervane, same size, with the same yellow key in its back, but spinning hard: the arrow is blurred into three or four stepped ghost copies fanned around the pole in a half circle, drawn as flat graphite outlines, and three thick curved coral red wind streaks wrap around it. The rooster's beak is open in a crow and its tail feathers are blown out flat. The streaks are coral, not yellow: the key is the only yellow thing. Reads at 40 px as: a weathervane spinning in a gale.
```
