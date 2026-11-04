# Tier 1: Enemy sprites, chapters 7 to 9

The enemies from End of the Line, Below Stairs, and Peer Review. Same slot as
[07-enemies-chapters-4-7.md](07-enemies-chapters-4-7.md): ~38 px in the battle bar
(`src/ui/components/battleBar.ts`), where the sprite flinches, lunges, and falls over grayscale
when defeated (CSS handles that; the art is one static pose). Replaces `sprite` in
`src/puzzles/encounters/*.json`. The sprite's art id is the prompt id without `enemy-`. The
emoji stay until each file exists, because `src/ui/art.test.ts` fails on a plain id with no
file behind it.

Sprites are full-body on a 32×32 grid. Keep them chunky: at 38 px, fine detail is gone and only
the silhouette and the accent survive. Every enemy's silhouette says its mechanic.

**Phase forms** must keep the base sprite's silhouette and pose, at the same size, changing
only what the phase says. Generate the base first, then the phase, and if the generator
supports image references, feed it the chosen base. Pick the same variant across a set.

**Which phases get art.** Each boss gets one phase form, for the late phase where the fight
changes: Express, Not Stopping, Wrathful Wyrm, and Reviewer One. Each boss's earlier named
phase (Running Late, Waking Wyrm, Professor Emerita) keeps the base sprite, and so does every
named phase on a regular enemy. Each enemy's note says which those are. No phase in these
encounters has a `sprite` today, so those three need the field added when their art goes in.

Order of play: The Night Mail (Signal Box, Ticket Inspector, Gerald, the 11:59), The Undercroft
(Rusted Sentry, Cellar Ooze, the Rat King, the Old Wyrm), The Annex (Spark Hound, Failed Clone,
Reviewer Two, Professor Ostrander). Bosses may come out a touch bigger; cleanup handles that,
so leave the margins alone.

What this set carries over from the earlier rounds (`../incoming/round2-review.md`,
`round3-review.md`, and `round5-review.md`):

- **Coral cracks mean weak points.** Coral is what marks a weak point on the board, so every
  armored enemy (Gerald, the Rusted Sentry, the Old Wyrm, Reviewer Two) gets bold coral cracks
  and no other coral. Faint cracks vanish at 38 px, and coral on Great Bruno's trunks had to be
  recolored in cleanup.
