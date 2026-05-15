# CLAUDE.md

Context for Claude Code working on this repo.

## Purpose

Public-facing dashboard for the Lightcast Skills project (separate from the AI Effects project). Renders county-year aggregates of skill demand composition, complexity, and revealed comparative advantage from 2010 to 2024 job postings data.

## Architecture in one paragraph

Static-site dashboard built on **Observable Framework** (Mike Bostock's static data-app framework). The county-year panel ships as a single CSV asset (~11 MB raw, ~4.7 MB on the wire after host compression) and is parsed client-side with `d3.csvParse` plus a row converter that keeps `county` (5-digit FIPS) and `rucc_tier` as strings while coercing the rest to numbers. No backend, no API, no WebAssembly. Build output is a static `dist/` folder. Two parallel deploys from `main`: Netlify (canonical) and GitHub Pages (fallback mirror).

## Hosts

| | URL | Compression | Hashed-asset cache |
|---|---|---|---|
| Canonical | https://skills-econ-geog.netlify.app/ | Brotli | `public, max-age=31536000, immutable` (set in `netlify.toml`) |
| Fallback mirror | https://antjam-howell.github.io/skills-econ-geog-dashboard/ | Gzip | `max-age=600` (GH Pages default, not configurable) |

The `base` field in `observablehq.config.js` is `/skills-econ-geog-dashboard/` so paths work on GH Pages. Netlify serves from the domain root and ignores `base`. Same build, both hosts, no separate config per environment.

## Loader pattern (all four data pages)

`src/index.md`, `src/rankings.md`, `src/scatter.md`, and `src/county.md` all use the same CSV-loader idiom near the top:

```js
const _csvText = await FileAttachment("data/county_year_panel_export.csv").text();
const _STR_COLS = new Set(["county", "rucc_tier"]);
const panel = d3.csvParse(_csvText, r => {
  for (const k in r) {
    if (!_STR_COLS.has(k)) r[k] = r[k] === "" ? null : +r[k];
  }
  return r;
});
```

`_STR_COLS` is non-negotiable. Coercing the `county` column strips leading zeros and breaks every join with `us-counties.json` and `county-meta.json` in states with single-digit state FIPS (AL/AZ/AR/CA/CO/CT). The 2026-04-26 FIPS join bug was the same class of error at the data layer; this row converter is the matching defense at the loader layer.

## Repo layout

```
.
├── observablehq.config.js     # Site title, nav, theme, base path. Edit page list here.
├── package.json               # Dependencies. npm run dev / build / deploy.
├── netlify.toml               # Cache headers for Netlify. Build config lives in Netlify UI.
├── .github/workflows/deploy.yml  # GitHub Pages auto-deploy on push to main.
├── CITATION.cff               # Citation metadata, points to Netlify canonical URL.
├── README.md                  # Public-facing readme.
├── CLAUDE.md                  # This file.
└── src/
    ├── index.md               # Spatial visualization (landing): choropleth + year slider + Play.
    ├── rankings.md            # Ranked tables, histogram, national context charts.
    ├── scatter.md             # Bivariate scatter with focal-county + k-NN peers.
    ├── county.md              # County profile: sparklines + composition stacks. Reads ?fips=.
    ├── about.md               # How to use the dashboard (nav label); URL stays /about.
    ├── style.css              # Page-level CSS extracted from inline blocks.
    ├── components/
    │   ├── utils.js           # METRICS registry, METRIC_INFO, CT_BRIDGE, makeInfoPopover, metricSelect.
    │   └── countySelector.js  # Hybrid text-filter + alphabetical-browse county dropdown.
    └── data/
        ├── county_year_panel_export.csv    # 47,891 rows x 39 cols. Gitignored. ~11 MB raw.
        ├── data_dictionary.csv             # Reference, not loaded by pages.
        ├── rucc_2023.csv                   # USDA Rural-Urban Continuum Codes.
        ├── us-counties.json                # Static TopoJSON (us-atlas v3.0.1, 10m).
        └── county-meta.json                # Pre-computed FIPS -> {name, state} lookup.
```

The dashboard CSV is gitignored because content-hashing happens at build time, and committing a 11 MB binary-ish text file just makes the repo heavy. The build pulls it from `src/data/`. Replication: fetch from the sister repo's parquet, round metrics to 6 sig figs, write CSV, drop in.

## Pages

Four analytical pages plus a usage guide (five total in the sidebar):

1. **Spatial visualization** (`/`) — landing page. Choropleth of any county-year metric with year slider and Play button.
2. **Rankings & trends** (`/rankings`) — ranked top-25 table, distribution histogram, four national-context time series.
3. **County comparisons** (`/scatter`) — bivariate scatter with focal-county highlight and k-NN peer discovery.
4. **County profiles** (`/county`) — single-county sparkline trajectories grouped by metric family, plus composition stacks. Reads `?fips=` from the URL.
5. **How to use the dashboard** (`/about`) — usage guide, metric glossary, methodology notes.

## Key dev commands

```bash
npm install            # Once.
npm run dev            # Local preview at http://localhost:3000 with hot reload.
npm run build          # Production build to dist/.
npm run clean          # Clear cached data loader outputs.
```

Node 20.6+ required. Both the TopoJSON map data and the county metadata lookup are pre-computed static JSON files in `src/data/`, so there's no Python build dependency. (If you need to regenerate `county-meta.json` from a new us-atlas release, see the inline comment at the top of `index.md`.)

## Adding a new metric

1. Open `src/components/utils.js`.
2. Append an entry to `METRICS` with `key`, `label`, `family`, `scale`, `scheme`, and `round`.
3. The metric appears automatically in the map metric selector, the scatter axis selectors, the rankings dropdown, and the county profile sparklines. No other changes needed.

Make sure the underlying column actually exists in the CSV. The released panel is 39 columns; per-skill features (top-5 names, churning counts) are intentionally not in the dashboard build.

## Adding a new page

1. Create `src/foo.md`.
2. Add `{name: "Foo", path: "/foo"}` to the `pages` array in `observablehq.config.js`.

## Data

The 39-column CSV mirrors the public-release variable set from the sister data repo, rounded to 6 significant figures for compactness. The canonical scientific artifact is the float64 parquet in `../skills-econ-geog-data/data/county_year_panel.parquet`. Don't add per-skill columns to the dashboard CSV without thinking about wire size; the current build is right at the edge of "instant" on a fast connection.

## What this repo is NOT

- Not a database. All queries are on the static CSV, in memory, in the browser.
- Not authenticated. Everything is public on both Netlify and GH Pages.
- Not server-rendered. No SSR, no API. Pure static.
- Not WebAssembly-backed. Phase 4 (2026-05-14) removed parquet-wasm; nothing in the bundle is WASM.
- Not for the AI Effects project (Track 3, NSF Theme I, etc.). This is the Lightcast Skills project deliverable.

## Resolved

- **Phase 4: ship CSV, no WASM** (2026-05-14, commit `59b1544`). All four data pages migrated from `FileAttachment(...).parquet()` to `FileAttachment(...).text()` + `d3.csvParse(text, row converter)`. The parquet-wasm dependency is gone, page bundles dropped from ~869 KB to ~635 KB, and the CSV compresses to ~4.7 MB on Netlify (Brotli) and ~4.8 MB on GH Pages (gzip). Total wire bytes comparable to the parquet+parquet-wasm path but without the WASM module.
- **Phase 3 Arrow IPC attempt, rolled back** (2026-05-14, commits `aaa3d7f` -> `3a43bdb` -> `09fb73c`). Arrow file parsed correctly in Node across every input shape (Buffer, Uint8Array, ArrayBuffer, Promise, Response, fetch) but Framework's browser path threw `Unrecognized type: "undefined" (24)` on standard types only (Utf8, Int, FloatingPoint). Cause never explained. Path is closed; do not re-attempt.
- **Phase 2 size cut** (2026-04-26 -> 2026-05-14, commits `e532fb4`, `c459807`, `c292079`). Metric floats cast to float32, ints to int32, parquet shrank from 5.6 MB to 4.0 MB. Float32 casts carried through into the Phase 4 CSV by rounding to 6 sig figs. DuckDB-WASM dependency removed across all four data pages.
- **Phase 1: drop within-county skill data** (commit `5e61a3b`). Per-skill columns (top-5 names, churning counts, n_rca_skills_filtered) removed from the dashboard export. Together with the same-day removal of the County skill explorer and the Top-skills section on County profiles, the per-skill features are no longer in scope for this dashboard. Source preserved at `../lightcast-dashboard_Skills/` for the future skills-only dashboard.
- **County skill explorer page moved to archive** (2026-05-13). The page (`src/explorer.md`), its slope-chart and KPI CSS, and the `src/county.md` pointer line that referenced it have all been removed from the live dashboard. Source preserved at `../lightcast-dashboard_Skills/`. Reason for the move: the top-25 cap and missing national-mention-floor issues mean the page was showing top-25 leaderboard churn rather than true RCA > 1 portfolio turnover; both need pipeline-level fixes before the page is honest about what it shows.
- **About page renamed** (2026-05-14). Nav label changed from "About the data" to "How to use the dashboard"; URL stays `/about` for bookmark compatibility.
- **County profile Top-skills section removed** (2026-05-14). `src/county.md` no longer renders the bottom "Top skills" grid; that depended on per-skill columns that are no longer in the dashboard export.
- **CT planning-region bridge** (2026-04-26). Connecticut abolished its 8 historic counties (09001-09015) effective June 2022 and replaced them with 9 planning regions (09110-09190). Lightcast adopted the new FIPS; `us-atlas` TopoJSON still has historic county polygons, so CT was uncolored. Fix: `CT_BRIDGE` map in `utils.js` (historic FIPS to primary planning-region FIPS, picked by largest population center) plus `fipsForData()` resolver. Choropleth and county-profile both bridge before lookup. The choropleth tooltip annotates the bridge so the user understands the data is from the new FIPS. Trade-off: 8 historic polygons can show only 8 of the 9 new regions, so 09140 Naugatuck Valley and 09190 Western Connecticut don't surface on the map (but are queryable via the panel). Long-term fix is a planning-region TopoJSON when us-atlas catches up.
- **FIPS join bug, pre-existing in v1** (2026-04-26). The panel had been storing FIPS as zero-stripped strings (`"6037"`, `"8031"`) while `us-counties.json` and `county-meta.json` use canonical 5-char zero-padded form. 287 counties whited out across all years in states with single-digit state FIPS. Fix: canonicalize the `county` column to 5-char `lpad` at the Sol export layer, and keep `_STR_COLS = {county, rucc_tier}` in every dashboard loader so the row converter never coerces them to numbers.
- **Layout density on county profile** (2026-04-26). Family-sparkline cards switched from `grid grid-cols-2` to CSS `columns: 3` masonry-style flow with `break-inside: avoid`. Sparkline height reduced 90 -> 70 px, label font 11 -> 10.5 px.
- **Map year Play button** (2026-04-26). Inline button next to the year slider; auto-advances ~700 ms per step. Pattern uses raw `Inputs.range(...)` element + `Generators.input(yearInput)` so programmatic value changes trigger the reactive update.
- **Suggested-pairs URL deep-linking** (2026-04-26). The five `?#` placeholder links on `scatter.md` are real `?x=&y=` deep-links. Scatter reads `x`, `y`, `year`, `min` URL params on load with sane fallbacks. (The build's link-checker flags these as broken because it can't validate JS-driven query-string behavior. False positive.)

## Known issues / future work

- The choropleth color domain is computed from the 2nd to 98th percentile across all years to keep the legend stable when the year slider moves. For metrics with extreme outliers (e.g., `fitness` for NYC), the log scale handles this; for linear metrics it caps high-end counties.
- The `Composition over time` section on `county.md` uses Plot.areaY without explicit ordering for the employer-type stack, which means colors may shuffle between counties. Apply an explicit `order` if this becomes an issue.
- No `urlSearchParams` reactive helper yet. `county.md` and `scatter.md` each read `location.search` once on load (county uses `?fips=`; scatter uses `?x=&y=&year=&min=&fips=&similar=true&k=`). When a third page also needs deep-linking, abstract this into a helper in `components/utils.js`.
- **Year-sharding the CSV** (not started). Would cut cold-load wire bytes for users who only browse one year. 15 shards of ~270 KB each, load the active year on demand. Discussed but not implemented. Only worth doing if user feedback says cold-load is still too slow despite Brotli + immutable caching.
- **Per-skill features deferred to the future skills-only dashboard.** Top-25 cap inflating apparent churn, missing national mention floor on RCA, and the `ks` column being skill-level rather than county-skill Balland density all need pipeline-level fixes before per-skill features come back into scope. Documented at length in `../lightcast-dashboard_Skills/README.md`.

## Related projects

- **Sister data repo:** `../skills-econ-geog-data` — the canonical 44-variable public-release panel (float64 parquet + 20 MB CSV mirror), codebook, summary statistics, and the Phase A/B Sol pipeline. The dashboard CSV is derived from this repo's parquet.
- **Future skills-only dashboard:** `../lightcast-dashboard_Skills` — archive of the County skill explorer page and the per-skill data (`county_skill_year_top25.parquet`). Has its own README documenting the pipeline-level issues that need fixing before revival.
- **AI Effects project (separate, do not touch):** data files at `/data/ajhowel5/AIEffects/` on Sol. The Lightcast Skills Sol pipeline at `/data/ajhowel5/LightcastSkills/` produces the parquet this dashboard consumes.
