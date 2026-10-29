import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const markdownText = b => b.html.replace(/<sup><a[^>]*>(\d+)<\/a><\/sup>/g,'[^$1]').replace(/<br>/g,'\n').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#x27;/g,"'");

export async function poeticsPages(root) {
  const dir = path.join(root, 'content/poetics');
  const editions = await Promise.all((await readdir(dir)).filter(f=>f.endsWith('.json')).map(async f=>JSON.parse(await readFile(path.join(dir,f),'utf8'))));
  return editions.flatMap(e => [false,true].map(zh => {
    const prefix = zh ? '/zh' : '';
    const toc = e.blocks.filter(b=>b.kind==='h2').map((b,i)=>`<li><a href="#section-${i}">${esc(b.text)}</a></li>`).join('');
    let section = 0;
    const body = e.blocks.map(b=>b.kind==='image' ? `<figure><img src="${esc(b.src)}" alt="${esc(b.alt)}"><figcaption>${esc(b.alt)}</figcaption></figure>` : b.kind==='h2' ? `<h2 id="section-${section++}">${b.html}</h2>` : `<p>${b.html}</p>`).join('\n');
    const footnotes = e.footnotes.length ? `<section class="poetics-footnotes"><h2>${zh?'腳注':'Notes'}</h2><ol>${e.footnotes.map(n=>`<li id="fn-${n.id}" value="${n.id}">${esc(n.text)} <a href="#ref-${n.id}" aria-label="${zh?'返回正文':'Back to text'}">↩</a></li>`).join('')}</ol></section>` : '';
    const route = `${prefix}/notes/poetics/${e.id}/`;
    return { route, title:e.title, lang:zh?'zh-CN':'en', description:e.abstract,
      body:`<div class="notes-breadcrumb"><a href="${prefix}/notes/">${zh?'筆記':'Notes'}</a><span>/</span><a href="${prefix}/notes/poetics-comparative-literature/">${zh?'詩學與比較文學':'Poetics and Comparative Literature'}</a></div><div class="page-head poetics-head"><p class="eyebrow">Green Wang · CHINESE 230 · ${zh?'課程講義':'Seminar handout'}</p><h1>${esc(e.title)}</h1><p class="lead">${esc(e.abstract)}</p><a href="/notes/poetics/${e.id}.pdf">${zh?'下載完整 PDF':'Download full PDF'} ↓</a></div><div class="poetics-layout"><nav class="poetics-toc" aria-label="${zh?'本文目錄':'On this page'}"><p class="eyebrow">${zh?'本文目錄':'On this page'}</p><ol>${toc}</ol></nav><article class="poetics-body" lang="zh-Hant"><p class="poetics-editorial">${esc(e.editorial_note)}</p>${body}${footnotes}<p class="poetics-editorial">${esc(e.attribution_note)}</p><p class="note-meta">Reading edition · ${e.edition_date}</p></article></div>`,
      md:`# ${e.title}\n\nGreen Wang · CHINESE 230\n\n[PDF](/notes/poetics/${e.id}.pdf)\n\n${e.editorial_note}\n\n${e.blocks.map(b=>b.kind==='image'?`![${b.alt}](${b.src})`:(b.kind==='h2'?'## ':'')+markdownText(b)).join('\n\n')}\n\n## 腳注\n\n${e.footnotes.map(n=>`[^${n.id}]: ${n.text}`).join('\n\n')}\n\n${e.attribution_note}` };
  }));
}
