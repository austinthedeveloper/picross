/** Writes the review site: static HTML, with site.js adding the notes on top. */
import fs from 'node:fs';
import path from 'node:path';
import { isItem, type Entry, type Item, type Page, type Section } from './model';

const ASSETS = path.join(import.meta.dirname, 'assets');

export const escapeHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const noteButton = (label: string) =>
  `<button type="button" class="note-button" aria-label="${escapeHtml(label)}">+ Note</button>`;

function avatar(art?: string): string {
  if (!art) return '<div class="avatar" aria-hidden="true"></div>';
  if (!art.startsWith('art/')) return `<div class="avatar emoji">${escapeHtml(art)}</div>`;
  const fallback = art.startsWith('art/enemies/')
    ? ` onerror="this.onerror=null;this.src='art/enemies/unknown.png'"`
    : '';
  return `<div class="avatar"><img src="${escapeHtml(art)}" alt=""${fallback} loading="lazy" /></div>`;
}

const tag = (text?: string) => (text ? `<span class="tag">${escapeHtml(text)}</span>` : '');

function renderItem(item: Item): string {
  const attrs = `class="item ${item.kind}" data-key="${escapeHtml(item.key)}"`;
  const text = `<p class="text">${escapeHtml(item.text)}</p>`;
  const notes = '<div class="notes"></div>';
  if (item.kind === 'narration') {
    return `<article ${attrs}>
      ${tag(item.tag)}
      <div class="row">${text}${noteButton('Add a note on this narration')}</div>
      ${notes}
    </article>`;
  }
  if (item.kind === 'card') {
    return `<article ${attrs}>
      <div class="row"><div class="bubble">${tag(item.tag)}${text}</div>${noteButton('Add a note on this text')}</div>
      ${notes}
    </article>`;
  }
  if (item.kind === 'choice') {
    const where = item.jump
      ? `<a class="jump" href="#${escapeHtml(item.jump)}">Goes to this branch ↓</a>`
      : '<span class="jump">Ends the scene</span>';
    return `<article ${attrs}>
      <p class="who">${tag('Player choice')}${tag(item.tag)}</p>
      <div class="row">${noteButton('Add a note on this choice')}<div class="bubble">${text}</div></div>
      ${where}
      ${notes}
    </article>`;
  }
  return `<article ${attrs}>
    ${avatar(item.art)}
    <div class="content">
      <p class="who"><strong>${escapeHtml(item.speaker ?? '')}</strong>${tag(item.tag)}</p>
      <div class="row"><div class="bubble">${text}</div>${noteButton(`Add a note on this line from ${item.speaker ?? 'this character'}`)}</div>
      ${notes}
    </div>
  </article>`;
}

const renderEntry = (entry: Entry) =>
  isItem(entry)
    ? renderItem(entry)
    : `<p class="divider" id="${escapeHtml(entry.id)}">${escapeHtml(entry.text)}</p>`;

function renderSection(section: Section): string {
  const head = `<header class="section-head" data-key="${escapeHtml(section.key)}">
      <div class="row">
        ${section.art ? avatar(section.art) : ''}
        <div class="heading">
          <p class="eyebrow">${escapeHtml(section.eyebrow)}</p>
          <h2>${escapeHtml(section.title)}</h2>
          ${section.detail ? `<p class="detail">${escapeHtml(section.detail)}</p>` : ''}
        </div>
        ${noteButton(`Add a note on all of ${section.title}`)}
      </div>
      <div class="notes"></div>
    </header>`;
  return `<section class="section ${section.kind}" id="${escapeHtml(section.id)}">
    ${section.kind === 'lead' ? '' : head}
    <div class="chat">${section.entries.map(renderEntry).join('\n')}</div>
  </section>`;
}

