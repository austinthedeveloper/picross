/**
 * Puzzle list thumbnails, drawn when their card scrolls near the screen (#153). Both packs
 * together are 600+ puzzles, and each solved one is a canvas (a block's, an isometric
 * drawing); drawing them all up front would hold up the list's first paint. The card keeps
 * its size meanwhile (`.thumb` has a fixed height), so nothing jumps when one draws.
 *
 * One list is on screen at a time, so each `lazyThumbs()` starts over: the last list's
 * thumbnails that never drew are let go.
 */
type Fill = (box: HTMLElement, draw: () => Node) => HTMLElement;

let observer: IntersectionObserver | null = null;
const pending = new WeakMap<Element, () => Node>();

/** A new list's thumbnail filler: `fill(box, draw)` puts `draw()` in `box` once it's near. */
export function lazyThumbs(): Fill {
  observer?.disconnect();
  observer = null;
  // No IntersectionObserver (an old browser, or the unit tests' jsdom): draw them now.
  if (typeof IntersectionObserver === 'undefined') {
    return (box, draw) => (box.append(draw()), box);
  }
  const watch = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const draw = pending.get(entry.target);
        watch.unobserve(entry.target);
        pending.delete(entry.target);
        if (draw) entry.target.append(draw());
      }
    },
    // A screen ahead, so a flick doesn't outrun them.
    { rootMargin: '100% 0px' },
  );
  observer = watch;
  return (box, draw) => {
    pending.set(box, draw);
    watch.observe(box);
    return box;
  };
}
