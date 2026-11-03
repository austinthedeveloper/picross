# Tiers 2 and 3: Map icons and power glyphs

These are tiny and can wait until the characters are in. They're listed because the
emoji they replace look different on every platform, and because the power glyphs appear
right next to clue numbers, where a crisp mark in the game's own line weight matters.

## Tier 2: Map node icons

Shown at ~19 px inside a 40 px circle on the path map (`src/ui/screens/run/pathMap.ts`),
and inline in the jobs board preview list. Replaces `KIND_ICON` and the boss crown in
`src/ui/screens/run/shared.ts`. Also used for the headers of digs (`dig.ts`) and rests
(`rest.ts`).

Same sticker style as the gadgets, 32×32 grid, one accent each.

### icon-fight

Placeholder today: ⚔️. Accent: job stamp coral `#d9534f`.

```
Pixel-art sticker icon for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, coral red #d9534f. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One object, centered, filling about 80% of a square frame. No text, letters, numbers, watermark, frame, or drop shadow.

Subject: a pencil and an adjustable wrench crossed in an X, like crossed swords. The pencil has a coral red eraser end. Chunky and bold. Reads at a glance, even tiny, as: a fight, in a game where you fight by drawing.
```

### icon-dig

Placeholder today: ⛏️. Accent: dirt `#a9825a`.

```
Pixel-art sticker icon for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, earthy brown #a9825a. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One object, centered, filling about 80% of a square frame. No text, letters, numbers, watermark, frame, or drop shadow.

Subject: a hand trowel stuck into a small mound of brown dirt, a couple of dirt specks flying. Chunky and bold. Reads at a glance, even tiny, as: digging.
```

### icon-rest

Placeholder today: ☕. Accent: job stamp coral `#d9534f`.

```
Pixel-art sticker icon for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, coral red #d9534f. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One object, centered, filling about 80% of a square frame. No text, letters, numbers, watermark, frame, or drop shadow.

Subject: a coral red enamel mug with a graphite rim and handle, two wavy lines of steam rising. Chunky and bold. Reads at a glance, even tiny, as: a coffee break.
```

### icon-boss

Placeholder today: 👑. Accent: job stamp coral `#d9534f`.

```
Pixel-art sticker icon for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, coral red #d9534f. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One object, centered, filling about 80% of a square frame. No text, letters, numbers, watermark, frame, or drop shadow.

Subject: a simple three-point crown in coral red with graphite outline and three small paper-colored dots. Chunky and bold. Reads at a glance, even tiny, as: the boss.
```

## Tier 3: Power glyphs

These sit beside clue numbers (CSS `content` in `src/styles/board.css`), on the tip cards
(`src/ui/powers.ts`), and in the battle bar badges. They're applied as **CSS masks**, so
they take the theme's text color automatically. That changes the spec:

- **Solid black `#000000` on a transparent background.** No paper, no accent, no sticker
  border, no outline. One color.
- **16×16 pixel grid,** shown large. Bold, closed shapes: thin lines vanish at 13 px.
- Square frame, glyph filling about 85% of it.

Shared preamble for every glyph:

> Pixel-art glyph, drawn on a strict 16x16 pixel grid and shown large with crisp hard-edged
> pixels (no anti-aliasing, no blur, no smoothing). Pure solid black #000000 on a fully
> transparent background, exactly one color, no outline, no border, no shading, no
> gradients, no 3D. One bold closed shape, centered, filling about 85% of a square frame.
> No text, letters, numbers, watermark, or frame.

### glyph-fog (🌫️, hidden clues)

```
Pixel-art glyph, drawn on a strict 16x16 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Pure solid black #000000 on a fully transparent background, exactly one color, no outline, no border, no shading, no gradients, no 3D. One bold closed shape, centered, filling about 85% of a square frame. No text, letters, numbers, watermark, or frame.

Subject: a puffy cloud with a flat bottom. Reads at 13 px as: fog.
```

### glyph-scramble (⚙, scrambled clues)

```
Pixel-art glyph, drawn on a strict 16x16 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Pure solid black #000000 on a fully transparent background, exactly one color, no outline, no border, no shading, no gradients, no 3D. One bold closed shape, centered, filling about 85% of a square frame. No text, letters, numbers, watermark, or frame.

Subject: a six-tooth gear with a round hole in the middle. Reads at 13 px as: a gear.
```

### glyph-weak-point (🎯, armor weak points)

```
Pixel-art glyph, drawn on a strict 16x16 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Pure solid black #000000 on a fully transparent background, exactly one color, no outline, no border, no shading, no gradients, no 3D. One bold closed shape, centered, filling about 85% of a square frame. No text, letters, numbers, watermark, or frame.

Subject: a target: a thick ring with a solid dot in the center and four short tick marks at top, bottom, left and right. Reads at 13 px as: a crosshair.
```

### glyph-forged (🎭, maybe-forged clues)

```
Pixel-art glyph, drawn on a strict 16x16 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Pure solid black #000000 on a fully transparent background, exactly one color, no outline, no border, no shading, no gradients, no 3D. One bold closed shape, centered, filling about 85% of a square frame. No text, letters, numbers, watermark, or frame.

Subject: a single theatre mask, a solid face shape with two cut-out eye holes and a cut-out smiling mouth. Reads at 13 px as: a mask.
```

### glyph-charge (⚡, the charge meter)

```
Pixel-art glyph, drawn on a strict 16x16 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Pure solid black #000000 on a fully transparent background, exactly one color, no outline, no border, no shading, no gradients, no 3D. One bold closed shape, centered, filling about 85% of a square frame. No text, letters, numbers, watermark, or frame.

Subject: a chunky lightning bolt. Reads at 13 px as: electricity.
```

### glyph-ink (🦑, inked cells)

```
Pixel-art glyph, drawn on a strict 16x16 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Pure solid black #000000 on a fully transparent background, exactly one color, no outline, no border, no shading, no gradients, no 3D. One bold closed shape, centered, filling about 85% of a square frame. No text, letters, numbers, watermark, or frame.

Subject: a fat ink drop with a small splash of three dots beside it. Reads at 13 px as: an ink splat.
```

### glyph-swap (👄, the Mimic's swaps)

```
Pixel-art glyph, drawn on a strict 16x16 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Pure solid black #000000 on a fully transparent background, exactly one color, no outline, no border, no shading, no gradients, no 3D. One bold closed shape, centered, filling about 85% of a square frame. No text, letters, numbers, watermark, or frame.

Subject: a wide grinning mouth, a solid shape with a row of cut-out square teeth along the top. Reads at 13 px as: a toothy grin.
```

### glyph-call-out (🔍, accuse a forged clue)

```
Pixel-art glyph, drawn on a strict 16x16 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Pure solid black #000000 on a fully transparent background, exactly one color, no outline, no border, no shading, no gradients, no 3D. One bold closed shape, centered, filling about 85% of a square frame. No text, letters, numbers, watermark, or frame.

Subject: a magnifying glass with a thick ring and a short stubby handle pointing to the lower right. Reads at 13 px as: a magnifying glass.
```

### glyph-shield (🛡, a blocked hit)

```
Pixel-art glyph, drawn on a strict 16x16 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Pure solid black #000000 on a fully transparent background, exactly one color, no outline, no border, no shading, no gradients, no 3D. One bold closed shape, centered, filling about 85% of a square frame. No text, letters, numbers, watermark, or frame.

Subject: a solid heater shield, flat top and pointed bottom. Reads at 13 px as: a shield.
```
