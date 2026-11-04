# Tier 1: Enemy sprites

Shown at ~38 px in the battle bar (`src/ui/components/battleBar.ts`), where the sprite
flinches, lunges, and falls over grayscale when defeated (CSS handles that; the art is one
static pose). The finisher animation aims the solved picture at it. Replaces `sprite` in
`src/puzzles/encounters/*.json`, including each boss phase's `sprite`.

Sprites are full-body on a 32×32 grid. Keep them chunky: at 38 px, fine detail is gone and
only the silhouette and the accent survive. Every enemy's silhouette says its mechanic.

**Phase forms** (marked with a phase name below) must keep the base sprite's silhouette and
pose, changing only what the phase says. The player sees the base swap to the phase form
mid-fight, so it should read as the same creature getting worse. Generate the base first,
then the phases, and if the generator supports image references, feed it the chosen base.

Order of play in the game: First Job (goblin, fog bat, gremlin), The Night Shift (mimic,
clockwork owl, forger, armored beetle, curator), The Deep End (electric eel, anglerfish,
cuttlefish, Old Tess). Bosses are the gremlin, the curator, and Old Tess; they may be a
little bigger than the rest, filling 90% of the frame instead of 80%.

---

## First Job

### enemy-goblin

Guards the workshop's back door; wants your lunch. No power. Placeholder today: 👺.
Accent: Go green `#2e8b57`. Silhouette: pointy ears and a sandwich.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, green #2e8b57. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, watermark, frame, or drop shadow.

Subject: a small scrappy green goblin crouched like it is guarding a door, big pointed ears, a wide mischievous grin with two little teeth, holding a stolen sandwich in both hands close to its chest. Reads at 40 px as: a goblin with your lunch.
```

### enemy-fog-bat

Breathes fog over your clues. Placeholder today: 🦇. Accent: pencil gray `#7a7e8a` (the
fog). Silhouette: spread wings and a puff of fog.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, soft gray #7a7e8a. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, watermark, frame, or drop shadow.

Subject: a round little graphite bat in flight, wings spread wide, tiny fangs, puffing a big soft gray cloud of fog out of its mouth that drifts to one side. The fog cloud is as big as the bat. Reads at 40 px as: a bat breathing fog.
```

### enemy-gremlin (boss, 3 forms)

The Generator Gremlin lives inside Mrs. Pell's generator, likes the dark, and fogs more
clues as the fight goes on. Placeholder today: 👹, then 😈, then 👿. Silhouette: a squat
gremlin squatting on top of a generator, ears up, holding a cut wire.

**Base.** Accent: spark yellow `#e0a800`.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, warm yellow #e0a800. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, watermark, frame, or drop shadow.

Subject: a squat hairy gremlin with huge bat-like ears squatting on top of a boxy old generator, holding a chewed electrical wire in one hand with a couple of yellow sparks coming off it, round yellow eyes, wide toothy grin. Reads at 40 px as: a gremlin sitting on a machine.
```

**Phase "Overcharged Gremlin"** (at 90% HP). Accent: spark hot `#f07c00`.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, orange #f07c00. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, watermark, frame, or drop shadow.

Subject: the same squat hairy gremlin squatting on top of the same boxy generator in the same pose, but now overcharged: its hair stands straight up, orange lightning bolts crackle off its ears and the wire in its hand, eyes glowing orange, grin even wider. Same silhouette as before, plus the bolts. Reads at 40 px as: the gremlin, electrified.
```

**Phase "Blackout Gremlin"** (at 84% HP). Accent: squid ink `#2c2350`.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, deep ink purple #2c2350. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, watermark, frame, or drop shadow.

Subject: the same squat gremlin squatting on top of the same boxy generator in the same pose, but the lights are out: the gremlin and generator are a single deep purple-black silhouette, with only two round paper-colored glowing eyes and a paper-colored toothy grin visible, and a few purple wisps of darkness around it. Same silhouette as before. Reads at 40 px as: eyes and a grin in the dark.
```

## The Night Shift

### enemy-mimic (2 forms)

A treasure chest in the gift shop that swaps and wipes two of your lines. Placeholder
today: 📦, then 👄. Silhouette: a treasure chest.

**Base.** Accent: dirt brown `#a9825a`.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, wood brown #a9825a. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, watermark, frame, or drop shadow.

