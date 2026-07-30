# Scripture Index

**A cross-reference ranking of the Catholic Bible**

Scripture Index is a static, accessible research interface ranking every verse in the 73-book Catholic canon by unique verse-level references directed to it by the Original Douay-Rheims cross-reference apparatus. It is not a ranking of theological importance or objective influence.

> Screenshot: after running the app, add a current capture to `docs/screenshot.png` and reference it here.

## Features

- Complete searchable, filterable, paginated ranking with competition ranks and top-ten visualization
- Modern Catholic and historical Douay-Rheims book labels
- Lazy-loaded incoming/outgoing edge inspection and canonical navigation
- Book statistics, methodology, and transparent parser-quality views
- Persistent light/dark theme and naming preference
- Fully static Vite deployment with relative paths and hash routes
- Reproducible downloader/compiler with source hashes, audits, and GitHub fallback

## Methodology and limitations

Only each verse's `cross_refs` array becomes graph input. One unique canonical source verse pointing to an exact canonical target contributes one incoming point. Duplicate edges and self-links are excluded; ranges expand; chapter-only, ambiguous, excluded-book, and invalid references do not score. Ties use competition ranking and Catholic canonical order for deterministic display. The Prayer of Manasses, 3 Esdras, and 4 Esdras are appendix audit targets, not ranked books.

The source is the **Original Douay-Rheims** (1609 Old Testament and 1582 New Testament), not the Challoner revision. Results characterize this editorial apparatus only. Parser coverage is always presented alongside results, and another translation or apparatus would differ.

## Data and licensing

The [Original Douay-Rheims project](https://github.com/janvier-s/original-douay-rheims) supplies the dataset under CC0 1.0. Application code is MIT licensed. See [NOTICE.md](NOTICE.md).

## Technology

Vite, strict TypeScript, semantic HTML, organized CSS, vanilla browser APIs, and Vitest. Node.js 22 or a later active LTS is required.

## Setup and commands

```bash
npm ci
npm run dev               # local development
npm run test              # unit and validation tests
npm run typecheck         # strict TypeScript check
npm run lint              # ESLint
npm run check             # all CI checks plus generated-data audit
npm run build             # production output in dist/
npm run preview           # preview dist/
npm run data:refresh      # download 73 books, rebuild data and reports
npm run data:build        # rebuild from .cache/odr only
npm run data:audit        # validate committed generated assets
```

`data:refresh` first retries `thedouayrheims.com` with exponential backoff, then uses GitHub raw as fallback. It records URL, timestamp, fallback status, and SHA-256 in `.cache/odr/sources.json`. The ignored cache is never deployed. Compact generated assets in `public/data/` and useful reports in `reports/` are committed. Review every parser failure in `reports/unparsed-cross-references.json`; the observed leading-token inventory is in `reports/abbreviation-inventory.json`. Submit parsing corrections with the source notation, expected canonical target, and evidence.

## First Production Data Build

The first real-data build is performed once on a GitHub-hosted runner because the generated Bible data is intentionally committed. Normal deployments then use those committed assets and do not depend on the external dataset remaining available.

1. Merge this implementation into the repository's default branch.
2. Open the repository **Actions** tab.
3. Select **Bootstrap production data and deploy**.
4. Choose **Run workflow** on the default branch.
5. The workflow installs dependencies, checks out the Original Douay-Rheims repository, compiles and audits the data, repairs and commits the lockfile and generated assets, validates the application, and deploys the same build to Pages.
6. After bootstrap succeeds, ordinary pushes use the normal Pages deployment workflow and its committed data.
7. In **Settings → Pages**, ensure **GitHub Actions** is selected as the source.

To use an existing source checkout locally on macOS or Linux:

```bash
ODR_LOCAL_SOURCE_DIR=/path/to/original-douay-rheims/bible/raw ODR_SOURCE_COMMIT=<commit-sha> npm run data:refresh
```

In Windows PowerShell:

```powershell
$env:ODR_LOCAL_SOURCE_DIR = "C:\path\to\original-douay-rheims\bible\raw"
$env:ODR_SOURCE_COMMIT = "<commit-sha>"
npm run data:refresh
```

Local-source mode validates all 73 canonical files before clearing `.cache/odr`, performs no Bible HTTP requests, records the repository commit and SHA-256 of every file, and uses the same compiler as an ordinary refresh. The separately checked-out source directory is never copied into Git.

## GitHub Pages

The workflow runs checks and uploads only `dist`. In repository **Settings → Pages**, choose **GitHub Actions** as the source. Vite's `base: "./"` and hash routing support any project-repository name without configuration.

## Project structure

- `src/` — router, preferences, data loader, rendering, formatting, types, and styles
- `scripts/` — source fetch, normalization, parser, ranking, compilation, validation
- `public/data/` — deployable normalized data and per-book lazy edge files
- `reports/` — complete audit and parser diagnostics
- `tests/` — parser, ranking, sanitization, and generated-data validation
- `.github/workflows/` — GitHub Pages deployment

## Maintenance

Rename the application once in `src/config.ts`. Update historical/modern labels and Catholic order in `scripts/config.mjs`, then rebuild data. Never manually edit generated JSON. Add a parser fixture before changing an alias or grammar rule, refresh data, inspect the audit delta, and run `npm run check`.

## License

MIT for application code; CC0 1.0 applies separately to the upstream dataset.
