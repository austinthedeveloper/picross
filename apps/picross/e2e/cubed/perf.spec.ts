import { expect, test } from '@playwright/test';
import { PUZZLES_BY_SIZE } from './helpers';

// The biggest blocks rebuild their mesh after every stroke; that has to stay well inside a
// frame. Budget: 4 ms on a desktop, which leaves room for slower phones.
test('the biggest blocks rebuild quickly after a stroke', async ({ page }) => {
  for (const id of PUZZLES_BY_SIZE.slice(0, 2)) {
    await page.goto(`/#/play/${id}`);
    const block = page.locator('canvas.block-canvas');
    await expect(block).toHaveAttribute('data-build-ms', /\d/);
    await block.focus();
    await page.keyboard.press('ArrowLeft');
    // Peel half the block away, then break along a layer: the worst case is many faces.
    await page.getByRole('button', { name: 'Peel along Z' }).click();
    await page.getByLabel('Layers peeled').fill('3');
    const times: number[] = [];
    for (let n = 0; n < 6; n++) {
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('x');
      times.push(Number(await block.getAttribute('data-build-ms')));
    }
    times.sort((a, b) => a - b);
    const median = times[times.length >> 1];
    console.log(`${id}: median rebuild ${median} ms`);
    expect(median).toBeLessThan(4);
  }
});
