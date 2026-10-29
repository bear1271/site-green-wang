import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "dist");
const basePath = (process.env.SITE_BASE || "").replace(/\/$/, "");
const source = JSON.parse(await readFile(path.join(root, "content/profile.json"), "utf8"));
const profile = JSON.parse(await readFile(path.join(out, "profile.json"), "utf8"));
const research = JSON.parse(await readFile(path.join(out, "research.json"), "utf8"));
for (const route of ["", "research", "notes", "live", "about", "for-agents"]) {
  const en = await readFile(path.join(out, route, "index.html"), "utf8");
  const zh = await readFile(path.join(out, "zh", route, "index.html"), "utf8");
  assert(en.includes('lang="en"') && zh.includes('lang="zh-CN"'), `Bilingual language mismatch: ${route}`);
  assert(en.includes('class="language-switch"') && zh.includes('class="language-switch"'), `Missing language switch: ${route}`);
}
for (const directory of ["html", "library"]) {
  await assert.rejects(stat(path.join(out, "notes", directory)), {code:"ENOENT"}, "Unreviewed note sources must not be deployed");
}
const publicNotes = JSON.parse(await readFile(path.join(root, "content/public-note-editions.json"), "utf8"));
const publicIndex = await readFile(path.join(out, "notes", "index.html"), "utf8");
const noteCategories = JSON.parse(await readFile(path.join(root, "content/notes-categories.json"), "utf8"));
const allNotesIndex = await readFile(path.join(out, "notes", "all", "index.html"), "utf8");
for (const category of noteCategories) {
  for (const prefix of ["", "zh/"]) {
    const categoryPage = await readFile(path.join(out, prefix, "notes", category.id, "index.html"), "utf8");
    assert(categoryPage.includes(`href="${basePath}/${prefix}notes/" aria-current="page"`), "Notes navigation must stay active on category pages");
    assert(categoryPage.includes(`href="${basePath}/${prefix}notes/${category.id}/" aria-current="page"`), "Current subject must be marked");
  }
  assert(publicIndex.includes(`/notes/${category.id}/`), "Subject missing from Notes navigation");
  assert(allNotesIndex.includes(`href="#${category.id}"`) && allNotesIndex.includes(`id="${category.id}"`), "Subject jump link has no destination");
}
for (const note of publicNotes.filter(n=>n.status === "public")) {
  assert.equal(note.access_verified, true, "Unverified Drive note must not be published");
  const destination = new URL(note.href);
  assert.equal(destination.hostname, "drive.google.com");
  assert.equal(destination.pathname, `/file/d/${note.drive_id}/view`);
  assert(allNotesIndex.includes(note.drive_id), "Approved public reading edition missing from catalog");
  const category = noteCategories.find(c => (note.categoryId || note.category) === c.id || (!note.categoryId && note.category === c.title));
  assert(category, "Public reading edition needs a recognized subject");
  const categoryPage = await readFile(path.join(out, "notes", category.id, "index.html"), "utf8");
  assert(categoryPage.includes(note.drive_id), "Approved public reading edition missing from subject page");
}
assert(!/notes\/(?:library|html)\//.test(publicIndex), "Private archive linked from public index");
assert.equal(profile.name, source.name);
assert.deepEqual(profile.studies, source.studies);
assert.equal(profile.bio, source.bio);
assert.equal(profile.email, source.email);
assert.equal(research.projects.length, source.projects.length);
assert.equal(research.projects[0].publicationStatus, "Not listed as a publication");
assert.deepEqual(profile.training, source.training);
assert.equal(research.ongoingProjects.length, 2);
for (const project of research.ongoingProjects) {
  assert.equal(project.mentor, null);
  assert.equal(project.topic, null);
  assert.equal(project.type, "PhD-level course paper");
  const html = await readFile(path.join(out, "research", project.id, "index.html"), "utf8");
  assert(html.includes("Abstract coming soon.") && html.includes("Not yet confirmed"));
}
const files = [];
async function walk(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const f = path.join(dir, item.name);
    if (item.isDirectory()) await walk(f);
    else files.push(f);
  }
}
await walk(out);
let linkCount = 0;
for (const file of files) {
  const rel = path.relative(out, file);
  assert(!/review-notes|make_cv|profile\.json\.bak|academic_record/.test(rel), "Internal source leaked: " + rel);
  if (!file.endsWith(".html")) continue;
  const html = await readFile(file, "utf8");
  if (rel.startsWith(path.join("notes", "html") + path.sep)) {
    assert(!/Student ID|Expected Spring 2029|file:\/\/|[A-Z]:\\\\/.test(html), "Private path or identifier in mounted note: " + rel);
    continue;
  }
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1, rel + " should have one h1");
  assert(html.includes("<html lang="), rel + " missing language");
  assert(html.includes('name="description"'), rel + " missing description");
  for (const script of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    assert(script[1].includes("application/ld+json"), "No runtime JS is needed");
    JSON.parse(script[2]);
  }
  assert(!/Student ID|Expected Spring 2029|Albert Einstein|You R\. Name/.test(html), "Private or demo data leaked");
  for (const m of html.matchAll(/(?:href|src)="([^"#]+)(?:#[^"]*)?"/g)) {
    let link = m[1];
    if (!link.startsWith("/")) continue;
    if (basePath && link.startsWith(basePath + "/")) link = link.slice(basePath.length);
    let target = path.join(out, decodeURIComponent(link.split("?")[0]));
    if ((await stat(target)).isDirectory()) target = path.join(target, "index.html");
    await stat(target);
    linkCount++;
  }
}
const pdf = await readFile(path.join(out, "cv.pdf"));
assert(pdf.subarray(0, 4).toString() === "%PDF", "PDF missing");
console.log(
  `PASS: ${files.filter((f) => f.endsWith(".html")).length} HTML pages; ${linkCount} internal links; JSON identity consistency; metadata; PDF; private/demo content exclusion.`
);
