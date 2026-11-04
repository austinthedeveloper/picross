# Tier 1: Cast portraits, chapters 4 to 7

The characters who arrived after [01-cast.md](01-cast.md). Same slots as that file: a 140 px
circle on the dialogue stage (`src/ui/components/dialogue.ts`) and a 52 px circle in the run
sign-off (`src/ui/screens/run/results.ts`). Replaces the `portrait` emoji in
`src/puzzles/scenes/*.json`. The portrait's art id is the prompt id without `cast-`.

Portraits are head-and-shoulders busts on a 48×48 grid. Compose them to sit inside a circle:
nothing important in the corners. They join the seven existing portraits as one cast, so match
those picks' line weight, cell size, head size, and amount of shoulder. If the generator takes
image references, give it `public/art/cast/rook.png` and `public/art/cast/tess.png` for that.

The house-style block is the one in 01-cast.md, plus two things earlier rounds had to reject
by hand: no symbols, and no colored disc or scenery behind the subject (see
`../incoming/cast-round1-review.md` and `round2-review.md`).

The three speaking bosses (Mother Bramble, the Ringmaster, the Yeti) get a portrait here and a
fight sprite in [07-enemies-chapters-4-7.md](07-enemies-chapters-4-7.md). Generate the
portraits first, then use them as references for the sprites so the faces match. If a portrait
fails, the sprite can stand in for it.

---

## cast-hollis

