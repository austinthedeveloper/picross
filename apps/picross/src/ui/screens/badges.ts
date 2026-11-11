import { badgeCount, getEarned, nextTierHint } from '../../game/badges';
import { badges, jobBadgeFor, type Badge, type BadgeSection } from '../../puzzles/badges';
import { chapters, type Chapter } from '../../puzzles/chapters';
import { getRun } from '../../puzzles/runs';
import { badgeIcon, hiddenBadgeIcon, tierTag } from '../components/badge';
import { homeLink } from '@picross/shared/ui/components/homeLink';
import { el } from '@picross/shared/ui/dom';
import { chapterOpen, unlocked } from './run/jobsBoard';

/** A badge that names a job or enemy stays hidden until its job is open. */
function visible(badge: Badge): boolean {
  if (getEarned(badge.id) || !badge.opensWith) return true;
  const job = getRun(badge.opensWith);
  return Boolean(job && unlocked(job));
}

const dateLabel = (at: number) =>
  new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

/**
 * One badge on the shelf. Everything an icon shows is also said in text. `chapter`
 * labels a job's badge with where it comes from.
 */
function badgeCard(badge: Badge, chapter?: string): HTMLElement {
  const kicker = chapter ? [el('span', { className: 'badge-kicker', textContent: chapter })] : [];
  if (!visible(badge)) {
    return el('li', { className: 'badge-card hidden-badge' }, [
      hiddenBadgeIcon(),
      el('div', { className: 'badge-text' }, [
        ...kicker,
        el('strong', { className: 'badge-name', textContent: '???' }),
        el('span', { className: 'badge-how', textContent: 'Keep going to find this one.' }),
      ]),
    ]);
  }
  const earned = getEarned(badge.id);
  const hasTiers = badge.rule.kind === 'job';
  const status: (HTMLElement | string)[] = [];
  if (earned?.tier) status.push(tierTag(earned.tier));
  else if (earned) status.push(el('span', { className: 'badge-tier', textContent: 'Earned' }));
  else status.push(el('span', { className: 'badge-tier none', textContent: 'Not earned yet' }));
  if (earned?.at) {
    status.push(el('span', { className: 'badge-date', textContent: dateLabel(earned.at) }));
  }
  return el('li', { className: `badge-card${earned ? ' earned' : ''}` }, [
    badgeIcon(badge, { earned: Boolean(earned), tier: earned?.tier }),
    el('div', { className: 'badge-text' }, [
      ...kicker,
      el('strong', { className: 'badge-name', textContent: badge.name }),
      el('span', {
        className: 'badge-how',
        textContent: hasTiers ? nextTierHint(earned) : badge.description,
      }),
      el('div', { className: 'badge-status' }, status),
    ]),
  ]);
}

function shelf(title: string, cards: HTMLElement[]): HTMLElement {
  return el('section', { className: 'badge-shelf', ariaLabel: title }, [
    el('h2', { className: 'chapter-title', textContent: title }),
    el('ul', { className: 'badge-list' }, cards),
  ]);
}

/** A chapter's job badges, labeled with the chapter unless it would spoil it. */
function chapterCards(chapter: Chapter): HTMLElement[] {
  const label = `Chapter ${chapter.number} · ${chapterOpen(chapter) ? chapter.title : '???'}`;
  return chapter.jobs.flatMap((job) => {
    const badge = jobBadgeFor(job.id);
    return badge ? [badgeCard(badge, label)] : [];
  });
}

const OTHER_SHELVES: [BadgeSection, string][] = [
  ['mastery', 'Know-how'],
  ['losses', 'Bad days'],
  ['endless', 'Endless'],
  ['daily', 'Daily'],
];

/** The badge shelf at #/badges (#109): everything earned, and what's left to earn. */
export function renderBadgesScreen(app: HTMLElement): void {
  const { earned, total } = badgeCount();
  app.replaceChildren(
    el('main', { className: 'screen badges' }, [
      el('header', { className: 'topbar' }, [homeLink(), el('h1', { textContent: 'Badges' })]),
      el('p', { className: 'run-meta', textContent: `${earned} of ${total} earned` }),
      shelf('The story', chapters.flatMap(chapterCards)),
      ...OTHER_SHELVES.map(([section, title]) =>
        shelf(
          title,
          badges.filter((b) => b.section === section).map((b) => badgeCard(b)),
        ),
      ),
    ]),
  );
}
