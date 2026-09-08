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
