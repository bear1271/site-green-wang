import { readFile, writeFile, mkdir, cp, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { notesPages } from "./notes.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "dist");
const p = JSON.parse(await readFile(path.join(root, "content/profile.json"), "utf8"));
const publicNotes = JSON.parse(await readFile(path.join(root, "content/public-note-editions.json"), "utf8"));
const notesCategories = JSON.parse(await readFile(path.join(root, "content/notes-categories.json"), "utf8"));
const origin = (process.env.SITE_ORIGIN || "http://127.0.0.1:4173").replace(/\/$/, "");
const basePath = (process.env.SITE_BASE || "").replace(/\/$/, "");
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const json = (v) => JSON.stringify(v, null, 2).replace(/</g, "\\u003c");
const url = (route) => `${origin}${basePath}${route}`;
const dateLabel = "26 September 2026";
const pages = [];
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
const privateNoteRoots = ["html", "library"].map(name => path.join(root, "public", "notes", name));
await cp(path.join(root, "public"), out, { recursive: true, filter: source => !privateNoteRoots.some(dir => source === dir || source.startsWith(dir + path.sep)) });
async function save(file, content) {
  const target = path.join(out, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
}
const person = {
  "@type": "Person",
  "@id": url("/#person"),
  name: p.name,
  alternateName: p.alternateNames,
  url: url("/"),
  description: p.bio,
  email: `mailto:${p.email}`,
  affiliation: { "@type": "CollegeOrUniversity", name: p.institution },
  knowsAbout: p.interests,
};
function shell(title, route, active, body, description = p.bio, lang = "en", extra = null) {
  const zh = lang === "zh-CN";
  const peer = zh ? (route === "/zh/" ? "/" : route.replace(/^\/zh/, "")) : (route === "/" || route === "/404.html" ? "/zh/" : route === "/about/zh/" ? "/about/" : `/zh${route}`);
  const entity = extra || { "@type": "WebPage", "@id": url(route), name: title, about: { "@id": url("/#person") }, dateModified: p.updated };
  const schema = { "@context": "https://schema.org", "@graph": [person, entity] };
  const nav = (zh ? [
    ["首页", "/zh/"], ["研究", "/zh/research/"], ["笔记", "/zh/notes/"],
    ["近况", "/zh/live/"], ["关于 / 简历", "/zh/about/"],
  ] : [
    ["Home", "/"], ["Research", "/research/"], ["Notes", "/notes/"],
    ["Live", "/live/"], ["About / CV", "/about/"],
  ])
    .map(([label, href]) => `<a href="${href}"${active === href ? ' aria-current="page"' : ""}>${label}</a>`)
    .join("");
  return `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · ${esc(p.shortName)}</title><meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#f8f7f3"><link rel="canonical" href="${url(route)}">
<meta property="og:title" content="${esc(title)} · ${esc(p.shortName)}"><meta property="og:description" content="${esc(description)}"><meta property="og:type" content="website"><meta property="og:url" content="${url(route)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/style.css">
<link rel="alternate" hreflang="${zh ? "en" : "zh-CN"}" href="${url(peer)}"><link rel="alternate" hreflang="${zh ? "zh-CN" : "en"}" href="${url(route)}">
<link rel="alternate" type="application/json" href="/profile.json" title="Structured profile">${route === "/404.html" ? "" : `<link rel="alternate" type="text/markdown" href="${route === "/" ? "/index.md" : route + "index.md"}" title="Markdown version">`}
<script type="application/ld+json">${json(schema)}</script></head>
<body><a class="skip" href="#main">${zh ? "跳转到正文" : "Skip to content"}</a><div class="container">
<header class="header"><a class="brand" href="${zh ? "/zh/" : "/"}">Green Wang<span aria-hidden="true"> / </span></a><div class="header-actions"><nav aria-label="${zh ? "主导航" : "Main navigation"}">${nav}</nav><a class="language-switch" href="${peer}" lang="${zh ? "en" : "zh-CN"}" aria-label="${zh ? "Read this page in English" : "阅读此页的中文版"}">${zh ? "EN" : "中文"}</a></div></header>
<main id="main">${body}</main>
<footer class="footer"><span>© 2026 ${esc(p.name)} <span aria-hidden="true">·</span> ${zh ? "更新于" : "Updated"} <time datetime="${p.updated}">${zh ? "2026 年 9 月 26 日" : "26 Sep 2026"}</time></span><div class="footer-links"><a href="${zh ? "/zh/about/" : "/about/zh/"}">${zh ? "关于我" : "中文简介"}</a><a href="${zh ? "/zh/for-agents/" : "/for-agents/"}">${zh ? "站点资料" : "Site data"}</a><a href="mailto:${esc(p.email)}">Email ↗</a></div></footer>
</div></body></html>`.replaceAll('href="/', `href="${basePath}/`).replaceAll('src="/', `src="${basePath}/`);
}
async function page(route, title, active, body, md, description, lang, schema) {
  const dir = route === "/" ? "" : route.slice(1);
  await save(`${dir}index.html`, shell(title, route, active, body, description, lang, schema));
  await save(`${dir}index.md`, md + `\n\nContent updated: ${p.updated}.\n`);
  pages.push({ route, title });
}
function work(x) {
  return `<article class="work"><div class="work-meta"><span>${esc(x.period)}</span><span>${esc(x.type)}</span></div><div><h3><a href="/research/${x.id}/">${esc(x.title)}</a></h3><p>${esc(x.description)}</p><span class="tag">${esc(x.area)}</span></div><span class="arrow" aria-hidden="true">↗</span></article>`;
}
function ongoingWork(x) {
  return `<article class="work"><div class="work-meta"><span>${esc(x.period)}</span><span>In progress</span></div><div><h3><a href="/research/${x.id}/">${esc(x.title)}</a></h3><p>${esc(x.description)}</p><span class="tag">${esc(x.type)} · Abstract coming soon</span></div><span class="arrow" aria-hidden="true">↗</span></article>`;
}
const ongoingMd = p.ongoingProjects
  .map(
    (x) =>
      `- [${x.title}](/research/${x.id}/index.md) — ${x.type}, ${x.period}. ${x.description} Topic and mentor not yet determined. ${x.availability}`
  )
  .join("\n");
const trainingMd = `## Academic training\n${p.training.summary}\n\n### In progress — Fall 2026\n${p.training.inProgress.map((c) => `- ${c.code}: ${c.title} (${c.term}; in progress)`).join("\n")}\n\n### Selected completed coursework\n${p.training.completed.map((c) => `- ${c.code}: ${c.title} (${c.term}; completed)`).join("\n")}`;
const trainingHtml = `<h2>Academic training</h2><p>${esc(p.training.summary)}</p><h3 class="training-label">In progress · Fall 2026</h3><ul class="course-list">${p.training.inProgress.map((c) => `<li><span>${esc(c.code)}</span><div>${esc(c.title)}</div></li>`).join("")}</ul><details class="completed-courses"><summary>Selected completed coursework</summary><ul class="course-list">${p.training.completed.map((c) => `<li><span>${esc(c.code)}</span><div>${esc(c.title)}<small>${esc(c.term)}</small></div></li>`).join("")}</ul></details>`;
const projectsMd = p.projects
  .map((x) => `- [${x.title}](/research/${x.id}/index.md) — ${x.type}, ${x.period}. ${x.description} ${x.availability}`)
  .join("\n");
const lens = `<aside class="lens" aria-label="Current lines of inquiry"><p class="lens-title">Current questions</p><p class="lens-focus">What can an institution make possible?</p><p class="lens-focus">How does it shape what people think made that possible?</p><p class="lens-caption">Productive capacity<br>Interpretive capacity</p></aside>`;
await page(
  "/",
  "Political economy & applied mathematics",
  "/",
  `
<section class="hero"><div><p class="eyebrow">University of California, Berkeley</p><h1>Green Wang<br><span>(Sirun Wang)</span></h1><p class="intro">${esc(p.bio)}</p><div class="hero-links"><a class="text-link" href="/research/">Explore research <span aria-hidden="true">↗</span></a><a class="text-link" href="/about/">About & CV</a><a class="text-link" href="mailto:${esc(p.email)}">Email <span aria-hidden="true">↗</span></a></div></div><div class="hero-side"><img class="portrait" src="/bear.png" alt="A teddy bear in a blue sweater, seen from behind in warm lamplight" width="180" height="180">${lens}</div></section>
<section class="section" aria-labelledby="selected"><div class="section-head"><h2 id="selected">In progress</h2><a class="text-link" href="/research/">All research ↗</a></div>${p.ongoingProjects.map(ongoingWork).join("")}</section>
<section class="bottom-grid"><div class="now"><p class="eyebrow">Current interests</p><p>${esc(p.currentFocus)}</p><a class="text-link" href="/notes/">Reading notes ↗</a></div><div class="contact"><h2>Start a conversation.</h2><p>I welcome conversations about ${esc(p.contactTopics)}.</p><a href="mailto:${esc(p.email)}">${esc(p.email)} ↗</a></div></section>`,
  `# ${p.name}\n\n${p.bio}\n\n## In progress\n${ongoingMd}\n\n## Contact\n${p.email}\n\n[About and CV](/about/index.md) · [Research](/research/index.md) · [Notes](/notes/index.md) · [Agent guide](/for-agents/index.md)`,
  p.bio
);

await page(
  "/research/",
  "Research",
  "/research/",
  `
<div class="page-head"><p class="eyebrow">Questions, contexts & work</p><h1>Research</h1><p class="lead">${esc(p.researchLead)}</p></div>
<p class="research-intro">${esc(p.approach)}</p>
<div class="question-grid">${p.questions.map((q, i) => `<div><div class="question-number">0${i + 1}</div><h3>${esc(q.title)}</h3><p>${esc(q.question)}</p></div>`).join("")}</div>
<section class="section"><div class="section-head"><h2>In progress</h2><span class="tag">Fall 2026</span></div>${p.ongoingProjects.map(ongoingWork).join("")}</section>
<section class="section page-bottom"><div class="section-head"><h2>Selected course research</h2><span class="tag">2026</span></div>${p.projects.map(work).join("")}<p style="font-size:12px;color:var(--muted);margin-top:28px">These entries describe course research. Full manuscripts are not included in this edition.</p></section>`,
  `# Research\n\n${p.approach}\n\n## Questions\n${p.questions.map((q) => `- ${q.question}`).join("\n")}\n\n## In progress\n${ongoingMd}\n\n## Previous course research\n${projectsMd}\n\nThese entries are not presented as peer-reviewed publications.`
);

for (const x of p.ongoingProjects) {
  const route = `/research/${x.id}/`;
  await page(
    route,
    x.title,
    "/research/",
    `
<div class="page-head"><a class="back" href="/research/">← Research</a><p class="eyebrow" style="margin-top:28px">${esc(x.type)} · ${esc(x.period)}</p><h1>${esc(x.title)}</h1><p class="lead">${esc(x.description)}</p></div>
<article class="article"><dl class="details"><dt>Course</dt><dd>${esc(x.courseCode)} · ${esc(x.courseTitle)}</dd><dt>Stage</dt><dd>${esc(x.status)}</dd><dt>Paper topic</dt><dd>Not yet determined</dd><dt>Mentor</dt><dd>Not yet confirmed</dd></dl><div class="notice"><strong>Abstract coming soon.</strong><br>The topic is being developed. A title and abstract will be added once the research question is defined.</div><p style="margin-top:24px;font-size:13px;color:var(--muted)">The heading identifies the area of coursework, rather than a finalized paper title.</p><div class="tools"><a href="${route}index.md">Read as Markdown ↗</a><a href="/research.json">Research metadata ↗</a></div></article>`,
    `# ${x.title}\n\n${x.titleStatus}.\nType: ${x.type}\nPeriod: ${x.period}\nCourse: ${x.courseCode} — ${x.courseTitle}\nStage: ${x.status}\nPaper topic: not yet determined\nMentor: not yet confirmed\nPublication status: ${x.publicationStatus}\n\n${x.description}\n\n${x.availability}\nA title and abstract will be added once the research question is defined.`,
    x.description,
    "en",
    { "@type": "WebPage", "@id": url(route), name: x.title, description: x.description, about: { "@id": url("/#person") }, dateModified: p.updated }
  );
}

for (const x of p.projects) {
  const route = `/research/${x.id}/`;
  const md = `# ${x.title}\n\nAuthor: ${p.name}\nType: ${x.type}\nPeriod: ${x.period}\nPublication status: ${x.publicationStatus}\nAvailability: ${x.availability}\n\n## Question\n${x.question}\n\n## Scope\n${x.description}\n\n${x.scope}\n\n## Course context\n${x.context}\nInstructor: ${x.instructor}\n\n## About this summary\n${x.sourceNote}`;
  await page(
    route,
    x.shortTitle,
    "/research/",
    `
<div class="page-head"><a class="back" href="/research/">← Research</a><p class="eyebrow" style="margin-top:28px">${esc(x.type)} · ${esc(x.period)}</p><h1>${esc(x.title)}</h1><p class="lead">${esc(x.description)}</p></div>
<article class="article"><dl class="details"><dt>Context</dt><dd>${esc(x.context)}</dd><dt>Instructor</dt><dd>${esc(x.instructor)}</dd><dt>Period</dt><dd>${esc(x.period)}</dd><dt>Work type</dt><dd>${esc(x.type)}</dd></dl><h2>The question</h2><p class="lead">${esc(x.question)}</p><h2>Scope</h2><p>${esc(x.scope)}</p><h2>About this summary</h2><p>${esc(x.sourceNote)}</p><div class="notice">${esc(x.availability)}</div><div class="tools"><a href="${route}index.md">Read as Markdown ↗</a><a href="/research.json">Research metadata ↗</a></div></article>`,
    md,
    x.description,
    "en",
    {
      "@type": "CreativeWork",
      "@id": url(route),
      name: x.title,
      description: x.description,
      author: { "@id": url("/#person") },
      genre: x.type,
      dateModified: p.updated,
      creativeWorkStatus: "Course research; summary only",
      url: url(route),
    }
  );
}
for (const notePage of notesPages(notesCategories, publicNotes)) {
  await page(notePage.route, notePage.title, notePage.active, notePage.body, notePage.md, notePage.description, notePage.lang);
}

await page(
  "/live/",
  "Live",
  "/live/",
  `
<div class="page-head"><p class="eyebrow">A space in progress</p><h1>Live</h1><p class="lead">This section is taking shape.</p></div><article class="article"><p>More to come.</p></article>`,
  `# Live\n\nThis section is taking shape. More to come.`,
  "A space in progress. More to come."
);

await page(
  "/about/",
  "About & CV",
  "/about/",
  `
<div class="page-head"><p class="eyebrow">Background & academic work</p><h1>About & CV</h1><p class="lead">${esc(p.name)}</p></div>
<div class="about-grid"><article class="article"><p class="lead">${esc(p.bio)}</p><p>${esc(p.approach)}</p><div class="tools"><a class="download" href="/cv.pdf" download="Green-Wang-CV.pdf">Download short CV <span>↓ PDF</span></a><a href="/about/zh/" lang="zh-CN">中文简介 ↗</a></div>
<h2>Education</h2><div class="cv-entry"><h3>${esc(p.institution)}</h3><p>Undergraduate · Political Economy & Applied Mathematics</p></div>
<h2>Research interests</h2><p>${p.interests.map(esc).join(" · ")}</p>
${trainingHtml}
<h2>Course papers in progress</h2>${p.ongoingProjects.map(ongoingWork).join("")}
<h2>Selected course research</h2>${p.projects.map((x) => `<div class="cv-entry"><div class="cv-date">${esc(x.period)} · ${esc(x.type)}</div><h3><a href="/research/${x.id}/">${esc(x.title)}</a></h3><p>${esc(x.description)}</p><p>${esc(x.context)} · Instructor: ${esc(x.instructor)}</p></div>`).join("")}
<p style="font-size:12px;color:var(--muted);margin-top:26px">The CV includes selected academic training, course papers in development, and previous course research.</p></article><aside><img class="about-portrait" src="/bear.png" alt="A teddy bear in a blue sweater, seen from behind in warm lamplight" width="180" height="180"><p class="eyebrow">At a glance</p><p>UC Berkeley<br>Undergraduate</p><p>Political Economy<br>Applied Mathematics</p><p class="eyebrow" style="margin-top:35px">Contact</p><a href="mailto:${esc(p.email)}">${esc(p.email)}</a><p class="eyebrow" style="margin-top:35px">Updated</p><time datetime="${p.updated}">${dateLabel}</time></aside></div>`,
  `# About & CV — ${p.name}\n\n${p.bio}\n\n${p.approach}\n\n## Education\n${p.institution}\nUndergraduate, studying ${p.studies.join(" and ")}.\n\n## Research interests\n${p.interests.join("; ")}\n\n${trainingMd}\n\n## Course papers in progress\n${ongoingMd}\n\n## Previous course research\n${projectsMd}\n\n## Contact\n${p.email}\n\n[Short CV PDF](/cv.pdf)`,
  p.bio,
  "en",
  { "@type": "ProfilePage", "@id": url("/about/"), name: `About ${p.name}`, mainEntity: { "@id": url("/#person") }, dateModified: p.updated }
);

const zhApproachHtml = p.approachZh.split("\n\n").map((paragraph) => `<p>${esc(paragraph)}</p>`).join("");
const zhAboutBody = `<div class="page-head cn"><p class="eyebrow">背景与学术训练</p><h1>关于我</h1><p class="lead">${esc(p.name)}</p></div><div class="about-grid cn"><article class="article"><p class="lead">${esc(p.bioZh)}</p>${zhApproachHtml}<div class="tools"><a class="download" href="/cv.pdf">英文简历 ↓ PDF</a><a href="mailto:${esc(p.email)}">联系我 ↗</a></div><h2>教育背景</h2><p>加州大学伯克利分校，本科；主修政治经济与应用数学。</p><h2>研究兴趣</h2><p>制度政治经济学 · 生产能力与解释能力 · 信念形成与形式理论</p><h2>正在进行的课程论文</h2><p>2026 年秋季，我正在开展两篇 PhD-level 课程论文：<a href="/zh/research/formal-theory/">形式理论</a>与<a href="/zh/research/capitalism-institutions/">资本主义的经济制度</a>，均尚在选题阶段。具体题目和指导教师尚未确定；摘要将于研究问题明确后补充。</p><h2>学术训练</h2><p>已修课程覆盖定量微观经济学、概率、多元微积分、离散数学，以及古典政治经济学、世界史和中国文学史。当前课程还包括计量经济学与分析导论。</p><h2>此前的课程研究</h2><p><a href="/zh/research/bangladesh-1991/">孟加拉国 1991 年的新自由主义转向</a>：关注市场导向政策转型及政党—国家制度。</p><p><a href="/zh/research/manila-trade/">1589—1603 年马尼拉的中国—西班牙贸易</a>：从非欧洲中心的视角理解近代早期亚洲海上贸易。</p><p>以上均为 2026 年春季课程研究，网站仅提供项目摘要。</p></article><aside><img class="about-portrait" src="/bear.png" alt="暖光中背对镜头的蓝衣玩偶熊" width="180" height="180"><p class="eyebrow">简介</p><p>UC Berkeley<br>本科生</p><p>政治经济<br>应用数学</p><p class="eyebrow">联系</p><a href="mailto:${esc(p.email)}">${esc(p.email)}</a></aside></div>`;

await page(
  "/about/zh/",
  "中文简介",
  "/zh/about/",
  `
${zhAboutBody}`,
  `# ${p.name} — 中文简介\n\n${p.bioZh}\n\n${p.approachZh}\n\n## 教育背景\n加州大学伯克利分校，本科；主修政治经济与应用数学。\n\n## 研究兴趣\n制度政治经济学；生产能力与解释能力；信念形成与形式理论。\n\n## 正在进行的课程论文\n形式理论与资本主义的经济制度，均尚在选题阶段。\n\n## 学术训练\n已修课程覆盖定量微观经济学、概率、多元微积分、离散数学，以及古典政治经济学、世界史和中国文学史。当前课程还包括计量经济学与分析导论。\n\n## 此前的课程研究\n孟加拉国 1991 年的新自由主义转向；1589—1603 年马尼拉的中国—西班牙贸易。均为 2026 年春季课程研究，仅提供摘要。\n\n联系：${p.email}`,
  p.bioZh,
  "zh-CN"
);

await page(
  "/for-agents/",
  "For agents",
  null,
  `
<div class="page-head"><p class="eyebrow">Plain text & structured information</p><h1>For agents</h1><p class="lead">A small, readable index of this website.</p></div><article class="article"><p>The HTML pages contain their full text without requiring JavaScript. Equivalent Markdown pages and structured records are linked below.</p><table class="agent-table"><thead><tr><th>Resource</th><th>Contents</th></tr></thead><tbody><tr><td><a href="/llms.txt">llms.txt</a></td><td>A curated guide to this site</td></tr><tr><td><a href="/profile.json">profile.json</a></td><td>Public identity, studies, interests and contact</td></tr><tr><td><a href="/research.json">research.json</a></td><td>Project summaries, types and availability</td></tr><tr><td><a href="/index.md">index.md</a></td><td>Homepage as Markdown</td></tr><tr><td><a href="/sitemap.xml">sitemap.xml</a></td><td>Page addresses</td></tr></tbody></table><h2>Reading the record accurately</h2><p>${esc(p.name)} is an undergraduate at UC Berkeley, studying political economy and applied mathematics. Research interests describe topics of inquiry, not a claim of established expertise.</p><p>Two PhD-level course papers are in topic development in Fall 2026; topics and mentors are not yet confirmed. The two earlier selected projects are course research from Spring 2026. Their full manuscripts are not hosted here, and these entries should not be described as peer-reviewed publications. Notes contains selected study guides and open questions, not publications or research findings.</p><p>The update date indicates when this edition was prepared. It is not a claim that all past experiences were independently reverified on that date.</p><h2>Scope</h2><p>These files describe only the public content of this site. No private CV source files, personal identifiers, or application records are included.</p><p>The <a href="https://llmstxt.org/">llms.txt convention</a> provides an optional reading guide. It does not control an agent’s access permissions or guarantee how an agent uses this website.</p></article>`,
  `# Agent guide\n\nAll main pages are static HTML and have index.md equivalents.\n\n- [Profile](/profile.json)\n- [Research](/research.json)\n- [Home](/index.md)\n- [About](/about/index.md)\n- [Notes](/notes/index.md)\n\nIdentity: ${p.name}, undergraduate at UC Berkeley studying political economy and applied mathematics.\n\nTwo PhD-level course papers are in topic development in Fall 2026, with topics and mentors not yet determined. The two earlier projects are course research from Spring 2026, not listed as publications. Manuscripts are not hosted. Notes contains selected study guides and open questions, not research findings. Update date is edition preparation date, not independent reverification of every fact.\n\nOnly public-site content is exposed. No private source files are served.\n\nllms.txt is an optional convention, not an access-control or guaranteed-discovery mechanism.`
);

await page("/zh/", "首页", "/zh/", `<section class="hero cn"><div><p class="eyebrow">加州大学伯克利分校</p><h1>Green Wang<br><span>(Sirun Wang)</span></h1><p class="intro">${esc(p.bioZh)}</p><div class="hero-links"><a class="text-link" href="/zh/research/">研究方向 ↗</a><a class="text-link" href="/zh/about/">关于我与简历</a><a class="text-link" href="mailto:${esc(p.email)}">联系 ↗</a></div></div><div class="hero-side"><img class="portrait" src="/bear.png" alt="暖光中背对镜头的蓝衣玩偶熊" width="180" height="180"><aside class="lens"><p class="lens-title">目前的问题</p><p class="lens-focus">制度如何形成生产能力？</p><p class="lens-focus">人们又如何理解这种能力的来源？</p><p class="lens-caption">生产能力 · 解释能力</p></aside></div></section><section class="section"><div class="section-head"><h2>正在进行</h2><a href="/zh/research/">查看研究 ↗</a></div>${p.ongoingProjects.map((x) => `<article class="work"><div class="work-meta"><span>${esc(x.period)}</span><span>课程论文</span></div><div><h3><a href="/zh/research/${x.id}/">${x.id === "formal-theory" ? "形式理论" : "资本主义的经济制度"}</a></h3><p>研究问题仍在形成中，尚无确定题目或摘要。</p></div></article>`).join("")}</section><section class="bottom-grid"><div class="now"><p class="eyebrow">目前关注</p><p>生产能力、解释能力，以及人们如何判断看不见的制度替代方案。</p><a href="/zh/notes/">阅读笔记 ↗</a></div><div class="contact"><h2>欢迎交流</h2><p>欢迎就制度、信念形成与形式政治经济学交流。</p><a href="mailto:${esc(p.email)}">${esc(p.email)} ↗</a></div></section>`, `# ${p.name}\n\n${p.bioZh}\n\n[研究](/zh/research/index.md) · [笔记](/zh/notes/index.md) · [近况](/zh/live/index.md) · [关于](/zh/about/index.md)`, p.bioZh, "zh-CN");

await page("/zh/research/", "研究", "/zh/research/", `<div class="page-head cn"><p class="eyebrow">问题、情境与研究</p><h1>研究</h1><p class="lead">制度如何形成生产能力，又如何影响人们对这种能力的理解？</p></div><div class="research-intro cn">${zhApproachHtml}</div><div class="question-grid cn">${p.questions.map((q, i) => `<div><div class="question-number">0${i + 1}</div><h3>${["生产能力", "解释能力", "制度替代方案"][i]}</h3><p>${["制度如何把个人的技能与资源组织成可延续的共同能力？", "制度如何影响人们能观察到什么，以及如何归因共同工作的成果？", "当替代安排的结果无法直接观察，人们如何判断现任是否可替代？"][i]}</p></div>`).join("")}</div><section class="section"><h2>正在进行的课程论文</h2>${p.ongoingProjects.map((x) => `<article class="work"><div class="work-meta">${esc(x.period)}<br>课程论文</div><div><h3><a href="/zh/research/${x.id}/">${x.id === "formal-theory" ? "形式理论" : "资本主义的经济制度"}</a></h3><p>${esc(x.courseCode)} · ${esc(x.courseTitle)}。选题仍在形成中，题目与指导教师尚未确定。</p></div></article>`).join("")}</section><section class="section"><h2>此前的课程研究</h2>${p.projects.map((x) => `<article class="work"><div class="work-meta">${esc(x.period)}<br>课程研究</div><div><h3><a href="/zh/research/${x.id}/">${x.id === "bangladesh-1991" ? "孟加拉国 1991 年的政策转向" : "近代早期马尼拉的中西贸易"}</a></h3><p>${x.id === "bangladesh-1991" ? "什么推动了孟加拉国在 1991 年转向市场导向政策？" : "怎样从非欧洲中心的视角理解 1589—1603 年马尼拉的中西贸易？"}</p></div></article>`).join("")}</section>`, `# 研究\n\n${p.approachZh}\n\n## 正在进行\n${p.ongoingProjects.map((x) => `- [${x.courseCode}](/zh/research/${x.id}/index.md)：课程论文选题中`).join("\n")}\n\n## 此前课程研究\n${p.projects.map((x) => `- [${x.title}](/zh/research/${x.id}/index.md)：课程研究，仅提供摘要`).join("\n")}`, p.approachZh, "zh-CN");

for (const x of p.ongoingProjects) {
  const title = x.id === "formal-theory" ? "形式理论" : "资本主义的经济制度";
  await page(`/zh/research/${x.id}/`, title, "/zh/research/", `<div class="page-head cn"><a class="back" href="/zh/research/">← 研究</a><p class="eyebrow" style="margin-top:28px">${esc(x.period)} · 课程论文</p><h1>${title}</h1><p class="lead">${esc(x.courseCode)} · ${esc(x.courseTitle)}</p></div><article class="article cn"><p>这是一个研究领域标签，而非确定的论文题目。选题仍在形成中，题目、指导教师与摘要均待确认。</p><div class="notice">课程论文，不是已发表成果。</div></article>`, `# ${title}\n\n${x.courseCode} · ${x.courseTitle}\n\n课程论文选题中；题目、指导教师与摘要待确认。不是已发表成果。`, "课程论文选题中", "zh-CN");
}
for (const x of p.projects) {
  const title = x.id === "bangladesh-1991" ? "孟加拉国 1991 年的政策转向" : "近代早期马尼拉的中西贸易";
  const question = x.id === "bangladesh-1991" ? "什么推动了孟加拉国在 1991 年转向市场导向政策？" : "怎样从非欧洲中心的视角理解 1589—1603 年马尼拉的中西贸易？";
  await page(`/zh/research/${x.id}/`, title, "/zh/research/", `<div class="page-head cn"><a class="back" href="/zh/research/">← 研究</a><p class="eyebrow" style="margin-top:28px">${esc(x.period)} · 课程研究</p><h1>${title}</h1><p class="lead">${question}</p></div><article class="article cn"><p>2026 年春季课程研究。网站仅提供项目摘要，未提供论文全文。</p><p>课程：${esc(x.context)}。</p><div class="notice">课程研究，不列为学术发表。</div></article>`, `# ${title}\n\n${question}\n\n2026 年春季课程研究。仅提供摘要，不列为学术发表。`, question, "zh-CN");
}


await page("/zh/live/", "近况", "/zh/live/", `<div class="page-head cn"><p class="eyebrow">一个正在形成的栏目</p><h1>近况</h1><p class="lead">记录阅读、学习，以及正在推进的工作。</p></div><article class="article cn"><p>内容尚在形成中。</p></article>`, `# 近况\n\n记录阅读、学习，以及正在推进的工作。内容尚在形成中。`, "近况栏目仍在形成中", "zh-CN");

await page("/zh/about/", "关于我与简历", "/zh/about/", zhAboutBody, `# ${p.name} — 关于我\n\n${p.bioZh}\n\n${p.approachZh}\n\n## 教育背景\n加州大学伯克利分校，本科；主修政治经济与应用数学。\n\n## 研究兴趣\n制度政治经济学；生产能力与解释能力；信念形成与形式理论。\n\n## 正在进行的课程论文\n形式理论与资本主义的经济制度，均尚在选题阶段。\n\n## 学术训练\n已修课程覆盖定量微观经济学、概率、多元微积分、离散数学，以及古典政治经济学、世界史和中国文学史。当前课程还包括计量经济学与分析导论。\n\n## 此前的课程研究\n孟加拉国 1991 年的新自由主义转向；1589—1603 年马尼拉的中国—西班牙贸易。均为 2026 年春季课程研究，仅提供摘要。\n\n[英文简历](/cv.pdf)`, p.bioZh, "zh-CN");

await page("/zh/for-agents/", "站点资料", null, `<div class="page-head cn"><p class="eyebrow">纯文本与结构化资料</p><h1>站点资料</h1><p class="lead">给希望准确读取本站内容的读者与工具。</p></div><article class="article cn"><p>所有主要页面都无需 JavaScript 即可阅读，并有对应的 Markdown 版本。<a href="/profile.json">profile.json</a> 与 <a href="/research.json">research.json</a> 提供公开资料。</p><p>研究兴趣是问题方向，不代表已经建立的专长。正在进行的两篇论文是课程论文，选题未定；此前的两项是课程研究，均不列为已发表论文。笔记是学习记录与开放问题。</p><p>本站只包含公开内容，不发布私人笔记原件、课程材料原件或申请资料。</p></article>`, `# 站点资料\n\n主要页面提供无需 JavaScript 的 HTML 与 Markdown。研究项目与笔记均注明状态。本站不发布私人笔记原件。`, "站点公开内容与阅读边界", "zh-CN");

const publicProfile = {
  schemaVersion: 1,
  updated: p.updated,
  name: p.name,
  alternateNames: p.alternateNames,
  role: p.role,
  institution: p.institution,
  studies: p.studies,
  bio: p.bio,
  interests: p.interests,
  training: p.training,
  exploratoryQuestion: p.workingHypothesis,
  email: p.email,
  url: url("/"),
  cv: url("/cv.pdf"),
  contentNote: "Studies does not specify formal degree declaration or graduation date. Update date refers to this site edition.",
};
await save("profile.json", json(publicProfile));
await save(
  "research.json",
  json({
    schemaVersion: 1,
    updated: p.updated,
    ongoingProjects: p.ongoingProjects.map((x) => ({ ...x, url: url(`/research/${x.id}/`), markdown: url(`/research/${x.id}/index.md`) })),
    projects: p.projects.map((x) => ({ ...x, url: url(`/research/${x.id}/`), markdown: url(`/research/${x.id}/index.md`) })),
  })
);
await save(
  "llms.txt",
  `# ${p.name}\n\n> UC Berkeley undergraduate studying political economy and applied mathematics.\n\n${p.bio}\n\nTwo PhD-level course papers are in topic development; topics and mentors are not yet determined and abstracts are coming soon. Two earlier course projects have summaries available. None is listed as a publication. Notes contains selected study guides and open questions. Content updated ${p.updated}; this is an edition date.\n\n## Profile\n- [About and CV](${url("/about/index.md")}): Biography, education, selected course work and contact.\n- [Structured profile](${url("/profile.json")}): Public identity and interests.\n\n## In progress\n${p.ongoingProjects.map((x) => `- [${x.title}](${url(`/research/${x.id}/index.md`)}): PhD-level course paper, topic development; abstract coming soon.`).join("\n")}\n\n## Previous course research\n${p.projects.map((x) => `- [${x.title}](${url(`/research/${x.id}/index.md`)}): ${x.type}, ${x.period}; summary only.`).join("\n")}\n- [Research metadata](${url("/research.json")}): Project types, dates and availability.\n\n## Notes\n- [Reading notes](${url("/notes/index.md")}): Selected study guides and open questions, not research findings.\n\n## About this site\n- [Agent guide](${url("/for-agents/index.md")}): Reading conventions and scope.\n`
);
await save(
  "sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map((x) => `<url><loc>${esc(url(x.route))}</loc><lastmod>${p.updated}</lastmod></url>`).join("")}</urlset>`
);
await save("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${url("/sitemap.xml")}\n`);
await save(
  "404.html",
  shell(
    "Page not found",
    "/404.html",
    null,
    '<div class="page-head"><p class="eyebrow">404</p><h1>Page not found.</h1><p class="lead">The page may have moved.</p><a href="/">Return home →</a></div>'
  )
);
console.log(`Built ${pages.length} pages, Markdown equivalents, profile/research JSON and discovery files in ${out}`);
