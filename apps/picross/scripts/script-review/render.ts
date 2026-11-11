/** Writes the review site: static HTML, with site.js adding the notes on top. */
import fs from 'node:fs';
import path from 'node:path';
import { isItem, type Entry, type Item, type Page, type Section } from './model';
import { versionPages, type Version, type VersionPage } from './versions';

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

const layout = (title: string, body: string, bodyClass = '') => `<!doctype html>
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
  <body${bodyClass ? ` class="${bodyClass}"` : ''}>
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

/** The export and import buttons. They need the server, so they hide without it. */
const transfer = (scope: string, label: string) => `<div class="transfer">
      <a class="secondary" href="/api/export?page=${scope}" download>${label}</a>
      <button type="button" class="secondary" data-import>Import JSON</button>
      <div class="import-panel" hidden></div>
    </div>`;

const versionUrl = (name: string, slug?: string) => `v-${name}${slug ? `-${slug}` : ''}.html`;

function renderPage(
  page: Page,
  versions: Version[],
  pages: Page[],
  prev?: Page,
  next?: Page,
): string {
  const own = versions.filter((version) =>
    versionPages(pages, version).some((v) => v.page.slug === page.slug),
  );
  const drafts = own.length
    ? `<p class="version-links">Versions: ${own
        .map((v) => `<a href="${versionUrl(v.name, page.slug)}">${escapeHtml(v.name)}</a>`)
        .join(', ')}</p>`
    : '';
  const link = (other: Page | undefined, rel: string, arrow: string) =>
    other
      ? `<a class="pager-link ${rel}" href="${other.slug}.html"><span>${arrow}</span> ${escapeHtml(other.title)}</a>`
      : '<span></span>';
  return layout(
    `${page.title} · Script review`,
    `<header class="page-head">
      <p class="eyebrow">${escapeHtml(page.eyebrow)}</p>
      <h1>${escapeHtml(page.title)}</h1>
      ${transfer(page.slug, 'Export JSON')}
      ${drafts}
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

const versionStatus = (version: Version) =>
  version.appliedAt ? '<span class="tag">Applied</span>' : '<span class="tag">Draft</span>';

function renderIndex(pages: Page[], versions: Version[]): string {
  const versionRows = versions
    .map(
      (version) => `<li>
        <a class="chapter-row" href="${versionUrl(version.name)}">
          <span class="chapter-name"><strong>${escapeHtml(version.name)}</strong></span>
          <span class="chapter-stats">${versionStatus(version)}</span>
        </a>
      </li>`,
    )
    .join('\n');
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
      ${transfer('all', 'Export everything')}
    </header>
    <ol class="chapters">${rows}</ol>
    ${versions.length ? `<h2 class="list-head">Versions</h2><ul class="chapters">${versionRows}</ul>` : ''}`,
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

/** Ids get a prefix so the original's links stay inside the original. */
function renderOriginal(section: Section): string {
  const entries = section.entries.map((entry): Entry => {
    if (!isItem(entry)) return { ...entry, id: `original-${entry.id}` };
    return entry.jump ? { ...entry, jump: `original-${entry.jump}` } : entry;
  });
  return `<details class="original">
    <summary>Show what the game says now</summary>
    <div class="chat">${entries.map(renderEntry).join('\n')}</div>
  </details>`;
}

function renderVersionSection({ section, original }: VersionPage['sections'][number]): string {
  const rendered = renderSection(section);
  if (!original) return rendered;
  return rendered
    .replace(`class="section ${section.kind}"`, `class="section ${section.kind} changed"`)
    .replace(/<\/section>$/, `${renderOriginal(original)}</section>`);
}

const countsLine = ({ changed, added, removed }: VersionPage) =>
  `${changed} changed · ${added} added · ${removed} cut`;

function renderVersionHome(version: Version, touched: VersionPage[]): string {
  const rows = touched
    .map(
      (v) => `<li>
        <a class="chapter-row" href="${versionUrl(version.name, v.page.slug)}">
          <span class="chapter-name">
            <span class="eyebrow">${escapeHtml(v.page.eyebrow)}</span>
            <strong>${escapeHtml(v.page.title)}</strong>
          </span>
          <span class="chapter-stats">${countsLine(v)}</span>
        </a>
      </li>`,
    )
    .join('\n');
  const warnings = version.warnings.length
    ? `<ul class="version-warnings">${version.warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join('')}</ul>`
    : '';
  const next = version.appliedAt
    ? 'This version has been applied to the game.'
    : `This is a draft, and the game doesn't use it. To put it in the game, run <code>npx vite-node scripts/script-review.ts apply ${escapeHtml(version.name)}</code>, or ask Claude to.`;
  return layout(
    `${version.name} · Script review`,
    `<header class="page-head">
      <p class="eyebrow">Version ${version.appliedAt ? '· Applied' : '· Draft'}</p>
      <h1>${escapeHtml(version.name)}</h1>
      <p class="lede">${next}</p>
      ${warnings}
      <div class="transfer"><button type="button" class="secondary" data-delete-version="${escapeHtml(version.name)}">Delete this version</button></div>
    </header>
    <ol class="chapters">${rows}</ol>`,
    'version',
  );
}

function renderVersionPage(
  version: Version,
  view: VersionPage,
  prev?: VersionPage,
  next?: VersionPage,
) {
  const link = (other: VersionPage | undefined, rel: string, arrow: string) =>
    other
      ? `<a class="pager-link ${rel}" href="${versionUrl(version.name, other.page.slug)}"><span>${arrow}</span> ${escapeHtml(other.page.title)}</a>`
      : '<span></span>';
  return layout(
    `${view.page.title} · ${version.name} · Script review`,
    `<header class="page-head">
      <p class="eyebrow">${escapeHtml(view.page.eyebrow)} · Version <a href="${versionUrl(version.name)}">${escapeHtml(version.name)}</a></p>
      <h1>${escapeHtml(view.page.title)}</h1>
      <p class="lede">${countsLine(view)}. <a href="${view.page.slug}.html">Read the current script</a>.</p>
    </header>
    ${view.sections.map(renderVersionSection).join('\n')}
    <nav class="pager" aria-label="Chapters">
      ${link(prev, 'prev', '←')}
      ${link(next, 'next', '→')}
    </nav>`,
    'version',
  );
}

/** Replaces `outDir` with a freshly generated site. */
export function writeSite(pages: Page[], outDir: string, versions: Version[] = []) {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  pages.forEach((page, i) => {
    fs.writeFileSync(
      path.join(outDir, `${page.slug}.html`),
      renderPage(page, versions, pages, pages[i - 1], pages[i + 1]),
    );
  });
  for (const version of versions) {
    const touched = versionPages(pages, version);
    fs.writeFileSync(
      path.join(outDir, versionUrl(version.name)),
      renderVersionHome(version, touched),
    );
    touched.forEach((view, i) => {
      fs.writeFileSync(
        path.join(outDir, versionUrl(version.name, view.page.slug)),
        renderVersionPage(version, view, touched[i - 1], touched[i + 1]),
      );
    });
  }
  fs.writeFileSync(path.join(outDir, 'index.html'), renderIndex(pages, versions));
  fs.writeFileSync(path.join(outDir, 'notes.html'), renderNotesPage());
  fs.copyFileSync('src/styles/tokens.css', path.join(outDir, 'tokens.css'));
  fs.cpSync(ASSETS, outDir, { recursive: true });
  for (const set of ['cast', 'enemies']) {
    fs.cpSync(path.join('public/art', set), path.join(outDir, 'art', set), { recursive: true });
  }
}
