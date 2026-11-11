import { getSettings, setSectionCollapsed } from '../../game/settings';
import { el } from '@picross/shared/ui/dom';

interface ListSection {
  /** Remembers this section's open state between visits. */
  id: string;
  /** Names the section for screen readers. */
  label: string;
  heading: string;
  count: string;
  content: HTMLElement;
  className?: string;
}

/** A puzzle list section that collapses to its heading. Any number can be open at once. */
export function listSection(section: ListSection): HTMLElement {
  const { id, label, heading, count, content, className } = section;
  const details = el('details', { open: !getSettings().collapsedSections.includes(id) }, [
    el('summary', { className: 'size-summary' }, [
      el('h2', { className: 'size-heading' }, [
        heading,
        el('span', { className: 'size-count', textContent: count }),
      ]),
    ]),
    content,
  ]);
  details.addEventListener('toggle', () => setSectionCollapsed(id, !details.open));
  return el('section', { className: `size-section ${className ?? ''}`.trim(), ariaLabel: label }, [
    details,
  ]);
}
