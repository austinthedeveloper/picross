# Tier 1: Cast portraits, chapters 7 to 9

The characters who arrived with chapters 7 to 9. Same slots as [01-cast.md](01-cast.md): a 140
px circle on the dialogue stage (`src/ui/components/dialogue.ts`) and a 52 px circle in the run
sign-off (`src/ui/screens/run/results.ts`). Replaces the `portrait` emoji in
`src/puzzles/scenes/*.json`. The portrait's art id is the prompt id without `cast-`. The emoji
stay until each file exists, because `src/ui/art.test.ts` fails on a plain id with no file
behind it.

Portraits are head-and-shoulders busts on a 48×48 grid. Compose them to sit inside a circle:
nothing important in the corners. They join the thirteen existing portraits as one cast, so
match those picks' line weight, cell size, head size, and amount of shoulder. If the generator
takes image references, give it `public/art/cast/rook.png` and `public/art/cast/tess.png` for
that.

The house-style block is the one in [06-cast-chapters-4-7.md](06-cast-chapters-4-7.md),
including its two additions: no symbols, and no colored disc or scenery behind the subject.

The two speaking bosses (the Old Wyrm and Professor Ostrander) get a portrait here and a fight
sprite in [09-enemies-chapters-7-9.md](09-enemies-chapters-7-9.md). Generate the portraits
first, then use them as references for the sprites so the faces match. If a portrait fails, the
sprite can stand in for it. The 11:59 has no lines, only a whistle, so it has no portrait.

---

## cast-pim