- **The brass key is a story clue.** Each boss here has one (the 11:59's boiler, the Wyrm's
  shoulder blades, Ostrander's lanyard). Keep it large and spark yellow, and keep yellow off
  everything else on those sprites. These three are all easy to get wrong, so their prompts say
  it outright: a steam engine's brass and headlamp, a dragon's gold, a mortarboard's tassel.
- **Tall and thin shrinks.** Human faces turn to mush at 38 px, so the human sprites here (the
  Ticket Inspector, the Failed Clone, Reviewer Two, Ostrander) and the Rusted Sentry are posed
  wide and rely on their hats and props, not faces.
- **Marks have to be big.** Fog, soot, smoke, and slop should be about as big as the body. A
  small mark disappears, which is what sank the first sponge.
- **Thin graphite disappears on the dark theme.** Only the paper outline shows, as with the
  bomb and Mother Bramble's vines. Gerald, the Wyrm, and Ostrander's gown are mostly graphite,
  so they're drawn as thick masses with paper-colored detail.
- **The accents listed are the only ones that survive cleanup.** The palette snap removes any
  other color, so a body meant to be gray has to name gray as an accent.

---

## The Night Mail

### enemy-signal-box

"It's been showing red since before the line closed. It has opinions now." Fogs your clues and
scrambles them. Crossed Signals (at 75% HP) keeps this sprite. Placeholder today: 🚦. Accents:
job stamp coral `#d9534f` (the lamp) and pencil gray `#7a7e8a` (the fog). Two accents allowed.
Silhouette: a squat railway signal with one red eye and its arms at odds. It's a signal and not
a traffic light, which is what the semaphore arms are for, and not the building that the name
also means.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, coral red #d9534f, plus a second accent, soft gray #7a7e8a, used only for the fog. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: a squat, stocky old railway signal with a bad attitude: a big blocky graphite signal head as wide as it is tall, on a short thick post with a wide base. In the head, two huge round lamps, one above the other. The top lamp is solid coral red with a heavy graphite hood lowered across it, like a glaring eye. The bottom lamp is paper-colored and half lost in fog. Two thick paper-colored semaphore arms with a graphite stripe stick out to either side, one angled up and one angled down, so the figure is broad. A big soft gray cloud of fog as big as the head rolls out of the bottom lamp and drifts to one side. No building, track, or ground. Reads at 40 px as: a grumpy railway signal fogging itself up.
```

### enemy-ticket-inspector

"He has been checking the same empty carriage since 1986. Some of his paperwork is made up."
Forges some of your clues, so you call out the fakes, and charges up to hit you with a penalty
fare. Chief Inspector (at 50% HP) keeps this sprite. Placeholder today: 🎫. Accents: pencil gray
`#7a7e8a` (the uniform, a little ghostly) and mischief purple `#7b5cff` (the forged tickets, as
on the Master Forger and Madame Vesper). Two accents allowed. Silhouette: a big cap, a ticket
punch, and a fan of tickets, held out wide.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, soft gray #7a7e8a, plus a second accent, bright purple #7b5cff, used only for the forged tickets. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: a railway ticket inspector in a wide pose, short and broad with legs planted apart, one arm thrust straight out holding a huge ticket punch like a big pair of pliers, the other flung out holding up a wide fan of oversized tickets as big as his torso, so the figure is broad and not a thin sliver. Most of the tickets are paper-colored and the top two are bright purple. All of them are blank, with one notched corner and no writing. A big gray peaked cap, far too large, with a graphite peak pulled down so only two pale dot eyes and a flat disapproving mouth show. A gray uniform with a row of big graphite buttons. Reads at 40 px as: an inspector with a fan of tickets and a punch.
```

### enemy-coal-heap

Gerald: "The stationmaster calls it Gerald. Aim for the cracks, and mind your clean work." The
display name is Gerald and the encounter id is `coal-heap`. "Gerald used to be the coal."
Armored, so only its weak points take damage, and it covers your board in soot. Stoked Gerald
(at 50% HP) keeps this sprite. Placeholder today: 🪨. Accents: job stamp coral `#d9534f` (the
cracks) and pencil gray `#7a7e8a` (the soot). Two accents allowed, so the coal itself is
graphite and paper. Silhouette: a heap of coal, wider than it is tall, that has stood up.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, coral red #d9534f, used only for the cracks, plus a second accent, soft gray #7a7e8a, used only for the soot cloud. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: a low, wide heap of big chunky angular coal lumps that has stood up on two stumpy legs, with two thick lumpy arms hanging at its sides. It is wider than it is tall, more a pile than a person. The lumps are solid graphite, each with one flat paper-colored facet along its top edge so the lumps read as separate. One lump on top serves as a head, with two small paper-colored eyes and a flat, patient mouth: polite, not angry. Three bold coral red cracks run between the lumps across the chest and belly, thick enough to see at small size. A big soft gray cloud of soot puffs off one shoulder, as big as the top half of the heap, with a few chunky graphite flecks falling from it. No ground. Reads at 40 px as: a friendly coal heap, cracked and puffing soot.
```

### enemy-the-1159 (boss, 2 forms)

The 11:59, "Forty years late, and picking up speed." Nobody's driving it. Fogs and scrambles
your clues, its carriages uncouple and swap your lines, and later it charges. The key is "on
the boiler where the whistle ought to be." Running Late (at 92% HP) keeps the base sprite.
Placeholder today: 🚂, with no sprite on its phases yet. Silhouette: a pale ghost engine coming
at you three-quarters on, with a clock for a face. The clock face has no numerals, so the time
is told by the hands alone.

**Base**, id `enemy-the-1159`. Accents: pencil gray `#7a7e8a` (the engine and steam) and spark
yellow `#e0a800` (the key). Two accents allowed.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, soft gray #7a7e8a, plus a second accent, warm yellow #e0a800, used only for the wind-up key. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: a chunky, stubby old steam locomotive coming toward the viewer in three-quarter view, short and wide like a toy, pale as a ghost. A fat round soft gray boiler with thick graphite bands, a short stubby smokestack, a cab with solid graphite empty windows, and a wide wedge-shaped cowcatcher at the front. The round front of the boiler is a big paper-colored clock face with a thick graphite ring and no numerals or tick marks, with two thick graphite hands almost together, nearly straight up, a moment before twelve. A large yellow wind-up key sticks straight up from the top of the boiler where the whistle would be. A big soft gray cloud of steam rolls back from the smokestack, as big as the engine, and more gray steam hides the wheels. There is no brass and no yellow lamp: the key is the only yellow thing. No track, ground, or carriages. Reads at 40 px as: a ghost train with a clock for a face and a key on top.
```

**Phase "Express, Not Stopping"** (at 50% HP), id `enemy-express-not-stopping`. Accents: pencil
gray `#7a7e8a` and spark yellow `#e0a800` (the key). Two accents allowed.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, soft gray #7a7e8a, plus a second accent, warm yellow #e0a800, used only for the wind-up key. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: the same stubby ghost locomotive in the same three-quarter view, same size, with the same clock face and the same yellow key on top of the boiler, but now at full speed: the two clock hands lie exactly together pointing straight up, the steam is blown flat straight back in one long thick gray streak much wider than before, thick graphite speed lines trail from the cowcatcher, and the wheels show through the steam as blurred graphite ovals. A few chunky paper-colored sparks fly from under the cowcatcher. There is no brass and no yellow lamp: the key is the only yellow thing. No track or ground. Same engine as before, with the steam ripped backward. Reads at 40 px as: the ghost train, not stopping.
```

## The Undercroft

### enemy-rusted-sentry

"Not one of the castle's. The castle's ones don't turn their heads." Armored, and its halberd
"clips your work and sends two lines flying." Furious Sentry (at 50% HP) keeps this sprite.
Placeholder today: 🛡️. Accents: dirt brown `#a9825a` (the rust) and job stamp coral `#d9534f`
(the cracks). Two accents allowed. Silhouette: an empty suit of armor, broad at the shoulders,
with a halberd across the whole frame and its head turned.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, wood brown #a9825a, plus a second accent, coral red #d9534f, used only for the cracks. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: a battered, empty suit of plate armor in a wide stance, legs apart, with huge rounded shoulder plates much wider than the helmet. Wood brown rusty plates with thick graphite edges and a few chunky paper-colored scratches. A closed helmet with a solid graphite eye slit, turned sharply to one side as if it heard you. Both gauntlets grip a huge halberd held diagonally across the whole body, from one low corner to the opposite high corner, with a big paper-colored axe blade sticking out past the silhouette. Three bold coral red cracks run across the breastplate and one thigh, thick enough to see at small size. No plume, no crest, no shield. Reads at 40 px as: a rusty suit of armor with a halberd, cracked.
```

### enemy-cellar-ooze

"It ate the tour map. It kept the skull. It is very nearly cube-shaped." Scrambles your clues,
then slops ink across your board. Overflowing Ooze (at 45% HP) keeps this sprite. Placeholder
today: 🧊. Accent: Go green `#2e8b57`. Silhouette: a sagging square of slime with a skull in it,
slopping over.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, green #2e8b57. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: a big block of slime that is very nearly a cube, drawn front-on so it reads as a square, with one top corner slumping and sagging. Solid flat green with a thick graphite outline. Hanging inside it, clearly visible, are a paper-colored skull near the middle and a crumpled paper-colored map below it, a plain creased rectangle with no writing. Two tiny dopey graphite dot eyes on the surface above the skull. A thick slop of green pours over the front edge and spreads into a puddle as wide as the block, with a few chunky green drips. Reads at 40 px as: a nearly cube-shaped slime with a skull inside.
```

### enemy-rat-king

"He got the crown from the gift shop. He's forged the receipt." Forges some of your clues, and
his court rearranges your lines. His Royal Ratness (at 45% HP) keeps this sprite. Placeholder
today: 🐀. Accents: pencil gray `#7a7e8a` (the fur) and spark yellow `#e0a800` (the crown). Two
accents allowed. He's a regular enemy with no key, so yellow is free here. Silhouette: a fat
rat in a too-big crown with a very long receipt. One rat, not a tangle of them.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, soft gray #7a7e8a, plus a second accent, warm yellow #e0a800, used only for the crown. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: one fat, pompous rat standing upright in a wide pose on short back legs, with a big pear-shaped soft gray body, a pointed snout held high, big round ears, and long whiskers. A large cheap yellow crown, far too big for him, plain with no jewels, tilted over one ear. One paw on his hip, the other held out holding up a very long paper-colored receipt, a strip that unspools down to the floor and curls out to one side, as long as he is tall, marked with thick graphite stripes and no writing. A long thick graphite tail curling out on the other side. A smug half-closed look. Reads at 40 px as: a smug rat in a crown with a long receipt.
```

### enemy-old-wyrm (boss, 2 forms)

The Old Wyrm: "The ninth flight down. The hoard is breathing. Aim between the scales, and don't
trust all the gold." Armored, forges clues, scrambles, charges, and later snorts black smoke
across your board. Waking Wyrm (at 80% HP) keeps the base sprite, so the base has one eye open
and works awake. Placeholder today: 🐉, with no sprite on its phases yet. Silhouette: a huge
coiled dragon, much wider than it is tall, on a heap of coins with a key in its back. The
portrait in `08-cast-chapters-7-9.md` is the same creature; match its face.

Gold is the trap here. Yellow is reserved for the key and coral for the gaps, which uses up
both accents, so the dragon is graphite and paper and the hoard is paper. That suits the outro,
where the hoard is "mostly chocolate coins" anyway. Don't let the generator talk you into gold.

**Base**, id `enemy-old-wyrm`. Accents: job stamp coral `#d9534f` (the gaps) and spark yellow
`#e0a800` (the key). Two accents allowed.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, coral red #d9534f, used only for the gaps between the scales, plus a second accent, warm yellow #e0a800, used only for the wind-up key. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: an enormous ancient wingless dragon lying in thick heavy coils on a low, wide heap of round coins. The coils are as thick as its head and stacked in two big loops, so the whole figure is much wider than it is tall. Solid graphite scales, with a few big paper-colored plates along the belly and jaw. The long flat head rests just above the top coil, with two swept-back horns and one huge paper-colored eye half open with a narrow slit pupil. A large yellow wind-up key sticks straight up from between the shoulder blades, behind the head. Three bold jagged coral red gaps run between the scales along the coils, thick enough to see at small size. The coins are plain paper-colored discs with graphite outlines and no markings, spilling out to both sides. The coins are not gold or yellow: the key is the only yellow thing. Reads at 40 px as: a coiled dragon on a coin heap with a key in its back.
```

**Phase "Wrathful Wyrm"** (at 40% HP), id `enemy-wrathful-wyrm`. Accents: job stamp coral
`#d9534f` (the gaps) and spark yellow `#e0a800` (the key). Two accents allowed.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, coral red #d9534f, used only for the gaps between the scales, plus a second accent, warm yellow #e0a800, used only for the wind-up key. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: the same dragon in the same two big coils on the same heap of coins, same size, with the same yellow key between its shoulder blades and the same bold coral red gaps, but now furious: the neck has reared up off the top coil, the jaws are flung wide open showing big paper-colored teeth, the eye is wide open, and a huge billow of solid graphite smoke rolls out of the jaws, as big as the head, with a paper-colored edge so it stands apart from the body. Plain paper-colored coins fly off the heap to both sides. The coins are not gold or yellow: the key is the only yellow thing. Same coils as before, with the head up and smoke pouring out. Reads at 40 px as: the dragon awake and roaring black smoke.
```

## The Annex

### enemy-spark-hound

"Don't pet the dog. It's on the sign, and on the other sign." Scrambles your clues and charges
up. Good Boy, Overcharged (at 60% HP) keeps this sprite. Placeholder today: 🐕. Accent: spark
yellow `#e0a800`. It's a regular enemy with no key, so yellow is free here. Silhouette: a happy
stocky dog with its fur standing straight up in lightning spikes. Delighted, not snarling,
since the joke is that it's a very good boy.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, warm yellow #e0a800. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: a stocky, delighted dog standing square-on with a broad chest and short thick legs, paper-colored fur with one graphite patch over an eye. All the fur along its back and neck stands straight up in a row of big jagged spikes, and its floppy ears are lifted off its head by static. A huge open happy grin with a long tongue hanging out, and bright round eyes. Its tail is a thick yellow zigzag lightning bolt, and two more big yellow lightning bolts arc off its back. A plain graphite collar with a small blank paper-colored tag. Reads at 40 px as: a happy dog crackling with electricity.
```

### enemy-failed-clone

"Attempt 41 copied everything except the instructions. It would like to help." Fogs your clues,
and "copies your work. Into the wrong place," swapping your lines. Attempt 42 (at 50% HP) keeps
this sprite. Placeholder today: 🧟, but it isn't undead or frightening. It's unfinished, and
keen. Accents: mischief purple `#7b5cff` (the smock) and pencil gray `#7a7e8a` (the vat mist).
Two accents allowed. Silhouette: a lopsided person with one arm too many, all of them held out
to help.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, bright purple #7b5cff, plus a second accent, soft gray #7a7e8a, used only for the mist. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: a lumpy, unfinished person in a wide stance, in a short bright purple lab smock, with smooth paper-colored skin, no hair, and a thick graphite outline. The head is too big and lopsided, with two round eyes at different heights and a big wonky friendly smile. Three arms held out wide: one on each side, and a third growing out of the ribs in the wrong place, each ending in an open helpful hand. One hand offers a plain blank clipboard, held upside down. A big soft gray cloud of mist pours off its shoulders and drifts to one side, as big as its torso. No blood, no wounds, no rot. Reads at 40 px as: a wonky, eager clone with too many arms.
```

### enemy-reviewer-two

"Nobody knows who Reviewer Two is. Everybody has met Reviewer Two. Find the weak arguments."
Armored, so only its weak points take damage, and it forges your clues. Reviewer Two, Revised
(at 50% HP) keeps this sprite. Placeholder today: 🧐, but no monocle, which is the Curator's.
Accent: job stamp coral `#d9534f` (the cracks), and no red pen, because coral has to mean weak
points here. Gender-neutral. Silhouette: an anonymous figure behind a wall of paper, with a
black bar across the eyes and the weak arguments cracking through.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, coral red #d9534f, used only for the cracks. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: an anonymous reviewer in a wide stance, elbows out, holding an enormous thick manuscript up in front of the body with both hands like a shield. The manuscript is wider than the shoulders and covers the whole torso: a thick stack of paper-colored pages with a heavy graphite clip at the top, the edges of the stack visible, marked with thick graphite stripes and no writing. Three bold coral red cracks run through the stack, thick enough to see at small size. Above it, a square paper-colored head with a single thick solid graphite bar across the eyes, like a censor bar, and a thin flat mouth. A blocky graphite suit, with short legs planted apart below the manuscript. No glasses or monocle. Reads at 40 px as: a faceless reviewer behind a cracked wall of paper.
```

### enemy-ostrander (boss, 2 forms)

Professor Ostrander: "Top floor. Every wall is charts, and every chart has been corrected."
Forges clues, scrambles, swaps, and inks your board ("Retracted."). She isn't armored, so her
coral is free for the pen and the gown. Professor Emerita (at 92% HP) keeps the base sprite.
Placeholder today: 🧑‍🏫, with no sprite on her phases yet. Silhouette: a huge mortarboard and a
giant pen on a professor posed wide, with a key on a thick cord. The portrait in
`08-cast-chapters-7-9.md` is the same woman; match her face.

**Base**, id `enemy-ostrander`. Accents: job stamp coral `#d9534f` and spark yellow `#e0a800`
(the key). Two accents allowed.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, coral red #d9534f, plus a second accent, warm yellow #e0a800, used only for the wind-up key. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: a severe professor in a wide pose, feet apart, her graphite academic gown spread out into big bell-shaped sleeves. One arm is flung straight out to the side gripping an enormous coral red pen as long as she is tall, held like a lance, and the other hand is on her hip, so the figure is broad and not a thin sliver. An oversized flat graphite mortarboard, much wider than her head, with a thick coral red tassel. Half-moon glasses in solid paper color, and a thin flat mouth. A broad coral red hood trim over the shoulders. A thick graphite cord hangs around her neck, with a large yellow wind-up key on it resting on her paper-colored shirt front. The tassel is coral, not yellow: the key is the only yellow thing. Reads at 40 px as: a professor with a giant red pen and a key around her neck.
```

**Phase "Reviewer One"** (at 50% HP), id `enemy-reviewer-one`. The reveal: she's the reviewer
above Reviewer Two, so she takes on that sprite's black bar. Her taunt is "Rejected. Rejected.
Rejected." Use the chosen `enemy-reviewer-two` as a second reference for the bar. Accents: job
stamp coral `#d9534f` and spark yellow `#e0a800` (the key). Two accents allowed.

