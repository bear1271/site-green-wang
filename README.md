# Green Wang — Personal Website

Public source for Green (Sirun) Wang’s personal academic website.

The site is a static GitHub Pages website. The generated `index.html`, page routes, styles, public records, CV PDF, and other assets are kept in the repository root so GitHub Pages can serve the site directly.

## Build and check

```powershell
python make_cv.py
node build.mjs
node check.mjs
```

For a local preview:

```powershell
node serve.mjs
```

Then open <http://127.0.0.1:4173/>.

## Content

- `content/profile.json` is the source for the public profile and research content.
- `build.mjs` generates the static HTML, Markdown equivalents, JSON records, `llms.txt`, sitemap, robots file, and root-level GitHub Pages files.
- `make_cv.py` creates the public CV PDF.
- `public/style.css` contains the site styles.
- `dist/` is a local build directory and is not required by GitHub Pages.

The two Fall 2026 PhD-level course papers are planned and still in topic development. Their topics and mentors are not yet determined; abstracts are coming soon. Earlier research is labeled as coursework and is not presented as publication.

Only public website content belongs in this repository. Do not add private CV sources, application records, internal notes, or personal identifiers.
