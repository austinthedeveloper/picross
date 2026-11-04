# Tier 1: Enemy sprites, chapters 4 to 7

The enemies that arrived after [02-enemies.md](02-enemies.md), plus Museum Rex, the new Night
Shift boss. Same slot as that file: ~38 px in the battle bar
(`src/ui/components/battleBar.ts`), where the sprite flinches, lunges, and falls over
grayscale when defeated (CSS handles that; the art is one static pose). Replaces `sprite` in
`src/puzzles/encounters/*.json`, including each boss phase's `sprite`. The sprite's art id is
the prompt id without `enemy-`.

Sprites are full-body on a 32×32 grid. Keep them chunky: at 38 px, fine detail is gone and
only the silhouette and the accent survive. Every enemy's silhouette says its mechanic.

**Phase forms** must keep the base sprite's silhouette and pose, at the same size, changing
only what the phase says. Generate the base first, then the phases, and if the generator
supports image references, feed it the chosen base. Pick the same variant across a set. Only
the phases listed with an id get art. Any other named phase, like Ravenous Snapjaw, keeps the
sprite it already has, and each enemy's note says which those are.

Order of play: The Night Shift (Museum Rex), The Glasshouse (Snapjaw, Spore Puff, Ironbark,
Mother Bramble), The Midway (Funhouse Mirror, Madame Vesper, The Great Bruno, the Ringmaster),
Summit Station (Whiteout, Falling Star, Ice Mammoth, the Yeti), Closing Time (Tin Soldier).
Bosses may come out a touch bigger; cleanup handles that, so leave the margins alone.

What this set carries over from the earlier rounds (`../incoming/round2-review.md` and
`round3-review.md`):

- **Coral cracks mean weak points.** Coral is what marks a weak point on the board, so every
  armored enemy (Ironbark, Bruno, the Ice Mammoth, the Tin Soldier) gets bold coral cracks,
  like the beetle. Faint cracks vanish at 38 px, which is what sank armored-beetle v1.
- **The brass key is a story clue.** Someone is winding these things up, and from the
  Glasshouse on, Dee finds a brass key on each boss. Keep it large and spark yellow, and keep
  yellow off everything else on those sprites. Yellow leaking past the key is what sank
  clockwork-owl v2.
- **Tall and thin shrinks.** The curator came out a sliver, and human faces turn to mush at 38
  px. So the human sprites here are posed wide and rely on their hats and props, not faces.
- **Marks have to be big.** Clouds and splashes should be as big as the body. A small mark
  disappears, which is what sank the first sponge.

---

## The Night Shift

### enemy-museum-rex (boss, 2 forms)

The museum's centerpiece: "It has not moved in ninety years. It's moving." Scrambles your
clues, and later a rib flies off and swaps your lines. A skeleton first, then the Curator's
key shows up. Placeholder today: 🦴, then 🦖. Silhouette: a T. rex skeleton with a huge skull.
Rampaging Rex (at 50% HP) keeps the Wound-up sprite, so the Wound-up form is the one the
player sees for most of the fight.

