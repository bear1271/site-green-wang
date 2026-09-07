import { readFile, writeFile, mkdir, cp } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(root, "dist");
const p = JSON.parse(await readFile(path.join(root, "content/profile.json"), "utf8"));
const origin = (process.env.SITE_ORIGIN || "http://127.0.0.1:4173").replace(/\/$/, "");
const basePath = (process.env.SITE_BASE || "").replace(/\/$/, "");
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const json = (v) => JSON.stringify(v, null, 2).replace(/</g, "\\u003c");
const url = (route) => `${origin}${basePath}${route}`;
const dateLabel = "07 September 2026";
const pages = [];
await mkdir(out, { recursive: true });
await cp(path.join(root, "public"), out, { recursive: true });
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
  const entity = extra || { "@type": "WebPage", "@id": url(route), name: title, about: { "@id": url("/#person") }, dateModified: p.updated };
  const schema = { "@context": "https://schema.org", "@graph": [person, entity] };
  const nav = [
    ["Home", "/"],
    ["Research", "/research/"],
    ["Notes", "/notes/"],
    ["About / CV", "/about/"],
  ]
    .map(([label, href]) => `<a href="${href}"${active === href ? ' aria-current="page"' : ""}>${label}</a>`)
    .join("");
  return `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · ${esc(p.shortName)}</title><meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#f8f7f3"><link rel="canonical" href="${url(route)}">
<meta property="og:title" content="${esc(title)} · ${esc(p.shortName)}"><meta property="og:description" content="${esc(description)}"><meta property="og:type" content="website"><meta property="og:url" content="${url(route)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/style.css">
<link rel="alternate" type="application/json" href="/profile.json" title="Structured profile">${route === "/404.html" ? "" : `<link rel="alternate" type="text/markdown" href="${route === "/" ? "/index.md" : route + "index.md"}" title="Markdown version">`}
<script type="application/ld+json">${json(schema)}</script></head>
<body><a class="skip" href="#main">Skip to content</a><div class="container">
<header class="header"><a class="brand" href="/">Green Wang<span aria-hidden="true"> / </span></a><nav aria-label="Main navigation">${nav}</nav></header>
<main id="main">${body}</main>
<footer class="footer"><span>© 2026 ${esc(p.name)} <span aria-hidden="true">·</span> Updated <time datetime="${p.updated}">07 Sep 2026</time></span><div class="footer-links"><a href="/about/zh/" lang="zh-CN">中文简介</a><a href="/for-agents/">For agents</a><a href="mailto:${esc(p.email)}">Email ↗</a></div></footer>
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
const lens = `<aside class="lens" aria-label="Research question"><p class="lens-title">A research question</p><svg viewBox="0 0 185 200" role="img" aria-label="Institutions and information shape beliefs and preferences, with feedback between beliefs and preferences. A question for research, not an established finding."><g fill="none" stroke="#a7b49e" stroke-width="1"><path d="M92 60 V85 M92 85 H28 V104 M92 85 H155 V104 M65 127 H106 M100 123 L106 127 L100 131 M106 139 H65 M71 135 L65 139 L71 143"/><circle cx="92" cy="55" r="5"/></g><g font-family="Georgia,serif" fill="#284e40"><text x="92" y="20" font-size="16" text-anchor="middle">Institutions &amp;</text><text x="92" y="40" font-size="16" text-anchor="middle">information</text><text x="0" y="134" font-size="14">Beliefs</text><text x="114" y="134" font-size="14">Preferences</text></g></svg><p class="lens-caption">Conceptual inquiry.<br>Formal derivation.<br>Historical evidence.</p></aside>`;
await page(
  "/",
  "Political economy & applied mathematics",
  "/",
  `
<section class="hero"><div><p class="eyebrow">University of California, Berkeley</p><h1>Green Wang<br><span>(Sirun Wang)</span></h1><p class="intro">${esc(p.bio)}</p><div class="hero-links"><a class="text-link" href="/research/">Explore research <span aria-hidden="true">↗</span></a><a class="text-link" href="/about/">About & CV</a><a class="text-link" href="mailto:${esc(p.email)}">Email <span aria-hidden="true">↗</span></a></div></div>${lens}</section>
<section class="section" aria-labelledby="selected"><div class="section-head"><h2 id="selected">In progress</h2><a class="text-link" href="/research/">All research ↗</a></div>${p.ongoingProjects.map(ongoingWork).join("")}</section>
<section class="bottom-grid"><div class="now"><p class="eyebrow">Current interests</p><p>${esc(p.currentFocus)}</p><a class="text-link" href="/notes/">Questions guiding my reading ↗</a></div><div class="contact"><h2>Start a conversation.</h2><p>I welcome conversations about ${esc(p.contactTopics)}.</p><a href="mailto:${esc(p.email)}">${esc(p.email)} ↗</a></div></section>`,
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
await page(
  "/notes/",
  "Notes",
  "/notes/",
  `
