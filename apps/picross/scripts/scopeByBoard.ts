import type { Plugin, Rule } from 'postcss';

/**
 * Both games' play screens use some of the same class names (`.stage`, `.toolbar`,
 * `.topbar`) for different layouts. A fight that switches board shows the 3D screen inside
 * this app, so each game's own screen styles only apply on its board: the 3D game's while
 * `<html data-board="block">` is set, this game's the rest of the time.
 *
 * The scope is wrapped in `:where()`, so selectors keep their specificity and the cascade
 * is exactly what it was in each game alone. Styles both games share (tokens, base, the
 * run, fight, dig, dialogue and art styles, in packages/shared) aren't scoped.
 */
export const BLOCK = '[data-board="block"]';
export const FLAT = `:not(${BLOCK})`;

/** Each game's own screen styles (the 3D game's are in packages/play-block), and their board. */
const SCOPED: [RegExp, string][] = [
  [/\/packages\/play-block\/src\/styles\/(game|story)\.css$/, BLOCK],
  [/\/apps\/picross\/src\/styles\/(select|editor|badges)\.css$/, FLAT],
  // The board and play screen (packages/play-grid) are this game's too.
  [/\/packages\/play-grid\/src\/styles\/(board|game)\.css$/, FLAT],
];

/** One selector, applying only when the root matches `when`. */
export function scopeSelector(selector: string, when: string): string {
  const root = /^(:root|html)(?![\w-])/.exec(selector);
  if (root) return `:root:where(${when})${selector.slice(root[0].length)}`;
  return `:where(:root${when}) ${selector}`;
}

export function scopeByBoard(): Plugin {
  return {
    postcssPlugin: 'scope-by-board',
    Rule(rule: Rule) {
      const file = rule.source?.input.file?.replaceAll('\\', '/');
      const when = file && SCOPED.find(([pattern]) => pattern.test(file))?.[1];
      if (!when) return;
      const parent = rule.parent;
      // Keyframe steps aren't selectors, and nested rules are scoped by their parent.
      if (parent?.type === 'rule') return;
      if (parent?.type === 'atrule' && /keyframes$/i.test((parent as { name?: string }).name ?? ''))
        return;
      if (rule.selectors.every((s) => s.startsWith(':where(:root') || s.startsWith(':root:where(')))
        return;
      rule.selectors = rule.selectors.map((s) => scopeSelector(s, when));
    },
  };
}
