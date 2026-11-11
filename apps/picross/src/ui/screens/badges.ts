import {
  badgeCount,
  currentCount,
  getEarned,
  isNew,
  markBadgesSeen,
  nextStep,
  nextTierHint,
  syncBadges,
} from '../../game/badges';
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

/** How to earn it, or the next tier: what the card says under the name. */
function howTo(badge: Badge): string {
  const { rule } = badge;
  if (rule.kind === 'job') return nextTierHint(getEarned(badge.id));
  if (rule.kind !== 'count') return badge.description;
  return `${badge.description} ${nextStep(badge, currentCount(rule.count))}.`;
}

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
  const status: (HTMLElement | string)[] = [];
  if (earned?.tier) status.push(tierTag(earned.tier));
  else if (earned) status.push(el('span', { className: 'badge-tier', textContent: 'Earned' }));
  else status.push(el('span', { className: 'badge-tier none', textContent: 'Not earned yet' }));
  if (isNew(badge.id)) status.push(el('span', { className: 'badge-new', textContent: 'New!' }));
  if (earned?.at) {
    status.push(el('span', { className: 'badge-date', textContent: dateLabel(earned.at) }));
  }
  return el('li', { className: `badge-card${earned ? ' earned' : ''}` }, [
    badgeIcon(badge, { earned: Boolean(earned), tier: earned?.tier }),
    el('div', { className: 'badge-text' }, [
      ...kicker,
      el('strong', { className: 'badge-name', textContent: badge.name }),
      el('span', { className: 'badge-how', textContent: howTo(badge) }),
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

const cardsIn = (section: BadgeSection) =>
  badges.filter((b) => b.section === section).map((b) => badgeCard(b));

/** The shelves after the story's, in order (#157: both boards' badges, on one shelf). */
const OTHER_SHELVES: [BadgeSection, string][] = [
  ['flat', 'Free play · Flat'],
  ['cubed', 'Free play · Cubed'],
  ['daily', 'Daily'],
  ['endless', 'Endless'],
  ['mastery', 'Know-how'],
  ['losses', 'Bad days'],
  ['both', 'Both boards'],
];

/**
 * The badge shelf at #/badges (#109): everything earned on either board, and what's left
 * to earn. Opening it marks what's new as seen.
 */
export function renderBadgesScreen(app: HTMLElement): void {
  // Anything the saves show that a screen didn't award as it happened.
  syncBadges();
  const { earned, total } = badgeCount();
  app.replaceChildren(
    el('main', { className: 'screen badges' }, [
      el('header', { className: 'topbar' }, [homeLink(), el('h1', { textContent: 'Badges' })]),
      el('p', { className: 'run-meta', textContent: `${earned} of ${total} earned` }),
      shelf('The story', [...chapters.flatMap(chapterCards), ...cardsIn('story')]),
      ...OTHER_SHELVES.map(([section, title]) => shelf(title, cardsIn(section))),
    ]),
  );
  markBadgesSeen();
}
