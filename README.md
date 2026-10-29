# Green Wang — Personal Website

Public source for Green (Sirun) Wang’s personal academic website.

The site is a static GitHub Pages website served at `https://sirunwang.com` from the root path (`/`). Its deployable artifact is `dist/`; no server-side runtime dependencies belong here.

## Build and check

```powershell
python scripts/make_cv.py
npm run build
npm run check
```

For a local preview:

```powershell
npm start
```

Then open <http://127.0.0.1:4173/>.

## Content

- `content/profile.json` is the source for the public profile and research content.
- `scripts/build.mjs` generates the static HTML, Markdown equivalents, JSON records, `llms.txt`, sitemap, and robots file in `dist/`.
- `scripts/make_cv.py` creates the public CV PDF.
- `scripts/check.mjs` validates the generated site; `scripts/serve.mjs` previews `dist/` locally.
- `public/style.css` contains the site styles.
- `public/CNAME` keeps the custom domain in the deployed artifact.
- `dist/` is generated locally and uploaded by GitHub Actions; it is not committed.
- `local/` is an ignored private workspace for drafts, planning notes, references, and local QA material. See `local/README.md` locally.

## Maintenance

`AGENTS.md` is the repository’s working agreement for people and coding agents. It defines the source-of-truth files, generated-output rules, privacy boundaries, deployment contract, and required checks. Read it before making site changes.

The two Fall 2026 PhD-level course papers are planned and still in topic development. Their topics and mentors are not yet determined; abstracts are coming soon. Earlier research is labeled as coursework and is not presented as publication.

Only public website content belongs in this repository. Do not add private CV sources, application records, internal notes, or personal identifiers.

## Licensing

Original website implementation code (build/check/preview scripts, CV-generation code, and original CSS and client-side code) is licensed under [MIT](LICENSE-CODE). Academic prose embedded in templates is content, not implementation code.

Original notes, prose, and diagrams authored by Green (Sirun) Wang are licensed under [CC BY 4.0](LICENSE-CONTENT.md). Personal photographs, portraits, institutional names/logos, and third-party materials are excluded. Third-party code, fonts, and libraries retain their own licenses and notices. Neither license grants rights to materials the site author does not own.

## Notes editorial workflow

Follow [NOTES_EDITORIAL.md](NOTES_EDITORIAL.md). Public reading editions must preserve the complete original notes rather than substitute abridged rewrites. English is the default; Chinese literary materials use Traditional Chinese with Chinese original names and appropriate English.

`content/public-note-editions.json` lists reviewed public reading editions: site-hosted full text and PDFs, or verified Drive destinations. Withdrawn editions are removed from the manifest. Unreviewed HTML/library source directories are excluded from deployment. Local originals and publication review material remain under ignored `local/` storage.

The four Poetics handouts have complete reading text in `content/poetics/`, rendered by `scripts/poetics.mjs`, with PDF editions and the original cited figure in `public/notes/poetics/`. These retain the original paragraph order, quotations, translations, bibliography and footnotes. Chinese is normalized to Traditional Chinese; unresolved source readings remain as in the handouts. They are course handouts, not publications. The edition date identifies publication preparation, not a substantive revision of the original notes.

`content/notes-categories.json` defines the bilingual Notes subjects and their stable routes. `scripts/notes.mjs` renders the subject overview, complete catalog, and individual subject pages without client-side JavaScript. Public editions use a `categoryId` matching a subject's `id` (the existing English category title is also accepted). Empty subjects remain navigable and show that reading editions are in preparation; they do not expose archive files.