Subject: a wooden treasure chest with graphite iron bands, closed, slightly tilted, with a thin sliver of a toothy grin showing along the seam of the lid and one eye peeking out of the keyhole. Reads at 40 px as: a chest that is not just a chest.
```

**Phase "Hungry Mimic"** (at 55% HP). Accents: dirt brown `#a9825a` and mischief purple
`#7b5cff` (the tongue). Two accents allowed.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, wood brown #a9825a, plus a second accent, bright purple #7b5cff, used only for the tongue. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, watermark, frame, or drop shadow.

Subject: the same wooden treasure chest with graphite iron bands, now flung wide open: the inside is a huge mouth with a double row of pointed paper-colored teeth, a long bright purple tongue lolling out over the front edge, and two round eyes on the inside of the lid. Same chest shape and size as the closed version. Reads at 40 px as: a chest with a mouth.
```

### enemy-clockwork-owl

A mechanical owl that scrambles your clues (gear symbol). Placeholder today: 🦉.
Accents: metal `#3d4450` and spark yellow `#e0a800` (the wind-up key). Two accents allowed.
Silhouette: an owl with a big wind-up key on its back.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, steel blue-gray #3d4450, plus a second accent, warm yellow #e0a800, used only for the wind-up key and one gear. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, watermark, frame, or drop shadow.

Subject: a plump mechanical owl built from steel plates and rivets, perched upright, one big round eye and the other eye a visible yellow gear, two small gears showing through a panel on its chest, and a large yellow wind-up key sticking out of its back, slightly turned. Reads at 40 px as: a wind-up owl.
```

### enemy-forger (2 forms)

Forges some of your clues; you call out the fakes. Placeholder today: 🎨, then 🖼️.
Silhouette: a lanky figure holding a painter's palette.

**Base.** Accent: job stamp coral `#d9534f`.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, coral red #d9534f. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, watermark, frame, or drop shadow.

Subject: a lanky art forger standing with a sly sideways smile and thin curled mustache, coral red beret, paint-smeared smock, holding a big painter's palette with coral paint blobs out in front with one hand and a brush raised in the other. Reads at 40 px as: a painter with a palette.
```

**Phase "Master Forger"** (at 50% HP). Accents: coral `#d9534f` and mischief purple
`#7b5cff`. Two accents allowed.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, coral red #d9534f, plus a second accent, bright purple #7b5cff. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, watermark, frame, or drop shadow.

Subject: the same lanky art forger in the same beret and smock and the same pose, but now holding an ornate purple picture frame up in front of their face like a mask, their eyes and mustache showing through it as if they were the painting, the palette still in the other hand. Same silhouette as before, plus the frame. Reads at 40 px as: the painter hiding behind a frame.
```

### enemy-armored-beetle

A museum beetle the size of a car; only its weak points take damage. Placeholder today:
🪲. Accents: metal `#3d4450` and job stamp coral `#d9534f` (the cracks). Two accents
allowed. Silhouette: a big round beetle with cracked plates.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, steel blue-gray #3d4450, plus a second accent, coral red #d9534f, used only for the cracks. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, watermark, frame, or drop shadow.

Subject: a huge round beetle seen from the front at a slight angle, its shell made of thick steel armor plates with riveted seams, three bright coral red cracks glowing in the plates like weak points, small legs, two short antennae, small determined eyes. Reads at 40 px as: an armored beetle with cracks in it.
```

### enemy-curator (boss, 3 forms)

Curator Ambrose: prim gentleman, secretly clockwork, scrambles and swaps your clues.
Placeholder today: 🧐, then 🤖, then ⚙️. Silhouette: a tall thin man in a suit with a
monocle, hands clasped. The portrait in 01-cast.md is the same man; match his face.

**Base.** Accent: job stamp coral `#d9534f`.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, coral red #d9534f. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, watermark, frame, or drop shadow.

Subject: a tall, prim older gentleman standing very straight, monocle, slicked-back hair, high collar, coral red bow tie, dark three-piece suit, hands clasped in front, chin raised with a faint smirk. Nothing mechanical visible. Reads at 40 px as: a stiff museum curator.
```

**Phase "Clockwork Curator"** (at 92% HP). Accent: spark yellow `#e0a800` (brass).

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, brass yellow #e0a800. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, watermark, frame, or drop shadow.

