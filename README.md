# Scripture Index

**A cross-reference ranking of the Catholic Bible**

Scripture Index is a static, accessible research interface for exploring two independent biblical cross-reference systems: the broad 66-book OpenBible network and the historical 73-book Catholic Original Douay-Rheims apparatus. Neither is a ranking of theological importance or objective influence.

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

`data:refresh` builds both layers. For Douay-Rheims it first retries `thedouayrheims.com` with exponential backoff, then uses GitHub raw as fallback. OpenBible first uses the official bulk archive, then its structured API fallback, and uses BSB for display text. It records URL, timestamp, fallback status, and SHA-256 in `.cache/odr/sources.json`. The ignored cache is never deployed. Compact generated assets in `public/data/` and useful reports in `reports/` are committed. Review every parser failure in `reports/unparsed-cross-references.json`; the observed leading-token inventory is in `reports/abbreviation-inventory.json`. Submit parsing corrections with the source notation, expected canonical target, and evidence.

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

## Three independent data layers

Scripture Index keeps three native, independently ranked cross-reference layers:

- **Curated OT→NT quotations** — passage-first UBS parallel groups directed from Old Testament sources to New Testament occurrences under CC BY-SA 4.0.
- **OpenBible network** — a broad 66-book network from OpenBible.info, used in modified and normalized form under CC BY 4.0. It draws primarily from the Treasury of Scripture Knowledge. Public-domain Berean Standard Bible text is used only for display.
- **Original Douay-Rheims apparatus** — the historical 73-book Catholic apparatus and Original Douay-Rheims text, supplied under CC0 1.0.

The layers are never merged or silently converted between versification systems. In particular, OpenBible Psalm identifiers never select Douay-Rheims Psalm text. The seven deuterocanonical books are not covered by OpenBible; they are not assigned zero scores. OpenBible links are broad editorial relationships and do not prove chronology, conscious authorial use, literary dependence, theological significance, or objective importance.

### OpenBible commands

```bash
npm run openbible:refresh       # acquire/build OpenBible and BSB data
npm run openbible:build         # rebuild from .cache/openbible
npm run openbible:audit         # validate generated OpenBible data
npm run verify:openbible        # verify public OpenBible assets
npm run verify:openbible-dist   # verify deployed OpenBible assets
```

Offline refreshes may set `OPENBIBLE_LOCAL_ARCHIVE` to the official zip, `OPENBIBLE_LOCAL_TSV` to an extracted cross-reference table, `OPENBIBLE_LOCAL_JSON_DIR` to a materialized structured fallback, and `OPENBIBLE_TEXT_JSON` to BSB complete JSON. Inspect failures in `reports/openbible-invalid-rows.json`, missing display text in `reports/openbible-missing-text.json`, and the full summary in `reports/openbible-data-audit.md`. Report corrections with the original row, expected native OpenBible identifier, and supporting source evidence.

The **Bootstrap production data and deploy** workflow refreshes and validates all four layers. Ordinary Pages deployments use only committed generated assets and make no runtime or build-time dataset requests.

## Curated OT→NT quotations layer

