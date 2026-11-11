import postcss from 'postcss';
import { describe, expect, it } from 'vitest';
import { BLOCK, FLAT, scopeByBoard, scopeSelector } from './scopeByBoard';

const run = (css: string, from: string) => postcss([scopeByBoard()]).process(css, { from }).css;

describe('scopeSelector', () => {
  it('scopes a selector under the root without adding specificity', () => {
    expect(scopeSelector('.stage .toolbar', BLOCK)).toBe(
      ':where(:root[data-board="block"]) .stage .toolbar',
    );
  });

  it('puts the condition on the root itself for :root and html', () => {
    expect(scopeSelector(':root', FLAT)).toBe(':root:where(:not([data-board="block"]))');
    expect(scopeSelector('html.dark body', FLAT)).toBe(
      ':root:where(:not([data-board="block"])).dark body',
    );
    expect(scopeSelector('htmlish', FLAT)).toBe(':where(:root:not([data-board="block"])) htmlish');
  });
});

describe('scopeByBoard', () => {
  it("scopes the 3D game's screen styles to the block", () => {
    expect(run('.stage, .topbar { gap: 0 }', '/repo/apps/cubed/src/styles/game.css')).toBe(
      ':where(:root[data-board="block"]) .stage, :where(:root[data-board="block"]) .topbar { gap: 0 }',
    );
  });

  it("doesn't scope a file that only shares a game's name for its own", () => {
    expect(run('.stage { gap: 0 }', '/repo/packages/shared/src/styles/game.css')).toBe(
      '.stage { gap: 0 }',
    );
    expect(run('.stage { gap: 0 }', '/repo/apps/cubed/src/styles/select.css')).toBe(
      '.stage { gap: 0 }',
    );
  });

  it("scopes this game's screen styles to the flat board", () => {
    expect(run('.stage { gap: 0 }', '/repo/apps/picross/src/styles/game.css')).toBe(
      ':where(:root:not([data-board="block"])) .stage { gap: 0 }',
    );
  });

  it('leaves shared styles, keyframes and media queries alone', () => {
    for (const file of ['fight', 'run', 'dig', 'dialogue', 'art', 'tokens', 'base']) {
      const from = `/repo/packages/shared/src/styles/${file}.css`;
      expect(run('.stage { gap: 0 }', from)).toBe('.stage { gap: 0 }');
    }
    expect(
      run('@keyframes pop { from { opacity: 0 } }', '/repo/apps/picross/src/styles/game.css'),
    ).toBe('@keyframes pop { from { opacity: 0 } }');
    expect(
      run('@media (width < 40em) { .stage { gap: 0 } }', '/repo/apps/picross/src/styles/game.css'),
    ).toBe('@media (width < 40em) { :where(:root:not([data-board="block"])) .stage { gap: 0 } }');
  });
});
