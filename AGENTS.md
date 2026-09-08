# Website working agreement

## Deployment contract

- Production URL: `https://sirunwang.com`
- Production base path: `/`
- Hosting: GitHub Pages
- The site is static. Do not add a server, API routes, databases, or other runtime dependencies.

## Source, generated files, and deployment

- Edit public content in `content/profile.json`, presentation assets in `public/`, and build behavior in `scripts/`.
- `npm run build` writes the deployable site to `dist/`. Do not hand-edit generated output.
- `python scripts/make_cv.py` regenerates `public/cv.pdf` before the site build.
- GitHub Actions deploys the `dist/` artifact from `main`. Keep `public/CNAME` in the build output so the custom domain is included in every deployment.

## Required checks

After a public-content, build, style, or deployment change, run:

```powershell
python scripts/make_cv.py
npm run build
npm run check
```

Before committing, review the generated-file diff. Do not commit files from `local/`, `qa/`, logs, or `dist/`.

## Local workspace

`local/` is the private, ignored workspace for drafts, decision notes, research scratch files, and local QA material. It must never contain publishable source of record; move final public content into the tracked source locations above.

## Content safeguards

- Preserve the distinction between course research, in-progress work, and publications.
- Do not add private records, application materials, unredacted identifiers, or private CV source files.
- Keep public pages accessible without client-side JavaScript and retain the Markdown and structured-data outputs produced by the build.
