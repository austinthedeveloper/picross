/**
 * The home screen (#152): one menu for the whole game, in place of the two games' lists
 * and the Flat | Cubed switch between them. The choice of board is made where it matters:
 * Free play's tabs (`#/free/flat`, `#/free/cubed`), and the editor's.
 *
 * It reads only saves, so it never loads three.js or Cubed's chunk (`check:budget` checks).
 * A run in progress, on either board, gets a Continue card on top.
 */
import { getOverallStats } from '../../game/progress';
import { getBlockRun } from '../../game/runSave';
import { getRun } from '../../puzzles/runs';
import { GAME_NAME } from '../../name';
import { el } from '@picross/shared/ui/dom';
import { dailyCard } from './daily';
import { jobsOpen, runBanner } from './run/banner';
import { newBadgeCount } from '../../game/badges';
import { loadRun } from './run/shared';

/** One way in: where it goes, what it's called, and a line on what's there. */
interface Entry {
  href: string;
  icon: string;
  title: string;
  hint: string;
}

const ENTRIES: Entry[] = [
  { href: '#/run', icon: '🗺', title: 'Story', hint: 'Jobs, fights and the crew' },
  { href: '#/free', icon: '🧩', title: 'Free play', hint: 'Every puzzle, Flat and Cubed' },
  {
    href: '#/endless',
    icon: '♾',
    title: 'Endless',
    hint: 'Fights back to back, as deep as you dare',
  },
  { href: '#/badges', icon: '🏅', title: 'Badges', hint: 'What you’ve earned on both boards' },
  { href: '#/editor', icon: '✏', title: 'Editor', hint: 'Make a puzzle and share it' },
  { href: '#/how-to-play', icon: '❓', title: 'How to play', hint: 'The clues, in a minute' },
  { href: '#/settings', icon: '⚙', title: 'Settings', hint: 'Sound, contrast, haptics' },
];

function entry({ href, icon, title, hint }: Entry): HTMLElement {
  return el('a', { className: 'menu-entry', href }, [
    el('span', { className: 'menu-icon', ariaHidden: 'true', textContent: icon }),
    el('span', { className: 'menu-text' }, [
      el('span', { className: 'menu-title', textContent: title }),
      el('span', { className: 'menu-hint', textContent: hint }),
    ]),
  ]);
}

/** Cubed's story run in progress (it saves beside the 2D game's, #155), as a card. */
function blockRunCard(): HTMLElement | null {
  const run = getBlockRun() as {
    runId?: string;
    node?: number;
    hp?: number;
    maxHp?: number;
    status?: string;
  } | null;
  if (run?.status !== 'active' || !run.runId) return null;
  const job = getRun(run.runId);
  if (!job) return null;
  // Cubed's links are its own (cubed/href.ts); the story is at #/cubed/story.
  return el('a', { className: 'run-banner continue', href: '#/cubed/story' }, [
    el('span', { className: 'run-banner-title', textContent: 'Continue on blocks' }),
    el('span', {
      className: 'run-banner-meta',
      textContent: `${job.name} · encounter ${(run.node ?? 0) + 1} of ${job.encounters.length} · HP ${run.hp}/${run.maxHp}`,
    }),
    el('span', { className: 'run-banner-go', ariaHidden: 'true', textContent: '→' }),
  ]);
}

/** The Continue cards: a run in progress on either board. */
function continueCards(): HTMLElement[] {
  const flat = loadRun()?.state.status === 'active' ? runBanner() : null;
  if (flat) flat.classList.add('continue');
  return [flat, blockRunCard()].filter((c): c is HTMLElement => c !== null);
}

/** An entry with what's new on it: how far into the story, and badges not yet seen. */
function live(e: Entry): Entry {
  if (e.href === '#/run') return { ...e, hint: `${e.hint} · ${jobsOpen()}` };
  const fresh = e.href === '#/badges' ? newBadgeCount() : 0;
  return fresh ? { ...e, title: `${e.title} (${fresh} new)` } : e;
}

/** Renders the menu at `#/`. */
export function renderHome(app: HTMLElement): void {
  const cards = continueCards();
  app.replaceChildren(
    el('main', { className: 'screen home' }, [
      el('header', { className: 'topbar' }, [el('h1', { textContent: GAME_NAME })]),
      ...(cards.length
        ? [el('section', { className: 'home-continue', ariaLabel: 'Continue' }, cards)]
        : []),
      dailyCard(),
      // Until the first solve, a way into the rules.
      ...(getOverallStats().solves
        ? []
        : [
            el('a', {
              className: 'how-to-link',
              href: '#/how-to-play',
              textContent: 'New to picross? Learn it in a minute →',
            }),
          ]),
      el(
        'nav',
        { className: 'home-menu', ariaLabel: 'Menu' },
        // The story's entry says how far in you are.
        ENTRIES.map((e) => entry(live(e))),
      ),
    ]),
  );
}