Hollis, head gardener at the botanical garden, in the Glasshouse scenes. Dry, unflappable,
calmly reporting that the plants have turned ("Mind the flytrap. It's been learning." "She won
a ribbon once."). Gender-neutral. Placeholder today: 🧑‍🌾. Accent: Go green `#2e8b57`.

```
Pixel-art sticker portrait for a cozy puzzle game, drawn on a strict 48x48 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, sea green #2e8b57. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One subject, centered, filling about 80% of a square frame, composed to fit inside a circle. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: head-and-shoulders bust of Hollis, a weathered older head gardener with a deadpan, patient look, one eyebrow slightly lowered, mouth a flat line that is almost a smile. A plain straw sun hat with a narrow brim and a green band, a green work apron with a bib over a plain shirt, a small adhesive bandage across the bridge of the nose, and a pair of pruning shears held up at the bottom edge of the frame in a hand with one bandaged finger. No beard. Three-quarter view, looking toward the viewer. Keep the whole hat brim inside the circle. Reads at a glance as: the gardener who has already been bitten today and isn't surprised.
```

## cast-bigsby

Bigsby, owner of the carnival, in the Midway scenes. Frazzled and rueful, ends up happy to be
bankrupt ("I own this place. Owned."). Not a showman like the Ringmaster, so no top hat and no
moustache. Gender-neutral. Placeholder today: 🤹. Accent: spark yellow `#e0a800`.

```
Pixel-art sticker portrait for a cozy puzzle game, drawn on a strict 48x48 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, warm yellow #e0a800. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One subject, centered, filling about 80% of a square frame, composed to fit inside a circle. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: head-and-shoulders bust of Bigsby, a rumpled, tired carnival owner with bags under the eyes, raised worried eyebrows, and a lopsided rueful smile. A flat straw boater hat with a yellow band, tilted, a loud yellow-and-paper striped waistcoat, a crooked graphite bow tie, and one round yellow juggling ball held up at the bottom edge of the frame. Clean-shaven. Three-quarter view, looking toward the viewer. Reads at a glance as: someone who owned a carnival until about Tuesday.
```

## cast-lund

Dr. Lund, the astronomer at Summit Station, in the Summit Station scenes. Polite, frozen,
relieved anyone came. Meets you "in four coats" and ends the job by taking off one, so the
coats are the character. Gender-neutral. Placeholder today: 🧑‍🚀. Accent: spark hot
`#f07c00`.

```
Pixel-art sticker portrait for a cozy puzzle game, drawn on a strict 48x48 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, orange #f07c00. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One subject, centered, filling about 80% of a square frame, composed to fit inside a circle. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: head-and-shoulders bust of Dr. Lund, a polite, half-frozen astronomer peering out of a huge pile of winter coats. Four coat collars stacked one above the other around the neck, each clearly a separate band, the outermost an orange expedition parka with its hood up and a chunky paper-colored fur trim. Round glasses with frost across the lower half, a small hopeful worried smile, and a rolled-up paper star chart held at the bottom edge of the frame in a mittened hand. The shoulders are wide only because of the coats; the head is the same size as the rest of the cast. Three-quarter view, looking toward the viewer. Reads at a glance as: a scientist wearing every coat they own.
```

## cast-bramble

Mother Bramble, the Glasshouse boss: an old prize rose "the size of a van," wound up with a
brass key in her stem. Her one line is "Try." Haughty, patient, proud, a matriarch rather than
a monster. She appears only in the reveal, where Dee spots the key, so the key shows here.
Same face as her sprite in `07-enemies-chapters-4-7.md`. Placeholder today: 🥀. Accents: job
stamp coral `#d9534f` and spark yellow `#e0a800` (the key). Two accents allowed.

```
Pixel-art sticker portrait for a cozy puzzle game, drawn on a strict 48x48 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, coral red #d9534f, plus a second accent, warm yellow #e0a800, used only for the brass key. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One subject, centered, filling about 80% of a square frame, composed to fit inside a circle. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: close-up of Mother Bramble, one enormous old coral red rose with a face in the center of the bloom. Thick layered petals frame the face, the outer ones curling and starting to droop. Heavy-lidded narrow eyes, chin raised, a small cold smile. Below the bloom a thick graphite stem with big hooked thorns runs down to the bottom edge, and a large yellow wind-up key sticks out of the stem to one side, big enough to be seen right away. A faded paper-colored prize rosette with no writing on it is pinned beside the stem. No green anywhere. Facing the viewer. Reads at a glance as: a prize-winning rose that has decided to be in charge.
```

## cast-ringmaster

The Ringmaster, the Midway boss, who took over a carnival that never hired one. All patter
("Tonight only! Two tinkerers, one puzzle, and no refunds!"). The scene calls out his
moustache, which turns by itself, and a brass key in his hat. Same face as his sprite in
`07-enemies-chapters-4-7.md`. Placeholder today: 🎩. Accents: job stamp coral `#d9534f` and
spark yellow `#e0a800` (the key). Two accents allowed.

```
Pixel-art sticker portrait for a cozy puzzle game, drawn on a strict 48x48 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, coral red #d9534f, plus a second accent, warm yellow #e0a800, used only for the brass key. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One subject, centered, filling about 80% of a square frame, composed to fit inside a circle. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: head-and-shoulders bust of The Ringmaster, a thin showman with a huge theatrical grin, eyebrows arched high, eyes wide and a little too fixed. A tall graphite top hat with a coral red band, kept fully inside the circle, with a large yellow wind-up key sticking out of the side of the crown, angled up and outward. A very long graphite moustache that sweeps out wider than his shoulders and ends in a tight curl on each side. Coral red tailcoat with wide lapels over a paper-colored shirt front. Three-quarter view, looking toward the viewer. Reads at a glance as: a showman with a key in his hat and a moustache that is too long.
```

## cast-yeti

The Yeti, the Summit Station boss. It only says "HRRRM," and later "HRRRRRM?", so it is more
huge and baffled than evil, and it ends the job asleep. Dee spots the key at the back of its
neck in this scene, so the key shows here. Same face as its sprite in
`07-enemies-chapters-4-7.md`. Placeholder today: 🦍. Accents: pencil gray `#7a7e8a` (face and
shading) and spark yellow `#e0a800` (the key). Two accents allowed.

```
Pixel-art sticker portrait for a cozy puzzle game, drawn on a strict 48x48 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, soft gray #7a7e8a, plus a second accent, warm yellow #e0a800, used only for the brass key. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One subject, centered, filling about 80% of a square frame, composed to fit inside a circle. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: close-up head-and-shoulders of The Yeti, a colossal shaggy snow creature. Thick paper-colored fur drawn in big chunky tufts with a thick graphite outline, a flat gray ape-like face, small deep-set eyes under a heavy brow furrowed in slow confusion, two short lower fangs. The head sits low between enormous shoulders that fill the bottom of the frame. A large yellow wind-up key sticks up from the back of the neck, rising past one side of the head, big enough to be seen right away and inside the circle. Facing the viewer. Reads at a glance as: a giant snow ape who doesn't know why it's awake.
```