Subject: the same tall prim gentleman in the same straight pose and suit, but now revealed as clockwork: his jacket hangs open to show brass gears turning in his chest, a large brass wind-up key sticks out of his back, his monocle is a small brass gear, and his smirk is wider. Same silhouette as before, plus the key. Reads at 40 px as: the curator is a wind-up machine.
```

**Phase "Overwound Curator"** (at 78% HP). Accent: spark hot `#f07c00`.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, orange #f07c00. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, watermark, frame, or drop shadow.

Subject: the same clockwork gentleman in the same pose, but overwound: the key in his back is a spinning orange blur, his hair and limbs are jolted askew, two or three orange gears are flying off him, his eyes are spirals, his bow tie is crooked, and the jacket flaps open. Same silhouette as before, with the gears flying off. Reads at 40 px as: the clockwork curator coming apart.
```

## The Deep End

### enemy-electric-eel

Charges up over time and zaps you; finishing lines drains the meter. Placeholder today: ⚡.
Accent: spark yellow `#e0a800`. Silhouette: a zigzag, like a lightning bolt with a face.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, warm yellow #e0a800. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, watermark, frame, or drop shadow.

Subject: an electric eel whose whole body is a bold yellow zigzag, like a lightning bolt with a grinning fish face at the top end, small fins, a thin tail at the bottom end, and a few small sparks jumping off it. The zigzag is the silhouette. Reads at 40 px as: a lightning-bolt-shaped eel.
```

### enemy-anglerfish

The deep-sea tank, pitch black except for one friendly light. Fogs clues. Placeholder
today: 🐟. Accents: squid ink `#2c2350` (body) and spark yellow `#e0a800` (the lure). Two
accents allowed. Silhouette: a big-jawed fish with a dangling glowing lure.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, deep ink purple #2c2350, plus a second accent, warm yellow #e0a800, used only for the glowing lure. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, watermark, frame, or drop shadow.

Subject: a round deep-sea anglerfish, deep purple-black body, an enormous open jaw full of long paper-colored needle teeth, one small beady eye, tiny fins, and a long stalk from its forehead curving forward with a round glowing yellow bulb on the end. Reads at 40 px as: an anglerfish with a light.
```

### enemy-cuttlefish

Changes color when upset; splashes ink across your board. Placeholder today: 🦑.
Accents: mischief purple `#7b5cff` (body) and squid ink `#2c2350` (the ink). Two accents
allowed. Silhouette: a soft blob with trailing ink.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, bright purple #7b5cff, plus a second accent, deep ink purple #2c2350, used only for the ink. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, watermark, frame, or drop shadow.

Subject: a soft rounded bright purple cuttlefish, a blobby oval body with a frilly fin along the edge, two big W-shaped pupils, short tentacles bunched at the front, and a dark ink splash trailing out behind it, as big as the body, with a few drops. Reads at 40 px as: a blob trailing ink.
```

### enemy-old-tess (boss, 2 forms)

Old Tess, the huge old octopus in the center tank. Fogs clues, charges, and inks.
Placeholder today: 🐙, then 🌊. Silhouette: a big octopus, arms spread. The portrait in
01-cast.md is the same octopus; match her face.

**Base.** Accent: job stamp coral `#d9534f`.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, coral red #d9534f. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, watermark, frame, or drop shadow.

Subject: a large elderly coral red octopus sitting heavily, big rounded mantle, heavy-lidded unimpressed eyes, a few wrinkles and one old scar, eight arms spread out and curled at the tips with suckers showing. Reads at 40 px as: a big grumpy octopus.
```

**Phase "Furious Tess"** (at 60% HP). Accents: coral `#d9534f` and squid ink `#2c2350`
(the water). Two accents allowed.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, coral red #d9534f, plus a second accent, deep ink purple #2c2350, used only for the water. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, watermark, frame, or drop shadow.

Subject: the same large elderly coral red octopus, now rearing up furious: eyes wide open, all eight arms flung high and wide, a crash of deep purple water and spray bursting up around and behind her. Same octopus, same size, just raised up with the splash around it. Reads at 40 px as: the octopus, enraged, in a wave.
```

## Fallback

### enemy-unknown (low priority)

Shown for any enemy file without a sprite. Placeholder today: 👾. Accent: pencil gray
`#7a7e8a`.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, soft gray #7a7e8a. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, watermark, frame, or drop shadow.

Subject: a vague rounded gray creature silhouette, like a blob under a sheet, with two round paper-colored eyes and a small question-mark-shaped curl on top of its head. Reads at 40 px as: something, not sure what.
```
