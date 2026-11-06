// Adds notes to the generated pages. Everything from the notes file goes in as
// text, never HTML.

const API = '/api/notes';
const TAGS = [
  { id: 'change', label: 'Change' },
  { id: 'question', label: 'Question' },
  { id: 'like', label: 'Love it' },
];
const tagLabel = (id) => TAGS.find((t) => t.id === id)?.label ?? id;

let notes = [];
let filter = 'open';

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(props)) {
    if (name.startsWith('data-') || name.startsWith('aria-')) node.setAttribute(name, value);
    else node[name] = value;
  }
  node.append(...children);
  return node;
}

const button = (textContent, onclick, className = '') =>
  el('button', { type: 'button', textContent, onclick, className });

async function request(method, path, body) {
  const response = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'That did not save.');
  notes = data.notes;
  renderNotes();
}

/** Runs a change to a note, keeping any failure visible on the note. */
const attempt = (card, change) =>
  change().catch((error) => {
    card.append(el('p', { className: 'composer-error', textContent: error.message }));
  });

function composer({ key, note, onDone }) {
  let tag = note?.tag ?? 'change';
  const textarea = el('textarea', {
    value: note?.body ?? '',
    placeholder: 'What should change, or what do you think?',
    'aria-label': 'Your note',
  });
  const error = el('span', { className: 'composer-error', role: 'alert' });
  const chips = TAGS.map(({ id, label }) =>
    el('button', {
      type: 'button',
      className: 'chip',
      textContent: label,
      'data-tag': id,
      'aria-pressed': String(id === tag),
      onclick: () => {
        tag = id;
        for (const chip of chips)
          chip.setAttribute('aria-pressed', String(chip.dataset.tag === id));
        textarea.focus();
      },
    }),
  );
  const save = async () => {
    try {
      const body = { tag, body: textarea.value };
      if (note) await request('PATCH', `/${note.id}`, body);
      else await request('POST', '', { ...body, key });
      onDone();
    } catch (failure) {
      error.textContent = failure.message;
    }
  };
  const form = el('form', { className: 'composer' }, [
    el('div', { className: 'chips', role: 'group', 'aria-label': 'Kind of note' }, chips),
    textarea,
    el('div', { className: 'composer-foot' }, [
      el('button', { type: 'submit', className: 'primary', textContent: 'Save' }),
      button('Cancel', onDone, 'secondary'),
      error,
    ]),
  ]);
  form.onsubmit = (event) => {
    event.preventDefault();
    save();
  };
  form.onkeydown = (event) => {
    if (event.key === 'Escape') onDone();
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) save();
  };
  return form;
}

function noteCard(note, { withLine = false } = {}) {
  const card = el('div', {
    className: `note${note.resolved ? ' resolved' : ''}`,
    'data-tag': note.tag,
  });
  const head = el('div', { className: 'note-head' }, [
    el('span', { className: 'note-kind', textContent: tagLabel(note.tag) }),
    el('span', { textContent: new Date(note.createdAt).toLocaleDateString() }),
    ...(note.resolved ? [el('span', { textContent: 'Resolved' })] : []),
  ]);
  card.append(head);

  if (withLine) {
    const line = note.speaker ? `${note.speaker}: ${note.text}` : note.text;
    card.append(
      el('p', { className: 'note-quote' }, [
        note.page
          ? el('a', {
              href: `${note.page}.html#${note.key}`,
              textContent: line,
            })
          : line,
      ]),
    );
  }
  if (note.body) card.append(el('p', { className: 'note-body', textContent: note.body }));
  if (note.status === 'changed') {
    card.append(
      el('p', {
        className: 'note-warning',
        textContent: withLine
          ? `This line has changed. It now reads: ${note.currentText}`
          : `This line has changed since your note. It read: ${note.text}`,
      }),
    );
  }
  if (note.status === 'removed') {
    card.append(el('p', { className: 'note-warning', textContent: 'This line has been removed.' }));
  }
  if (note.resolution) {
    card.append(el('p', { className: 'note-resolution', textContent: note.resolution }));
  }

  const actions = el('div', { className: 'note-actions' });
  const edit = () => card.replaceWith(composer({ note, onDone: () => renderNotes() }));
  const remove = button('Delete', () => {
    remove.textContent = 'Really delete?';
    remove.classList.add('danger');
    remove.onclick = () => attempt(card, () => request('DELETE', `/${note.id}`));
  });
  actions.append(
    button('Edit', edit),
    button(note.resolved ? 'Reopen' : 'Resolve', () =>
      attempt(card, () => request('PATCH', `/${note.id}`, { resolved: !note.resolved })),
    ),
    remove,
  );
  card.append(actions);
  return card;
}

function renderInline() {
  // A version isn't the live script, so notes don't belong on it.
  if (document.body.classList.contains('version')) return;
  for (const target of document.querySelectorAll('[data-key]')) {
    const box = target.querySelector('.notes');
    const open = box.querySelector('.composer.adding');
    const own = notes.filter((n) => n.key === target.dataset.key && n.status !== 'removed');
    box.replaceChildren(...own.map((note) => noteCard(note)), ...(open ? [open] : []));
  }
}