<div class="page-head"><p class="eyebrow">Reading & reflection</p><h1>Notes</h1><p class="lead">Questions guiding my reading.</p></div><div class="article"><p>These questions connect my interests in endogenous preferences, belief formation, and the institutions through which people come to value things.</p>${p.questions.map((q, i) => `<section class="note-row"><div class="question-number">0${i + 1}</div><div><h2>${esc(q.title)}</h2><p class="question">${esc(q.question)}</p><p class="context">${esc(q.context)}</p></div></section>`).join("")}<section class="section"><p class="eyebrow">Exploratory question</p><h2>${esc(p.workingHypothesis.title)}</h2><p class="question">${esc(p.workingHypothesis.question)}</p><p>${esc(p.workingHypothesis.note)}</p></section><p class="notice">This page records research interests and open questions. There are no standalone essays published here yet.</p></div>`,
  `# Notes\n\nQuestions guiding my reading. These are open questions, not research findings or published essays.\n\n${p.questions.map((q) => `## ${q.title}\n${q.question}\n\n${q.context}`).join("\n\n")}\n\n## ${p.workingHypothesis.title}\nStatus: ${p.workingHypothesis.status}\n\n${p.workingHypothesis.question}\n\n${p.workingHypothesis.note}`
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
<p style="font-size:12px;color:var(--muted);margin-top:26px">The CV includes selected academic training, course papers in development, and previous course research.</p></article><aside><p class="eyebrow">At a glance</p><p>UC Berkeley<br>Undergraduate</p><p>Political Economy<br>Applied Mathematics</p><p class="eyebrow" style="margin-top:35px">Contact</p><a href="mailto:${esc(p.email)}">${esc(p.email)}</a><p class="eyebrow" style="margin-top:35px">Updated</p><time datetime="${p.updated}">${dateLabel}</time></aside></div>`,
  `# About & CV — ${p.name}\n\n${p.bio}\n\n${p.approach}\n\n## Education\n${p.institution}\nUndergraduate, studying ${p.studies.join(" and ")}.\n\n## Research interests\n${p.interests.join("; ")}\n\n${trainingMd}\n\n## Course papers in progress\n${ongoingMd}\n\n## Previous course research\n${projectsMd}\n\n## Contact\n${p.email}\n\n[Short CV PDF](/cv.pdf)`,
  p.bio,
  "en",
  { "@type": "ProfilePage", "@id": url("/about/"), name: `About ${p.name}`, mainEntity: { "@id": url("/#person") }, dateModified: p.updated }
);

await page(
  "/about/zh/",
  "中文简介",
  "/about/",
  `
<div class="page-head cn"><p class="eyebrow">University of California, Berkeley</p><h1>关于我</h1><p class="lead">${esc(p.name)}</p></div><article class="article cn"><p class="lead">${esc(p.bioZh)}</p><p>${esc(p.approachZh)}</p><h2>正在进行</h2><p>2026 年秋季，我正在开展两篇 PhD-level 课程论文：<a href="/research/formal-theory/">形式理论</a>与<a href="/research/capitalism-institutions/">资本主义的经济制度</a>。目前处于选题阶段，具体题目和 mentor 尚未确定；摘要将于研究问题明确后补充。</p><h2>学术训练</h2><p>已修课程覆盖定量微观经济学、概率、多元微积分、离散数学，以及古典政治经济学、世界史和中国文学史。当前课程还包括计量经济学与分析导论。</p><h2>此前的课程研究</h2><p><a href="/research/bangladesh-1991/">孟加拉国 1991 年的新自由主义转向</a>：关注市场导向政策转型及政党—国家制度。</p><p><a href="/research/manila-trade/">1589—1603 年马尼拉的中国—西班牙贸易</a>：从非欧洲中心的视角理解近代早期亚洲海上贸易。</p><p>以上均为 2026 年春季课程研究，目前网站提供项目摘要。</p><div class="tools"><a href="/about/">English & CV ↗</a><a href="mailto:${esc(p.email)}">${esc(p.email)}</a></div></article>`,
  `# ${p.name} — 中文简介\n\n${p.bioZh} ${p.approachZh}\n\n在研：2026 年秋季，两篇 PhD-level 课程论文，分别属于形式理论与资本主义经济制度。选题及 mentor 未定，摘要待研究问题明确后补充。\n\n此前课程研究：孟加拉国 1991 年的新自由主义转向；1589—1603 年马尼拉的中国—西班牙贸易。均为 2026 年春季课程研究，仅提供摘要。\n\n联系：${p.email}`,
  "伯克利本科生，学习政治经济与应用数学，关注制度、偏好与信念的内生形成。",
  "zh-CN"
);

