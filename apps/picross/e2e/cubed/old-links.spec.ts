import { expect, test, type Page } from '@playwright/test';

// Picross Cubed was its own app at /3d/ until it moved into this one, under #/cubed. Its old
// links and bookmarks still work: /3d/ is a page that sends each one to the same screen
// here (apps/picross/public/3d/index.html).

/** A share code for a small puzzle, the editor's uncompressed kind (`j` + base64url JSON). */
const plus = { id: 'plus', name: 'Plus', colors: { a: 'sky' }, layers: [['.a.', 'aaa', '.a.']] };
const code = 'j' + Buffer.from(JSON.stringify(plus)).toString('base64url');

const escape = (text: string) => text.replace(/[.*+?^$()|[\]\\/]/g, '\\$&');
const heading = (name: string) => (page: Page) =>
  expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
const block = (page: Page) => expect(page.locator('canvas.block-canvas')).toBeVisible();

/** Each kind of old link, where it lands, and what's on screen there. */
const LINKS: [string, string, (page: Page) => Promise<void>][] = [
  ['/3d/', '#/cubed', heading('Picross Cubed')],
  ['/3d/#/', '#/cubed', heading('Picross Cubed')],
  ['/3d/index.html#/badges', '#/cubed/badges', heading('Badges')],
  ['/3d/?day=3#/play/steps', '#/cubed/play/steps', block],
  ['/3d/#/play/steps', '#/cubed/play/steps', block],
  ['/3d/#/tutorial', '#/cubed/tutorial', block],
  ['/3d/#/how-to-play', '#/cubed/how-to-play', heading('How to play')],
  // One daily for both boards now (#156): a block on a Cubed day, the Flat board on a Flat one.
  [
    '/3d/#/daily',
    '#/daily',
    (page) =>
      expect(page.locator('canvas.block-canvas').or(page.locator('.board')).first()).toBeVisible(),
  ],
  ['/3d/#/badges', '#/cubed/badges', heading('Badges')],
  ['/3d/#/diorama/park', '#/cubed/diorama/park', heading('Park')],
  ['/3d/#/diorama/park/1', '#/cubed/diorama/park/1', block],
  [
    '/3d/#/story',
    '#/cubed/story',
    // The jobs board, or the first chapter's opening scene on the way in.
    (page) =>
      expect(
        page
          .getByRole('heading', { name: 'Jobs', exact: true })
          .or(page.getByRole('button', { name: 'Skip ⏭' })),
      ).toBeVisible(),
  ],
  // With no run in progress, the encounter goes back to the jobs board.
  ['/3d/#/story/play', '#/cubed/story', async () => {}],
  ['/3d/#/editor', '#/cubed/editor', heading('Editor')],
  [`/3d/#/p/${code}`, `#/cubed/p/${code}`, heading('A shared puzzle')],
  [`/3d/#/p/${code}/test`, `#/cubed/p/${code}/test`, heading('Testing: Plus')],
  // Scenes were both games' already.
  [
    '/3d/#/scene/first-job-intro',
    '#/scene/first-job-intro',
    (page) => expect(page.getByRole('button', { name: 'Skip ⏭' })).toBeVisible(),
  ],
];

for (const [from, to, shows] of LINKS) {
  test(`${from} opens ${to}`.replaceAll(code, '<code>'), async ({ page }) => {
    await page.goto(from);
    // At the app's root, with no query left over.
    await expect(page).toHaveURL(new RegExp(`^http://[^/]+/${escape(to)}$`));
    await shows(page);
  });
}
