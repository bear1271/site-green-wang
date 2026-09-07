# Green Wang — Personal Website

Personal academic website for Green (Sirun) Wang, an undergraduate at UC Berkeley studying political economy and applied mathematics.

## Local preview

```powershell
python make_cv.py
node build.mjs
node check.mjs
node serve.mjs
```

Open http://127.0.0.1:4173/. The server exposes only the generated `dist/` directory.

## Content model

- `content/profile.json` is the single public content source.
- `build.mjs` generates static HTML, Markdown equivalents, JSON records, `llms.txt`, `sitemap.xml`, and `robots.txt`.
- `make_cv.py` creates the public PDF CV.
- `public/style.css` contains the site-specific styles.
- `dist/` is generated and ignored.

Research status is intentional: the two Fall 2026 PhD-level course papers are planned and in topic development. Their topics and mentors are not yet determined; their abstracts are coming soon. Earlier course research is labeled as coursework and is not presented as publication.

## Updating

Edit `content/profile.json`, regenerate the CV, build, and run the content checks. Keep private working notes and source documents outside this repository. Do not add the internal review notes from the original template project.

## Agent-readable record

The site publishes full-text HTML and equivalent Markdown, plus `/profile.json`, `/research.json`, and `/llms.txt`. These files describe public content only. `llms.txt` is a reading guide, not an access-control mechanism.