Stationmaster Pim, who runs Halt Junction in the Night Mail scenes. Unhurried and procedural,
whatever is coming down the line ("Gerald used to be the coal." "Stand behind the yellow line,
please." "I have filled in the form."). The lamp is the one thing still lit at the station.
Gender-neutral. Placeholder today: 🧑‍✈️. Accent: metal `#3d4450`. Steel and not brass, so a
stationmaster's usual yellow trim can't compete with the key on the 11:59.

```
Pixel-art sticker portrait for a cozy puzzle game, drawn on a strict 48x48 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, steel blue-gray #3d4450. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One subject, centered, filling about 80% of a square frame, composed to fit inside a circle. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: head-and-shoulders bust of Stationmaster Pim, a neat, upright railway stationmaster with a mild, level gaze and a polite flat mouth, completely unalarmed. A peaked stationmaster's cap with a steel blue-gray crown, a paper-colored band, and a plain graphite peak, with no badge on it. A steel blue-gray uniform jacket buttoned up to the collar, with a row of big plain paper-colored buttons. A square railway hand lantern held up at the bottom edge of the frame, with a paper-colored light in it. Clean-shaven. Three-quarter view, looking toward the viewer. Keep the whole cap inside the circle. Reads at a glance as: someone who will calmly fill in a form about this.
```

## cast-dennis

Sir Dennis, in the Undercroft scenes: a man who plays a knight in the Sunday jousting at Castle
Ambry and went downstairs on Tuesday to look for a school trip's packed lunches ("Halt! Oh,
thank goodness." "I only really do Sundays."). His armor is a costume, so it has to look
nothing like the Rusted Sentry's. Placeholder today: 🤺. Accent: mischief purple `#7b5cff`.

```
Pixel-art sticker portrait for a cozy puzzle game, drawn on a strict 48x48 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, bright purple #7b5cff. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One subject, centered, filling about 80% of a square frame, composed to fit inside a circle. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: head-and-shoulders bust of Sir Dennis, a man in a cheap costume knight's outfit, with a worried, hugely relieved face: eyebrows up, eyes wide, a wobbly grateful smile. A shiny helmet slightly too big for him, with the visor pushed up and a droopy bright purple plume flopping to one side. Thin plain shoulder plates with a visible buckle, over a bright purple tabard with a plain block of paper color on it and no crest or emblem. A crumpled paper lunch bag held up at the bottom edge of the frame, like something he rescued. Clean-shaven. Three-quarter view, looking toward the viewer. Keep the whole helmet and plume inside the circle. Reads at a glance as: a weekend knight who is very glad to see you.
```

## cast-priya

Priya, the research student who meets you in the Annex scenes. Worn down and deadpan, and has
seen all of this before ("I'm a third-year. I have been a third-year for six years." "She does
that."). No goggles, since those are Dee's, and no lanyard, since the lanyard in this chapter
belongs to Ostrander's key. Gender-neutral. Placeholder today: 🧑‍🔬. Accent: Go green `#2e8b57`.

```
Pixel-art sticker portrait for a cozy puzzle game, drawn on a strict 48x48 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, green #2e8b57. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One subject, centered, filling about 80% of a square frame, composed to fit inside a circle. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: head-and-shoulders bust of Priya, a worn-out research student with a flat, patient, deadpan look. Half-lidded eyes with big bags under them, round glasses mended at the bridge with a wrap of tape, and a mouth that has stopped trying to smile. Messy hair held back with a plain bulldog clip. A paper-colored lab coat with its collar askew over a green sweater, several pens crammed into the chest pocket, and a green instant-noodle cup with a fork sticking out of it held up at the bottom edge of the frame. Three-quarter view, looking toward the viewer. Reads at a glance as: someone who has been a third-year for six years.
```

## cast-wyrm

The Old Wyrm, the Undercroft boss, asleep at the bottom of nine flights of stairs. All it ever
says is "Mine." and then "MINE." Dee spots the key between its shoulder blades in this scene,
so the key shows here. Same face as its sprite in `09-enemies-chapters-7-9.md`. Placeholder
today: 🐉. Accents: job stamp coral `#d9534f` (the gaps between its scales) and spark yellow
`#e0a800` (the key). Two accents allowed, so the dragon is graphite and paper, and the coins
are paper, not gold.

```
Pixel-art sticker portrait for a cozy puzzle game, drawn on a strict 48x48 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, coral red #d9534f, used only for the gaps between the scales, plus a second accent, warm yellow #e0a800, used only for the brass key. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One subject, centered, filling about 80% of a square frame, composed to fit inside a circle. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: close-up of The Old Wyrm, the long flat head of a vast ancient dragon, seen low and heavy, lying across a thick coil of its own neck. Graphite scales, a few big paper-colored plates along the jaw, two swept-back horns kept inside the circle. One huge heavy-lidded paper-colored eye, half open, with a narrow slit pupil, and a look of total possessive certainty. A single plain paper-colored coin held between its front teeth, and a thick curl of graphite smoke rising from one nostril. Two bold coral red gaps between the scales of the neck. A large yellow wind-up key sticks up from behind the neck, past one side of the head, big enough to be seen right away and inside the circle. A few plain paper-colored coins along the bottom edge. The coins are not gold or yellow: the key is the only yellow thing. No wings. Facing the viewer. Reads at a glance as: an enormous old dragon who has already said mine.
```

## cast-ostrander

Professor Ostrander, the Annex boss. She stopped answering emails and now only sends them back,
corrected ("You are late. I have reviewed your invoice, and your figures do not add up." "Page
one. Rejected."). Disappointed, precise, never loud. The key hangs on a lanyard and Dee spots
it, so it shows here. No monocle or bow tie, which keeps her clear of the Curator, the
colleague who gave her the key. Same face as her sprite in `09-enemies-chapters-7-9.md`.
Placeholder today: 🧑‍🏫. Accents: job stamp coral `#d9534f` and spark yellow `#e0a800` (the
key). Two accents allowed.

```
Pixel-art sticker portrait for a cozy puzzle game, drawn on a strict 48x48 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, coral red #d9534f, plus a second accent, warm yellow #e0a800, used only for the brass key. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One subject, centered, filling about 80% of a square frame, composed to fit inside a circle. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: head-and-shoulders bust of Professor Ostrander, a severe older woman academic, chin level, looking at the viewer over half-moon glasses low on her nose. One eyebrow raised by a precise amount, thin lips, an expression of tired disappointment, not rage. A flat graphite mortarboard with a coral red tassel, kept fully inside the circle. A graphite academic gown with a broad coral red hood trim around the shoulders, over a high paper-colored collar. A thick graphite cord hangs around her neck, with a large yellow wind-up key on it resting on her chest, big enough to be seen right away. An oversized coral red pen, uncapped, held up at the bottom edge of the frame. The tassel is coral, not yellow: the key is the only yellow thing. Three-quarter view, looking toward the viewer. Reads at a glance as: a professor who has read your invoice and has notes.
```
