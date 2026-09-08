# Site architecture

## Tracked source

- `content/` — public profile and research source data.
- `public/` — files copied unchanged into the static site, including `CNAME`, styles, icons, and the generated CV PDF.
- `scripts/` — build, validation, preview, and CV-generation tools.
- `.github/workflows/` — GitHub Pages build and deployment workflow.

## Generated and local-only directories

- `dist/` — the complete deployable static site. It is generated and ignored by Git; GitHub Actions uploads this directory to GitHub Pages.
- `local/` — private drafts, planning notes, QA material, and references. It is ignored by Git and never deployed.

## Deployment

GitHub Actions builds the site from `main`, uploads `dist/`, and deploys it through GitHub Pages. `public/CNAME` makes `sirunwang.com` part of that artifact. The production URL is `https://sirunwang.com/`; no server-side runtime is used.
