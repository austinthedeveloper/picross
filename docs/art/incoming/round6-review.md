# Round 6 review: chapters 7 to 9

Reviewed against `../prompts/README.md`, `../prompts/08-cast-chapters-7-9.md` and
`../prompts/09-enemies-chapters-7-9.md`. Each candidate was run through the cleanup script's
palette snap into a scratch folder, looked at large, then rendered at display size on paper and
dark. The picks were lined up beside approved art. None of this has been seen in the game yet,
and nothing in `public/art/` has changed.

19 of the 20 images have a usable pick. The Old Wyrm's base sprite needs regenerating, and its
set needs one palette exception.

## Portraits

| Portrait       | Pick   | Why                                                                                       |
| -------------- | ------ | ----------------------------------------------------------------------------------------- |
| cast-pim       | **v1** | The bigger lantern holds at 52 px, and the plain face is calmer. v2 adds freckles.        |
| cast-dennis    | **v1** | Eyebrows up and wide eyes read as worried relief. v2 is laughing and looking away.        |
| cast-priya     | **v2** | Centered in the circle with the flatter deadpan. v1 sits to the left.                     |
| cast-wyrm      | **v1** | Darkest match for the picked sprites, once gray is kept. See below.                       |
| cast-ostrander | **v1** | Tired disappointment as briefed, where v2 looks cross. The tassel side matches sprite v1. |

## Enemies

Where an enemy has a phase form, the same variant is picked across the set.

| Enemy               | Pick                  | Why                                                                                            |
| ------------------- | --------------------- | ---------------------------------------------------------------------------------------------- |
| signal-box          | **v2**                | The fog is as big as the head and the arms are thicker. v1's fog breaks up at 38 px.           |
| ticket-inspector    | **v1**                | v2 picked up pointed ears from the goblin reference, so it stops reading as a person.          |
| coal-heap           | **v1**                | One connected crack that stays visible at 38 px. v2's are broken and thinner.                  |
| the-1159 (2 forms)  | **v1**                | The key stays clean at 38 px, and Express v1's wheels are clear where v2's smear.              |
| rusted-sentry       | **v2**                | Bolder cracks and it fills the frame better, which the armor mechanic needs.                   |
| cellar-ooze         | **v1**                | The squarer of the two, with one slumped corner, which is the joke. v2 is domed.               |
| rat-king            | **v1**                | The crown is bigger and clearer at 38 px, so the silhouette says king first.                   |
| old-wyrm (2 forms)  | **v1, base rejected** | See below. Wrathful v1 has three coral gaps, and v2 has only two.                              |
| spark-hound         | **v2**                | Larger in the frame, with thicker bolts.                                                       |
| failed-clone        | **v1**                | The wonky face reads at 38 px. In v2 the mist cuts across the head like a scarf.               |
| reviewer-two        | **v2**                | Three cracks as briefed, where v1 has two. Its bar overshoots the head like a real censor bar. |
| ostrander (2 forms) | **v1**                | The solid gown gives the strongest silhouette at 38 px. v2's striped gown goes busy.           |

## The Old Wyrm

Two separate problems, and both trace back to the prompt asking for a graphite dragon.

- **The cleanup erases it.** The generator shaded the scales in gray on every candidate, which
  the brief doesn't allow, so the palette snap turns them all to graphite. The portrait comes
  out as a black blob with one eye and a grin. Keeping `GRAY` as a third color on this set
  brings the dragon back on all of its images. I'd make that exception: it's the only image
  set with three accents, and gray is already a neutral in the palette. The alternative is
  regenerating with paper-colored scale edges and no gray.
- **The base sprite is too flat.** The brief asked for "much wider than it is tall," and it
  got that. At 38 px the base is 37×17 px with a key of about 5×4 px, while the approved bosses
  are 32 to 37 px tall. It reads as a dark slug with stripes, and it's the form the player sees
  until 40% HP. Both candidates have this, so it's the prompt's fault. Wrathful Wyrm is fine at
  38×35 px.

The base prompt in `09-enemies-chapters-7-9.md` is rewritten as a tall mound of coils, using
Wrathful v1 as the reference. Regenerate it as `enemy-old-wyrm-v3.png` and `-v4.png`.

## Calls worth a second look

- **Ostrander's pen is upright** in both sets, not held out like a lance as briefed. She stays
  wide because of the gown and pen together, so this isn't blocking.
- **Stationmaster Pim reads young** and a little masculine, where the brief is gender-neutral
  and unspecific about age. Both candidates do this. The expression and props are right.
- **The paper square on Dennis's tabard** is what the prompt asked for, in place of a crest. It
  looks a little like a missing patch. It can be recolored purple in cleanup if it bothers you.

## Known weak spots

None of these block the batch. Recheck them in the game once they're wired in.

- **Sentry and Gerald's cracks** are thin at 38 px on a 1x screen, so the armor badge does more
  of the work. Both are clear at 2x.
- **Gerald, Ostrander's gown and Wyrm's coils on dark.** The graphite nearly matches the page,
  so the outlines and paper details carry them, like the bomb. Gerald's facets and Ostrander's
  key, hat and pen all hold up.
- **Spark Hound on paper** is mostly thin outline at 1x. It's much stronger on dark.
- **Failed Clone's clipboard** reads more like a tag or a drip bag. That still suits a lab.
- **Wyrm portrait's coral** is one long line under the teeth, not two gaps in the neck, so it
  can read as a lip.

## Batch-wide findings

- **Yellow stays on the key.** On all three bosses, the only yellow left after the snap is the
  key: no brass or lamp on the train, paper coins on the Wyrm, and a coral tassel on Ostrander.
- **Coral stays on the cracks** on all four armored enemies.
- **The train's clock has no numerals.** Its hands are just before twelve on the base form, and
  exactly on twelve for Express.
- **Portraits fit their circles.** At most 1.9% of any pick falls outside the circle, against
  2.9% for the approved Yeti. Line weight and head size match the approved cast, though Priya's
  hair and Ostrander's are a little more detailed.
- **Phase forms keep their base pose and scale** in the picked train and Ostrander sets.

## Final picks

- **Portraits:** pim v1, dennis v1, priya v2, wyrm v1, ostrander v1.
- **Enemies:** signal-box v2, ticket-inspector v1, coal-heap v1, rusted-sentry v2, cellar-ooze
  v1, rat-king v1, spark-hound v2, failed-clone v1, reviewer-two v2.
- **Enemy phase sets:** the-1159 and express-not-stopping v1; ostrander and reviewer-one v1;
  wrathful-wyrm v1, with old-wyrm to come from the regenerated candidates.

## Cleanup results

Done, by `scripts/art-clean.py`. The 19 picks are in `public/art/` and wired into the game, and
the rerun left every existing image byte-for-byte unchanged.

- **The Wyrm keeps gray.** Its portrait and Wrathful Wyrm are cleaned with gray as a third
  accent, and both read as a dragon in the game.
- **The Old Wyrm's base is still 🐉.** It's the only emoji left among the enemies and cast, and
  the Wyrm's phases before 40% HP show it too. When the regenerated pick is in, add it to the
  `wrathful-wyrm` set in the script so the two share a scale, then set its `sprite`.
- **Seen in the game.** All 14 new sprites in the battle bar and all 5 portraits in the dialogue
  circle, on the dark theme. The 3 phase forms were seen by starting a saved fight at that
  phase. Light theme and the 52 px sign-off weren't checked in the game.
- **Playthroughs pass.** The whole of the Night Mail, the Undercroft and the Annex, on the
  production build, with no page errors.
