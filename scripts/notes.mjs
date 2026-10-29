// All navigation is rendered at build time; unreviewed notes stay out of the catalog.
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));

export function notesPages(categories, editions) {
  const entries = editions.filter(n => n.status === 'public' && n.access_verified);
  const groups = categories.map(category => ({
    ...category,
    entries: entries.filter(n => (n.categoryId || n.category) === category.id || (!n.categoryId && n.category === category.title)),
  }));
  for (const entry of entries) {
    if (!groups.some(group => group.entries.includes(entry))) {
      throw new Error(`Public note needs a recognized categoryId: ${entry.title}`);
    }
  }
  const pages = [];
  for (const zh of [false, true]) {
    const root = zh ? '/zh/notes/' : '/notes/';
    const title = zh ? '阅读笔记' : 'Reading Notes';
    const all = zh ? '全部公开笔记' : 'All public notes';
    const topics = zh ? '按主题浏览' : 'Browse by subject';
    const intro = zh ? '政治经济、历史、文学与数学中的阅读与学习记录。' : 'Reading and study notes across political economy, history, literature, and mathematics.';
    const status = zh ? '公开阅读版正在整理中' : 'Reading editions in preparation';
    const scope = zh ? '笔记按主题归类；课程与资料类型见各篇说明。公开阅读版保留完整笔记及来源，提供完整正文与阅读档。' : 'Organized by subject, with course context and document type noted in each edition. Public editions preserve the full notes and their sources with full text and reading files available from the catalog.';
    const label = group => zh ? group.titleZh : group.title;
    const description = group => zh ? group.descriptionZh : group.description;
    const count = n => zh ? `${n} 篇公开笔记` : `${n} public ${n === 1 ? 'note' : 'notes'}`;
    const empty = () => `<div class="notes-empty"><h2>${status}</h2><p>${zh ? '完整笔记将在内容与排版核对后加入目录。' : 'Full notes will be added to the catalog after content and layout review.'}</p></div>`;
    const card = note => `<article class="research-note"><p class="note-meta">${esc(note.type)} · ${esc(note.language)} · ${esc(note.format || "PDF")}</p><h2><a href="${esc(note.href)}">${esc(note.title)}</a></h2><p class="note-abstract">${esc(note.abstract)}</p><p class="note-meta note-edition">${zh ? '阅读版' : 'Reading edition'} · ${esc(note.edition_date)} · <a href="${esc(note.href)}">${note.hosting === 'site' ? (zh ? '阅读全文' : 'Read full note') : (zh ? '在 Google Drive 阅读' : 'Read in Google Drive')} ↗</a>${note.original ? ` · <a href="${esc(note.original)}" download>${zh ? '原始 DOCX' : 'Original DOCX'} ↓</a>` : ''}</p></article>`;
    const list = group => group.entries.length ? `<ul class="notes-list">${group.entries.map(note => `<li><a href="${esc(note.href)}">${esc(note.title)}</a><span>${esc(note.type)} · ${esc(note.language)} · ${esc(note.format || "PDF")}</span></li>`).join('')}</ul>` : `<p class="notes-preparing">${status}</p>`;
    const mdList = group => group.entries.length ? group.entries.map(note => `- [${note.title}](${note.href}) — ${note.type}, ${note.language}, ${note.format || "PDF"}\n  ${note.abstract}`).join('\n') : status;
    const navigation = current => `<nav class="notes-navigation" aria-label="${zh ? '笔记目录' : 'Notes catalog'}"><a href="${root}"${current === 'topics' ? ' aria-current="page"' : ''}>${topics}</a><a href="${root}all/"${current === 'all' ? ' aria-current="page"' : ''}>${all}</a></nav>`;
    const heading = (name, lead) => `<div class="page-head notes-head${zh ? ' cn' : ''}"><p class="eyebrow">${zh ? '阅读与学习' : 'Reading & study'}</p><h1>${esc(name)}</h1><p class="lead">${esc(lead)}</p></div>`;
    const add = (route, name, body, md, description) => pages.push({route, title:name, active:root, body, md, description, lang:zh ? 'zh-CN' : 'en'});

    add(root, title,
      `${heading(title, intro)}${navigation('topics')}<section aria-labelledby="notes-topics"><div class="notes-section-head"><h2 id="notes-topics">${topics}</h2><span>${count(entries.length)}</span></div><div class="notes-topic-grid">${groups.map((group, i) => `<a class="notes-topic" href="${root}${group.id}/"><span class="notes-topic-number" aria-hidden="true">0${i + 1}</span><h3>${esc(label(group))}<span aria-hidden="true">↗</span></h3><p>${esc(description(group))}</p><span class="notes-topic-status">${group.entries.length ? count(group.entries.length) : status}</span></a>`).join('')}</div></section><p class="notes-scope">${scope}</p>`,
      `# ${title}\n\n${intro}\n\n[${all}](${root}all/index.md)\n\n## ${topics}\n\n${groups.map(group => `### [${label(group)}](${root}${group.id}/index.md)\n\n${description(group)}\n\n${group.entries.length ? count(group.entries.length) : status}`).join('\n\n')}\n\n${scope}`, intro);

    add(`${root}all/`, all,
      `${heading(all, zh ? '按主题排列的公开阅读目录。' : 'The public reading catalog, organized by subject.')}${navigation('all')}<nav class="notes-subject-links" aria-label="${zh ? '跳转到主题' : 'Jump to subject'}">${groups.map(group => `<a href="#${group.id}">${esc(label(group))}</a>`).join('')}</nav>${!entries.length ? empty() : ''}${groups.map(group => `<section class="notes-group" id="${group.id}"><div class="notes-section-head"><h2><a href="${root}${group.id}/">${esc(label(group))} <span aria-hidden="true">→</span></a></h2><span>${count(group.entries.length)}</span></div>${list(group)}</section>`).join('')}`,
      `# ${all}\n\n[${topics}](${root}index.md)\n\n${groups.map(group => `## ${label(group)}\n\n${mdList(group)}`).join('\n\n')}`, intro);

    for (const group of groups) {
      add(`${root}${group.id}/`, label(group),
        `<div class="notes-breadcrumb"><a href="${root}">${title}</a><span aria-hidden="true">/</span><span>${esc(label(group))}</span></div>${heading(label(group), description(group))}${navigation(null)}<nav class="notes-subject-links" aria-label="${zh ? '主题导航' : 'Subject navigation'}">${groups.map(other => `<a href="${root}${other.id}/"${other.id === group.id ? ' aria-current="page"' : ''}>${esc(label(other))}</a>`).join('')}</nav><div class="notes-section-head"><h2>${zh ? '阅读目录' : 'Reading catalog'}</h2><span>${count(group.entries.length)}</span></div>${group.entries.length ? group.entries.map(card).join('') : empty()}<p class="notes-scope">${scope}</p>`,
        `# ${label(group)}\n\n[${title}](${root}index.md) · [${all}](${root}all/index.md)\n\n${description(group)}\n\n${mdList(group)}\n\n${scope}`, description(group));
    }
  }
  return pages;
}
