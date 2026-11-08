# Real-device checklist

Things the browser tests can't prove. Run through this on a real iPhone (Safari) and a
real Android phone (Chrome) before a release, and file an issue for anything that fails.

## Touch

- [ ] A tap on a cube breaks it; a drag breaks along the layer it started on, and never
      falls through to the cube behind
- [ ] Dragging empty space turns the block; the Turn tool turns it from anywhere
- [ ] Two fingers turn and pinch-zoom without breaking anything
- [ ] A double tap on empty space resets the view
- [ ] The peel slider and flip work with a thumb; nothing on the play screen needs zooming the page

## Feel

- [ ] Haptics: a tap on a stroke, a firmer one for a finished line, a pattern for a hit
      (Android; on iPhone, the switch fallback where iOS still allows it)
- [ ] Sound off by default; the speaker button turns it on
- [ ] A 9×8×9 block (Doghouse) turns smoothly; breaking cubes never stutters

## Offline and install

- [ ] "Add to Home Screen" (iPhone) / "Install app" (Android) gives the cube icon and opens full screen
- [ ] After one visit, airplane mode: the list, a puzzle, the story and the editor still open

## Accessibility

- [ ] VoiceOver (iPhone) and TalkBack (Android) can reach the block, and hear each cube's
      state and clues as the cursor moves
- [ ] A small puzzle (Steps) can be solved with a screen reader and an external keyboard
- [ ] High contrast: clue faces, painted cubes and story faces (fog, targets, ink) stay readable

## Story

- [ ] Scenes type out and skip; portraits and backdrops look right in light and dark
- [ ] A fight's bar fits on a small phone (iPhone SE width) without clipping
