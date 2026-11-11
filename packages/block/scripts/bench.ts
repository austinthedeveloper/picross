import { parsePuzzle } from '@picross/block/puzzles/format';
import { chooseHidden } from '@picross/block/puzzles/hide';
import { solve } from '@picross/block/engine/solver';
// A rough 10x10x10 sphere-ish blob with a hole.
const N = 10;
const layers: string[][] = [];
for (let y = 0; y < N; y++) {
  const layer: string[] = [];
  for (let z = 0; z < N; z++) {
    let row = '';
    for (let x = 0; x < N; x++) {
      const d = Math.hypot(x - 4.5, y - 4.5, z - 4.5);
      row += d < 4.8 && !(Math.abs(x - 4.5) < 1 && Math.abs(z - 4.5) < 1) ? 'r' : '.';
    }
    layer.push(row);
  }
  layers.push(layer);
}
const p = parsePuzzle({ id: 'blob', name: 'Blob', colors: { r: 'red' }, layers });
let t = performance.now();
const r = solve(p.dims, p.allClues, undefined, p.lines);
console.log('solve all clues', r.solved, (performance.now() - t).toFixed(1), 'ms');
t = performance.now();
const h = chooseHidden(p, 0.5);
console.log(
  'chooseHidden',
  h ? h.filter(Boolean).length : null,
  (performance.now() - t).toFixed(0),
  'ms',
);