await page(
  "/for-agents/",
  "For agents",
  null,
  `
<div class="page-head"><p class="eyebrow">Plain text & structured information</p><h1>For agents</h1><p class="lead">A small, readable index of this website.</p></div><article class="article"><p>The HTML pages contain their full text without requiring JavaScript. Equivalent Markdown pages and structured records are linked below.</p><table class="agent-table"><thead><tr><th>Resource</th><th>Contents</th></tr></thead><tbody><tr><td><a href="/llms.txt">llms.txt</a></td><td>A curated guide to this site</td></tr><tr><td><a href="/profile.json">profile.json</a></td><td>Public identity, studies, interests and contact</td></tr><tr><td><a href="/research.json">research.json</a></td><td>Project summaries, types and availability</td></tr><tr><td><a href="/index.md">index.md</a></td><td>Homepage as Markdown</td></tr><tr><td><a href="/sitemap.xml">sitemap.xml</a></td><td>Page addresses</td></tr></tbody></table><h2>Reading the record accurately</h2><p>${esc(p.name)} is an undergraduate at UC Berkeley, studying political economy and applied mathematics. Research interests describe topics of inquiry, not a claim of established expertise.</p><p>Two PhD-level course papers are in topic development in Fall 2026; topics and mentors are not yet confirmed. The two earlier selected projects are course research from Spring 2026. Their full manuscripts are not hosted here, and these entries should not be described as peer-reviewed publications. Notes contains open questions, not findings.</p><p>The update date indicates when this edition was prepared. It is not a claim that all past experiences were independently reverified on that date.</p><h2>Scope</h2><p>These files describe only the public content of this site. No private CV source files, personal identifiers, or application records are included.</p><p>The <a href="https://llmstxt.org/">llms.txt convention</a> provides an optional reading guide. It does not control an agent’s access permissions or guarantee how an agent uses this website.</p></article>`,
  `# Agent guide\n\nAll main pages are static HTML and have index.md equivalents.\n\n- [Profile](/profile.json)\n- [Research](/research.json)\n- [Home](/index.md)\n- [About](/about/index.md)\n- [Notes](/notes/index.md)\n\nIdentity: ${p.name}, undergraduate at UC Berkeley studying political economy and applied mathematics.\n\nTwo PhD-level course papers are in topic development in Fall 2026, with topics and mentors not yet determined. The two earlier projects are course research from Spring 2026, not listed as publications. Manuscripts are not hosted. Notes contains research questions, not findings. Update date is edition preparation date, not independent reverification of every fact.\n\nOnly public-site content is exposed. No private source files are served.\n\nllms.txt is an optional convention, not an access-control or guaranteed-discovery mechanism.`
);

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
  `# ${p.name}\n\n> UC Berkeley undergraduate studying political economy and applied mathematics.\n\n${p.bio}\n\nTwo PhD-level course papers are in topic development; topics and mentors are not yet determined and abstracts are coming soon. Two earlier course projects have summaries available. None is listed as a publication. Notes contains open questions. Content updated ${p.updated}; this is an edition date.\n\n## Profile\n- [About and CV](${url("/about/index.md")}): Biography, education, selected course work and contact.\n- [Structured profile](${url("/profile.json")}): Public identity and interests.\n\n## In progress\n${p.ongoingProjects.map((x) => `- [${x.title}](${url(`/research/${x.id}/index.md`)}): PhD-level course paper, topic development; abstract coming soon.`).join("\n")}\n\n## Previous course research\n${p.projects.map((x) => `- [${x.title}](${url(`/research/${x.id}/index.md`)}): ${x.type}, ${x.period}; summary only.`).join("\n")}\n- [Research metadata](${url("/research.json")}): Project types, dates and availability.\n\n## Notes\n- [Open questions](${url("/notes/index.md")}): Questions guiding reading, not research findings.\n\n## About this site\n- [Agent guide](${url("/for-agents/index.md")}): Reading conventions and scope.\n`
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
// GitHub Pages serves the repository root, so mirror the generated site there.
await cp(out, root, { recursive: true, force: true });
console.log(`Built ${pages.length} pages, Markdown equivalents, profile/research JSON and discovery files in ${out}`);
