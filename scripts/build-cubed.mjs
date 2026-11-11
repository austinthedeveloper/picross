#!/usr/bin/env node
/**
 * Builds Picross Cubed (the 3D game, apps/cubed/) for this site and puts it at <out>/3d/,
 * beside the 2D game (apps/picross, which builds into <out>/ itself). VITE_COMBINED tells it
 * it's part of the combined site, so its home screen shows the Flat | Cubed switch.
 *
 *   node scripts/build-cubed.mjs dist
 */
import { execFileSync } from 'node:child_process';
import { cpSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2] ?? 'dist';
execFileSync('npm', ['-w', 'apps/cubed', 'run', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, VITE_COMBINED: '1' },
});
rmSync(join(out, '3d'), { recursive: true, force: true });
cpSync(join('apps', 'cubed', 'dist'), join(out, '3d'), { recursive: true });
console.log(`Picross Cubed built into ${out}/3d/`);