function renderNotesList() {
  const list = document.getElementById('notes-list');
  if (!list) return;
  const shown = notes.filter((note) => {
    if (filter === 'all') return true;
    return filter === 'resolved' ? note.resolved : !note.resolved;
  });
  const parts = [];
  let group;
  for (const note of shown) {
    const title = note.pageTitle ?? 'Lines that no longer exist';
    if (title !== group) {
      group = title;
      parts.push(el('h2', { textContent: title }));
    }
    parts.push(noteCard(note, { withLine: true }));
  }
  if (!parts.length) {
    parts.push(
      el('p', {
        className: 'empty',
        textContent:
          filter === 'open'
            ? 'No open notes. Pick a chapter and start reading.'
            : 'Nothing here yet.',
      }),
    );
  }
  list.replaceChildren(...parts);
}

function renderCounts() {
  const open = notes.filter((n) => !n.resolved);
  for (const badge of document.querySelectorAll('[data-open-count]')) {
    badge.textContent = open.length || '';
  }
  for (const badge of document.querySelectorAll('[data-page-count]')) {
    const count = open.filter((n) => n.page === badge.dataset.pageCount).length;
    badge.textContent = count || '';
    badge.title = count ? `${count} open ${count === 1 ? 'note' : 'notes'}` : '';
  }
}

function renderNotes() {
  renderInline();
  renderNotesList();
  renderCounts();
}

function openComposer(target) {
  const box = target.querySelector('.notes');
  const existing = box.querySelector('.composer.adding');
  if (existing) return existing.querySelector('textarea').focus();
  const form = composer({
    key: target.dataset.key,
    onDone: () => {
      form.remove();
      renderNotes();
    },
  });
  form.classList.add('adding');
  box.append(form);
  form.querySelector('textarea').focus();
}

function goToHash() {
  const key = decodeURIComponent(location.hash.slice(1));
  if (!key) return;
  const target = document.querySelector(`[data-key="${CSS.escape(key)}"]`);
  if (!target) return;
  target.scrollIntoView({ block: 'center' });
  target.classList.remove('flash');
  // Reading the size restarts the animation when the same line is linked twice.
  void target.offsetWidth;
  target.classList.add('flash');
}

document.addEventListener('click', (event) => {
  const trigger = event.target.closest('.note-button');
  if (trigger) openComposer(trigger.closest('[data-key]'));
  const chosen = event.target.closest('[data-filter]');
  if (chosen) {
    filter = chosen.dataset.filter;
    for (const other of document.querySelectorAll('[data-filter]')) {
      other.setAttribute('aria-pressed', String(other === chosen));
    }
    renderNotesList();
  }
});

function openImport(trigger) {
  const panel = trigger.parentElement.querySelector('.import-panel');
  const file = el('input', { type: 'file', accept: '.json,.txt,application/json' });
  const name = el('input', { type: 'text', placeholder: 'bolder-draft', required: true });
  const errors = el('ul', { className: 'import-errors' });
  file.onchange = () => {
    if (!name.value && file.files[0]) name.value = file.files[0].name.replace(/\.[^.]+$/, '');
  };
  const form = el('form', { className: 'composer' }, [
    el('label', {}, ['Rewritten JSON file ', file]),
    el('label', {}, ['Version name ', name]),
    el('p', {
      className: 'detail',
      textContent: "Saves as a draft you can read and compare. It doesn't change the game.",
    }),
    el('div', { className: 'composer-foot' }, [
      el('button', { type: 'submit', className: 'primary', textContent: 'Save version' }),
      button('Cancel', () => (panel.hidden = true), 'secondary'),
    ]),
    errors,
  ]);
  const showErrors = (list) =>
    errors.replaceChildren(...list.map((textContent) => el('li', { textContent })));
  form.onsubmit = async (event) => {
    event.preventDefault();
    if (!file.files[0]) return showErrors(['Choose the file to import.']);
    try {
      const response = await fetch('/api/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.value, document: await file.files[0].text() }),
      });
      const data = await response.json();
      if (!response.ok) return showErrors(data.errors ?? ['That did not import.']);
      location.href = `v-${data.name}.html`;
    } catch (error) {
      showErrors([error.message]);
    }
  };
  panel.replaceChildren(form);
  panel.hidden = false;
  file.focus();
}

function confirmDeleteVersion(trigger) {
  if (!trigger.dataset.armed) {
    trigger.dataset.armed = 'true';
    trigger.textContent = 'Really delete?';
    return;
  }
  fetch(`/api/versions/${encodeURIComponent(trigger.dataset.deleteVersion)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  }).then((response) => {
    if (response.ok) location.href = 'index.html';
    else trigger.textContent = 'That did not delete';
  });
}

document.addEventListener('click', (event) => {
  const importer = event.target.closest('[data-import]');
  if (importer) openImport(importer);
  const remover = event.target.closest('[data-delete-version]');
  if (remover) confirmDeleteVersion(remover);
});

window.addEventListener('hashchange', goToHash);

fetch(API)
  .then((response) => {
    if (!response.ok) throw new Error('No notes server');
    return response.json();
  })
  .then((data) => {
    notes = data.notes;
    renderNotes();
    goToHash();
  })
  .catch(() => {
    document.body.classList.add('read-only');
    document.querySelector('.offline').hidden = false;
    goToHash();
  });
