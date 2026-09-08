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