```
Pixel-art sticker sprite for a cozy puzzle game, drawn on a strict 32x32 pixel grid and shown large with crisp hard-edged pixels (no anti-aliasing, no blur, no smoothing). Flat colors only: no gradients, no glossy highlights, no 3D, no photo, no painterly texture. Palette: dark graphite #23262f for outlines and details, off-white paper #f6f3ec for light areas, and one accent color, coral red #d9534f, plus a second accent, warm yellow #e0a800, used only for the wind-up key. A thick off-white #f6f3ec die-cut sticker border around the whole silhouette, risograph zine style. Plain flat #f6f3ec background (transparent if supported). One full-body subject, centered, filling about 80% of a square frame, facing the viewer or three-quarter view. No text, letters, numbers, symbols, watermark, frame, or drop shadow. No colored disc or scenery behind the subject.

Subject: the same professor in the same wide pose, same size, with the same oversized mortarboard, the same giant coral red pen held out to the side, and the same yellow key on its thick cord, but now revealed: a single thick solid graphite bar covers her eyes in place of the glasses, like a censor bar. A big coral red ink blot as large as her head bursts from the tip of the pen. The hem of the gown has fanned out into a wide skirt of loose paper-colored sheets, each struck through with one thick coral red diagonal stripe and no writing, and two loose sheets fly off to either side. The tassel is coral, not yellow: the key is the only yellow thing. Same head, hat, and arms as before, with the sheets and the blot added. Reads at 40 px as: the professor behind a black bar, with red ink and rejected pages flying.
```