The default first-visit layer uses the [UBS Paratext Parallel Passages Database](https://github.com/ubsicap/ubs-open-license/tree/main/parallel%20passages) under CC BY-SA 4.0. It ranks Old Testament **source passages** by distinct UBS quotation or parallel groups, with New Testament occurrences reported separately. It is passage-first: a ranged source and ranged target form one event rather than a Cartesian product of verse edges. Native `quotations:BOOK.CHAPTER.VERSE` identifiers remain separate from both OpenBible and Douay-Rheims versification.

Only groups with at least one recognized Old Testament passage and one recognized New Testament passage contribute. OT-only, NT-only, malformed, unknown-book, and directionless groups are audited. UBS match codes are normalized into no, partial, and full word overlap. These data do not prove conscious dependence in every case, exact chronology, objective importance, or comprehensive quotation/allusion coverage.

```bash
npm run quotations:refresh
npm run quotations:build
npm run quotations:audit
npm run verify:quotations
npm run verify:quotations-dist
```

Set `UBS_PARALLEL_XML=/path/to/ParallelPassages.xml` for an offline refresh. Review `reports/quotations-data-audit.md`, `reports/quotations-invalid-groups.json`, `reports/quotations-book-inventory.json`, and `reports/quotations-events.json` when investigating coverage or reporting a correction.

## Passage-first quotation rankings

The UBS quotations layer ranks Old Testament **source passages** by the number of distinct UBS parallel groups in which they participate. New Testament occurrences, distinct target books, and verbal-overlap summaries remain separate metrics; source match annotations are counted once per UBS group and source passage. A source-verse view is provided as an explicit projection of those passage records. Passage URLs preserve same-chapter and cross-chapter ranges instead of collapsing them into ambiguous verse routes.

The OpenBible build also creates a validated normalized BSB text registry in its ignored build cache. The quotations compiler consumes that same registry to attach source- and target-passage text. Run the **Bootstrap production data and deploy** workflow after merging changes that affect either compiler so all four committed production layers are regenerated together.

## Automated Greek reuse candidates

The independent `greek-reuse` layer compares native Greek passage windows from the CenterBLC Rahlfs LXX 1935 dataset (MIT) with the Biblical Humanities Nestle1904 morphology (CC0 1.0). It normalizes Greek surface forms and lemmas, retrieves possible LXX windows through an inverted lemma index, scores transparent lexical and word-order evidence, and clusters overlapping sliding-window results. UBS OT→NT parallels calibrate the high and medium thresholds but are not added to the algorithmic score.

These are computational candidates intended for human review—not proven quotations, definitive allusions, probabilities of dependence, or theological rankings. Native LXX numbering and book coverage remain separate from Douay-Rheims and BSB versification.

Local or bootstrap builds use:

```bash
LXX_TF_DIR=/path/to/LXX/tf/1935 \
NESTLE1904_MORPH_DIR=/path/to/Nestle1904/morph \
LXX_SOURCE_COMMIT=<sha> NESTLE1904_SOURCE_COMMIT=<sha> \
npm run greek-reuse:refresh

npm run greek-reuse:audit
npm run verify:greek-reuse
```

The bootstrap workflow checks out both source repositories, records their commits, builds and audits the fourth layer, commits only normalized production assets and audit reports, and deploys only after all four layers pass validation.

## Phase E1 Greek-reuse review workstation

The static route `#/review/greek-reuse` provides a human review workstation for a deterministic queue of Layer D automated candidates. It does not add a reviewed ranking and does not change Layer D scoring. The interface keeps three things visibly separate: immutable algorithm output, browser-local human-review drafts, and reviews published from the committed source file. Even a published classification remains a scholarly judgment rather than an objective fact about quotation, allusion, chronology, or literary dependence.

Drafts autosave only in the current browser under `scripture-index:greek-reuse-reviews:v1`. There is no server, account, or cloud synchronization. **A visitor's local edits cannot alter the published project.** Use **Export reviews** to download UTF-8 JSON. Imports are previewed before application, report new/updated/unchanged/conflicting records, unknown IDs, and algorithm mismatches, and offer keep-local, use-imported, or prefer-latest conflict policies. Export a backup before replacing drafts.

The committed source of published review data is `data/reviews/greek-reuse-reviews.json`; the lightweight queue compiler copies it into the deployable static data tree. Validate it offline against current Layer D candidate IDs and the current algorithm version with:

```bash
npm run reviews:queue
npm run reviews:validate
```

### Review publication workflow

1. Review candidates in the browser.
2. Export JSON.
3. Inspect the JSON and its scholarly claims.
4. Merge reviewed records into `data/reviews/greek-reuse-reviews.json`.
5. Run `npm run reviews:validate`.
6. Commit through a pull request.
7. Deploy normally with **Deploy Scripture Index to Pages**.

The queue build consumes only existing committed Layer D production files; it never refreshes the Greek corpora or reruns similarity scoring. `predev` and `prebuild` regenerate the compact queue and deployable review copy without invoking the hour-long corpus bootstrap.

## Phase E1b: English-assisted evidence triage

The `#/review/greek-reuse` workstation defaults to evidence triage and keeps its six outcomes separate from the optional expert relationship classification. Brenton (`eng-Brenton`) English LXX is review assistance only; English context does not replace examination of Greek, and Brenton does not safely represent every CenterBLC recension or textual form. Transliteration is not translation. UBS overlap is external evidence, not proof. Candidates without safe English mapping should receive `expert-review-required` or `cannot-assess`. Layer D candidate generation, scores, thresholds, IDs, rankings, and the deterministic 332-item queue remain unchanged.

Review exports use schema version 2. On first load without v2 data, valid array-shaped v1 local drafts are converted to `reviewKind: "expert"`, written to the v2 key, and the original JSON is preserved at `scripture-index:greek-reuse-reviews:v1:backup`; a notice appears once.

Assistance maintenance is offline by default: `npm run reviews:assistance:build` reads committed normalized data and `npm run reviews:assistance:audit` validates it. `npm run reviews:assistance:refresh` is the only command that downloads the public-domain eBible.org source.