const layout = (title: string, body: string) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="tokens.css" />
    <link rel="stylesheet" href="site.css" />
    <script src="site.js" defer></script>
  </head>
  <body>
    <nav class="topbar" aria-label="Script review">
      <a class="home" href="index.html">Script review</a>
      <a class="notes-link" href="notes.html">Notes <span class="count" data-open-count></span></a>
    </nav>
    <p class="offline" hidden>
      The notes server isn't running, so you can read but not comment. Start it with
      <code>npm run script-review</code>.
    </p>
    <main>${body}</main>
  </body>
</html>
`;

function renderPage(page: Page, prev?: Page, next?: Page): string {
  const link = (other: Page | undefined, rel: string, arrow: string) =>
    other
      ? `<a class="pager-link ${rel}" href="${other.slug}.html"><span>${arrow}</span> ${escapeHtml(other.title)}</a>`
      : '<span></span>';
  return layout(
    `${page.title} · Script review`,
    `<header class="page-head">
      <p class="eyebrow">${escapeHtml(page.eyebrow)}</p>
      <h1>${escapeHtml(page.title)}</h1>
    </header>
    ${page.sections.map(renderSection).join('\n')}
    <nav class="pager" aria-label="Chapters">
      ${link(prev, 'prev', '←')}
      ${link(next, 'next', '→')}
    </nav>`,
  );
}

/** How many pieces of writing a page has, not counting section headings. */
const lineCount = (page: Page) =>
  page.sections.reduce((sum, s) => sum + s.entries.filter(isItem).length, 0);

function renderIndex(pages: Page[]): string {
  const total = pages.reduce((sum, page) => sum + lineCount(page), 0);
  const rows = pages
    .map(
      (page) => `<li>
        <a class="chapter-row" href="${page.slug}.html">
          <span class="chapter-name">
            <span class="eyebrow">${escapeHtml(page.eyebrow)}</span>
            <strong>${escapeHtml(page.title)}</strong>
          </span>
          <span class="chapter-stats">
            <span class="count" data-page-count="${page.slug}"></span>
            <span>${lineCount(page)} lines</span>
          </span>
        </a>
      </li>`,
    )
    .join('\n');
  return layout(
    'Script review',
    `<header class="page-head">
      <p class="eyebrow">${total} lines across ${pages.length} pages</p>
      <h1>Script review</h1>
      <p class="lede">Every line in the game, in play order. Hover a line and choose + Note. Your notes save as you go, and Claude can read them with <code>npm run script-review:notes</code>.</p>
    </header>
    <ol class="chapters">${rows}</ol>`,
  );
}

const renderNotesPage = () =>
  layout(
    'Notes · Script review',
    `<header class="page-head">
      <p class="eyebrow">All pages</p>
      <h1>Notes</h1>
      <p class="lede">Everything you've written, in play order. To hand these over, ask Claude to read your script notes.</p>
    </header>
    <div class="filters" role="group" aria-label="Filter notes">
      <button type="button" data-filter="open" aria-pressed="true">Open</button>
      <button type="button" data-filter="resolved" aria-pressed="false">Resolved</button>
      <button type="button" data-filter="all" aria-pressed="false">All</button>
    </div>
    <div id="notes-list"></div>`,
  );

/** Replaces `outDir` with a freshly generated site. */
export function writeSite(pages: Page[], outDir: string) {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  pages.forEach((page, i) => {
    fs.writeFileSync(
      path.join(outDir, `${page.slug}.html`),
      renderPage(page, pages[i - 1], pages[i + 1]),
    );
  });
  fs.writeFileSync(path.join(outDir, 'index.html'), renderIndex(pages));
  fs.writeFileSync(path.join(outDir, 'notes.html'), renderNotesPage());
  fs.copyFileSync('src/styles/tokens.css', path.join(outDir, 'tokens.css'));
  fs.cpSync(ASSETS, outDir, { recursive: true });
  for (const set of ['cast', 'enemies']) {
    fs.cpSync(path.join('public/art', set), path.join(outDir, 'art', set), { recursive: true });
  }
}