**Base**, id `enemy-museum-rex`. Accent: dirt brown `#a9825a`.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, wood brown #a9825a. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: a whole Tyrannosaurus rex museum skeleton standing in the classic side-on pose, stiff and upright, with a huge blocky skull, open jaw with big paper-colored teeth, tiny arms, and a long tail stretched out behind for balance. The bones are thick and chunky, paper-colored with wood brown joints and age stains, with a thick graphite outline. The gaps inside the ribcage are solid graphite so the ribs read as a bold cage with only four or five ribs. Empty eye socket. Nothing mechanical visible. No plinth or floor. Reads at 40 px as: a dinosaur skeleton.
```

**Phase "Wound-up Rex"** (at 90% HP), id `enemy-wound-up-rex`. Accents: dirt brown `#a9825a`
and spark yellow `#e0a800` (key and gears). Two accents allowed.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, wood brown #a9825a, plus a second accent, warm yellow #e0a800, used only for the wind-up key and the gears. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: the same Tyrannosaurus rex museum skeleton in the same side-on pose, same size, but now wound up: a large yellow wind-up key sticks up out of its spine above the hips, two big yellow gears turn inside the graphite ribcage, a small paper-colored eye glares from the socket, the jaw is flung wider, and one loose rib is flying off into the air just past its chest. Same silhouette as before, plus the key and the flying rib. Reads at 40 px as: a wind-up dinosaur skeleton shedding a rib.
```

## The Glasshouse

### enemy-snapjaw

A flytrap the size of a wheelbarrow that has "started keeping time": it charges, snaps, and
rips up your lines out of spite. Ravenous Snapjaw (at 55% HP) keeps this sprite. Placeholder
today: 🪴. Accents: Go green `#2e8b57` and job stamp coral `#d9534f` (inside the trap). Two
accents allowed. Silhouette: wide-open jaws in a flower pot.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, green #2e8b57, plus a second accent, coral red #d9534f, used only for the inside of the trap. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: one enormous venus flytrap head on a thick green stalk, growing out of a chipped graphite flower pot with a paper-colored rim. The trap is seen side-on and held wide open like jaws about to shut, coral red inside, with a row of long pointed paper-colored teeth along each edge and two small angry eyes on top. Two broad green leaves droop over the pot. The trap is much wider than the pot. Reads at 40 px as: a flytrap about to snap.
```

### enemy-spore-puff

"Do not breathe in. Do not breathe out." Fogs your clues with spores and splats ink across
your board. Bursting Puff (at 65% HP) keeps this sprite. Placeholder today: 🍄. Accents: job
stamp coral `#d9534f` (the cap) and pencil gray `#7a7e8a` (the spores). Two accents allowed.
Silhouette: a mushroom blowing a cloud.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, coral red #d9534f, plus a second accent, soft gray #7a7e8a, used only for the spore cloud. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: a squat, fat little mushroom with a big round coral red cap with three large paper-colored spots and a wide paper-colored stem. A small grumpy face on the stem, cheeks puffed and lips pursed, blowing a big soft gray cloud of spores out of its mouth that drifts to one side. The cloud is as big as the mushroom, with a few chunky gray dots around it. Reads at 40 px as: a mushroom puffing out a cloud.
```

### enemy-ironbark

"An old stump with a bad attitude. Count the rings, then hit it there." Armored, so only its
weak points take damage, and it scrambles your clues. Riled Ironbark (at 60% HP) keeps this
sprite. Placeholder today: 🪵. Accents: dirt brown `#a9825a` and job stamp coral `#d9534f`
(the cracks). Two accents allowed. Silhouette: a wide stump on root legs, with rings on top
and cracks in the bark.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, wood brown #a9825a, plus a second accent, coral red #d9534f, used only for the cracks. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: a squat, thick old tree stump standing on stubby gnarled root legs, as wide as it is tall, wood brown bark with a few thick graphite grain lines. The flat cut top tilts toward the viewer and shows three bold paper-and-graphite growth rings. A scowling face in the bark with a heavy brow and a turned-down mouth, two short broken branch arms crossed in front. Three bold coral red cracks run through the bark, thick enough to see at small size. Reads at 40 px as: a grumpy stump with cracks in it.
```

### enemy-mother-bramble (boss, 2 forms)

Mother Bramble, the old rose in the center dome, wound up with a brass key in her stem. Fogs
clues, inks your board, swaps your beds ("Snip, snip, snip"). Thorned Bramble (at 82% HP)
keeps the base sprite. Placeholder today: 🥀, then 🌹. Silhouette: a huge rose on a thorned
stem with two thorn vines held out like arms. The portrait in `06-cast-chapters-4-7.md` is the
same rose; match her face.

**Base**, id `enemy-mother-bramble`. Accents: job stamp coral `#d9534f` and spark yellow
`#e0a800` (the key). Two accents allowed.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, coral red #d9534f, plus a second accent, warm yellow #e0a800, used only for the wind-up key. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: an enormous old rose standing on a thick S-curved graphite stem, with two long thorn vines held out wide to either side like arms, each with big hooked thorns. The coral red bloom sits at the top, half closed and drooping forward, with a face among the petals: heavy-lidded narrow eyes and a small cold smile. A large yellow wind-up key sticks out of the middle of the stem. The stem ends in a few thick roots. No green anywhere. Reads at 40 px as: a wilting rose with thorns and a key.
```

**Phase "Mother Bramble in Bloom"** (at 50% HP), id `enemy-mother-bramble-in-bloom`. Accents:
job stamp coral `#d9534f` and spark yellow `#e0a800` (the key). Two accents allowed.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, coral red #d9534f, plus a second accent, warm yellow #e0a800, used only for the wind-up key. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: the same enormous rose on the same S-curved graphite stem with the same two thorn vines held out wide and the same yellow wind-up key in the stem, at the same size, but now in full bloom: the coral red bloom has lifted and burst wide open with big layered petals, her eyes are wide and her smile shows small pointed teeth, and the thorns are larger. A couple of loose coral petals drift off the bloom. Same silhouette as before, with a much bigger flower. No green anywhere. Reads at 40 px as: the rose, wide open and furious.
```

## The Midway

### enemy-funhouse-mirror

"It makes you look taller. It also makes your clues look wrong." Scrambles your clues and
swaps your lines. Warped Mirror (at 60% HP) keeps this sprite. Placeholder today: 🪞. Accents:
mischief purple `#7b5cff` (the glass) and spark yellow `#e0a800` (the bulbs). Two accents
allowed. Silhouette: a warped mirror, pinched at the waist.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, bright purple #7b5cff, plus a second accent, warm yellow #e0a800, used only for the round light bulbs on the frame. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: a large carnival funhouse mirror on two stubby feet, its thick graphite frame warped into a wavy hourglass shape that bulges wide at the top and bottom and pinches in at the middle. The glass is solid bright purple and fills most of the frame. In the glass, a stretched paper-colored grin and two eyes at different heights, as if the mirror itself is smirking. Five or six big round yellow light bulbs are spaced around the frame. It is nearly as wide as it is tall. Reads at 40 px as: a warped mirror with a grin.
```

### enemy-madame-vesper

The fortune teller: "She sees all, she knows all, and at least some of it is true." Forges
some of your clues, so you call out the fakes, and clouds the board with ink. Vesper Unveiled
(at 50% HP) keeps this sprite. Placeholder today: 🔮. Accents: squid ink `#2c2350` (robe and
mist) and mischief purple `#7b5cff` (the ball). Two accents allowed. Silhouette: a hooded
figure behind a huge crystal ball.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, deep ink purple #2c2350, plus a second accent, bright purple #7b5cff, used only for the crystal ball. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: a hooded fortune teller seated behind an enormous crystal ball, seen from the front. The ball sits in front of her, as wide as her shoulders, filling the lower half of the figure, solid bright purple with one flat chunky paper-colored crescent on it. A wide deep ink purple robe, hood, and veil cover everything but a paper-colored band with two narrowed, knowing eyes. Two paper-colored hands with long fingers hover on either side of the ball. Two thick curling wisps of deep ink purple mist rise off the ball. Reads at 40 px as: a veiled figure with a crystal ball.
```

### enemy-great-bruno

The carnival strongman: "He can lift a horse. Nobody asked the horse. Aim for the cracks in
the iron." Charges up and hits hard; only his weak points take damage. Greater Bruno (at 50%
HP) keeps this sprite. Placeholder today: 💪. Accents: metal `#3d4450` and job stamp coral
`#d9534f` (the cracks). Two accents allowed. Silhouette: a huge barrel chest under a barbell
held overhead.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, steel blue-gray #3d4450, plus a second accent, coral red #d9534f, used only for the cracks. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: an enormous carnival strongman with a huge barrel chest, tiny bald head, and short legs planted wide, holding a giant barbell straight overhead with both arms, with a big round steel weight on each end, much wider than his shoulders. Paper-colored skin, no moustache, a heavy brow, and a proud blank stare. A thick riveted steel chest plate is strapped across his torso, with three bold coral red cracks in it, thick enough to see at small size. Reads at 40 px as: a strongman lifting a barbell, armor cracked.
```

### enemy-ringmaster (boss, 2 forms)

The Ringmaster, who has been running the carnival since Tuesday. His hat has a brass key in it
and his moustache turns by itself. Forges clues, scrambles, charges, and swaps. Grand
Ringmaster (at 80% HP) keeps the base sprite. Placeholder today: 🎩, then 🎪. Silhouette: an
oversized top hat with a key in it and a very long moustache, on a showman posed wide. The
portrait in `06-cast-chapters-4-7.md` is the same man; match his face.

**Base**, id `enemy-ringmaster`. Accents: job stamp coral `#d9534f` and spark yellow `#e0a800`
(the key). Two accents allowed.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, coral red #d9534f, plus a second accent, warm yellow #e0a800, used only for the wind-up key. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: a showman in a wide theatrical pose, legs apart, one arm flung out to the side holding a long cane and the other hand on his hip, so the figure is broad and not a thin sliver. An oversized graphite top hat with a coral red band and a large yellow wind-up key sticking out of the side of the crown, angled up and outward. A very long graphite moustache sweeps out wider than his head and ends in a tight curl on each side. Coral red tailcoat with the tails kicked out behind him, paper-colored shirt front, huge fixed grin. Reads at 40 px as: a ringmaster with a key in his hat.
```

**Phase "Showstopper"** (at 45% HP), id `enemy-showstopper`. Accents: job stamp coral
`#d9534f` and spark yellow `#e0a800` (the key). Two accents allowed.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, coral red #d9534f, plus a second accent, warm yellow #e0a800, used only for the wind-up key. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: the same showman in the same wide pose with the same oversized top hat, the same yellow key in it, and the same cane, at the same size, but now his coat has become the show: from the waist down the tailcoat spreads out into a huge big-top circus tent in bold coral red and paper-colored stripes, with a scalloped edge at the bottom, hiding his legs. His moustache curls have wound into tight spirals and his grin has gone wider. Same head, hat, and arms as before, with the tent below them. Reads at 40 px as: the ringmaster wearing the big top.
```

## Summit Station

### enemy-whiteout

The snowman at the observatory: "Whoever built this snowman isn't up here anymore." Fogs your
clues, and later drifts snow across your board. Howling Whiteout (at 85% HP) keeps this
sprite. Placeholder today: ⛄. Accent: pencil gray `#7a7e8a` (shadows and blowing snow).
Silhouette: a snowman dissolving into a blowing gust.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, soft gray #7a7e8a. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: a tall lumpy snowman of three stacked snowballs, paper-colored with a thick graphite outline and gray shading on one side, with two bare stick arms held out stiffly. Two black coal eyes and a too-wide grin of coal pieces, slightly wrong and unsettling but still cute. The whole snowman leans into the wind, and its far side is blowing away into a big soft gray gust of snow that streams off to one side, as big as the snowman, with a few chunky flakes. Reads at 40 px as: a snowman in a blizzard.
```

### enemy-falling-star

"The charts say it's coming. Then they say it isn't. One of them is lying." Forges and
scrambles your clues. Blazing Star (at 50% HP) keeps this sprite. Placeholder today: 🌠.
Accents: spark yellow `#e0a800` and spark hot `#f07c00` (the tail). Two accents allowed.
Silhouette: a star diving on a long tail.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, warm yellow #e0a800, plus a second accent, orange #f07c00, used only for the tail. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: a chunky five-pointed yellow star with rounded points, diving diagonally down toward one corner, trailing a long wide tail of blocky orange flame that sweeps up to the opposite corner. A smug face on the star: one eye closed in a wink, a sideways smirk. A few paper-colored chunky sparks along the tail. The diagonal fills the frame. Reads at 40 px as: a smirking shooting star.
```

### enemy-ice-mammoth

"It thawed out and it's sitting on the generator. Find the gaps in the ice." Charges up, fogs
your clues, and only takes damage at the gaps in its armor. Thawed Mammoth (at 60% HP) keeps
this sprite. Placeholder today: 🦣. Accents: dirt brown `#a9825a` (the fur) and job stamp
coral `#d9534f` (the gaps). Two accents allowed. Silhouette: a domed mammoth with long tusks,
sitting on a box.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, wood brown #a9825a, plus a second accent, coral red #d9534f, used only for the gaps in the ice. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: a huge round shaggy mammoth sitting heavily on a small boxy graphite generator, squashing it. A high domed head, a thick trunk hanging down, and two long curved paper-colored tusks sweeping out wide in front. Wood brown fur on the head and legs in big chunky tufts. The back and shoulders are covered in thick blocky plates of paper-colored ice with graphite edges, and three bold jagged coral red gaps run between the plates, thick enough to see at small size. Small tired eyes. Plain generator with no markings. Reads at 40 px as: a mammoth in cracked ice, on a generator.
```

### enemy-yeti (boss, 2 forms)

The Yeti, on the ridge above the station: "The snow stands up, and then it keeps standing up."
Brass key in the back of its neck. Fogs, scrambles, inks, and later charges. Angry Yeti (at
92% HP) keeps the base sprite. Placeholder today: 🦍, then 🏔️. Silhouette: a hulking snow ape
with long arms and a key at its neck. The portrait in `06-cast-chapters-4-7.md` is the same
creature; match its face.

**Base**, id `enemy-yeti`. Accents: pencil gray `#7a7e8a` (face and shading) and spark yellow
`#e0a800` (the key). Two accents allowed.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, soft gray #7a7e8a, plus a second accent, warm yellow #e0a800, used only for the wind-up key. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: a colossal shaggy yeti standing hunched and facing the viewer, enormous wide shoulders, a small head sunk low between them, and long heavy arms hanging down with big fists almost at the ground, short legs. Paper-colored fur in big chunky tufts with a thick graphite outline, flat gray face, hands, and shading. Small deep-set eyes under a furrowed brow, two short lower fangs, looking slowly confused. A large yellow wind-up key sticks up from the back of the neck, rising past one side of the head. Much wider than a person. Reads at 40 px as: a huge snow ape with a key in its neck.
```

**Phase "Avalanche Yeti"** (at 65% HP), id `enemy-avalanche-yeti`. Accents: pencil gray
`#7a7e8a` and spark yellow `#e0a800` (the key). Two accents allowed.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, soft gray #7a7e8a, plus a second accent, warm yellow #e0a800, used only for the wind-up key. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: the same colossal shaggy yeti in the same hunched pose, same size, with the same yellow key at its neck, but now the ridge has come with it: a jagged snow-capped mountain peak in gray and paper rises from its shoulders and back as if it is part of the creature, with snow pouring down off the peak and over its arms in big chunky slabs and a few boulders tumbling off to the sides. Its eyes are wide and its mouth open in a roar. No ground, sky, or landscape around it. Same yeti as before, with the mountain on its back. Reads at 40 px as: a yeti carrying an avalanche.
```

## Closing Time

### enemy-tin-soldier

"Exhibit 12: Toy Soldier, c. 1890. Life-size as of this evening." The thing marching through
the museum. Armored, fogs and scrambles your clues. Overwound Soldier (at 70% HP) keeps this
sprite. Placeholder today: 💂. Accents: job stamp coral `#d9534f` (the cracks) and spark
yellow `#e0a800` (the key). Two accents allowed, so the tin itself is graphite and paper.
Silhouette: a toy soldier mid-march with a big key in its back.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, coral red #d9534f, used only for the cracks, plus a second accent, warm yellow #e0a800, used only for the big wind-up key. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: a stiff tin toy soldier caught mid-march, one knee lifted high, arms swinging out stiffly to the sides so the figure is broad and not a thin sliver. A tall graphite shako hat, a blocky graphite tunic with paper-colored crossed chest straps, a round paper-colored painted face with two dot eyes, two round painted cheeks, and a blank stare. A large yellow wind-up key sticks out sideways from its back. Three bold coral red cracks run across its chest and legs, thick enough to see at small size. Visible rivets at the joints, like an old toy. Reads at 40 px as: a wind-up toy soldier with cracks in it.
```
