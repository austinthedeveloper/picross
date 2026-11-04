# Tier 4: Chapter banners (optional, no slot yet)

Nothing in the UI shows these today. If they come out well I'd add one above each chapter
heading on the jobs board (`src/ui/screens/run/jobsBoard.ts`), and a cropped version as the
backdrop of the chapter's opening scene. Skip this file if generator budget is tight.

A banner is a wide pixel scene on a 96×32 grid (3:1). Same palette rules: graphite, paper,
and one accent per chapter. Because these are scenes, they can have a horizon and a few
props, but still no gradients and no texture. They should feel like a strip from a
field-notebook sketch: calm, quiet, one small sign of trouble.

Output: 3:1 aspect if the generator allows it (for example 1536×512). If it only does
squares, generate square and leave the middle third as the scene; I'll crop.

---

## banner-odd-jobs

Chapter 1, "Odd Jobs": Mrs. Pell's place at dusk. Accent: spark yellow `#e0a800`.

```
Wide pixel-art scene for a cozy puzzle game, 3:1 aspect, drawn on a strict 96x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no texture. Palette: dark graphite #23262f, off-white paper #f6f3ec, and one accent color, warm yellow #e0a800. Calm, quiet, like a sketch in a field notebook. No text, letters, numbers, watermark, frame, or characters' faces in detail.

Scene: the back of a small country house at dusk, a rusty generator beside the back door with one yellow spark coming off it, a shed, a few fence posts, a dig site with a shovel in a dirt mound at the far edge, and a tiny pair of pointed goblin ears peeking over the fence. The sky is flat paper, the ground is graphite with paper-colored highlights.
```

## banner-after-hours

Chapter 2, "After Hours": the museum at night. Accent: job stamp coral `#d9534f`.

```
Wide pixel-art scene for a cozy puzzle game, 3:1 aspect, drawn on a strict 96x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no texture. Palette: dark graphite #23262f, off-white paper #f6f3ec, and one accent color, coral red #d9534f. Calm, quiet, like a sketch in a field notebook. No text, letters, numbers, watermark, frame, or characters' faces in detail.

Scene: a long museum hall after closing, moonlight through a tall skylight, a row of glass display cases, a framed painting slightly crooked on the wall, a large beetle silhouette on a plinth, a coral red velvet rope on brass posts, and one display case standing open with nothing inside it.
```

## banner-deep-water

Chapter 3, "Deep Water": the aquarium after closing. Accent: squid ink `#2c2350`, with
spark yellow `#e0a800` allowed for the one sparking tank.

```
Wide pixel-art scene for a cozy puzzle game, 3:1 aspect, drawn on a strict 96x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no texture. Palette: dark graphite #23262f, off-white paper #f6f3ec, one accent color, deep ink purple #2c2350, and a few pixels of warm yellow #e0a800. Calm, quiet, like a sketch in a field notebook. No text, letters, numbers, watermark, frame, or characters' faces in detail.

Scene: a dark aquarium hall after closing, a row of tall glass tanks filled with deep purple water, a zigzag eel shape in one tank with a few yellow sparks, a small anglerfish light in another, a gift shop doorway with a plush shark, and in the biggest central tank one enormous half-closed octopus eye watching the door.
```
