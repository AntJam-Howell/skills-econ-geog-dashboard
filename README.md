# Economic Geography of U.S. Skill Specialization and Complexity

An open-access, interactive dashboard for exploring a U.S. county-year panel of labor and skill demand, 2010-2024. Built on the [Observable Framework](https://observablehq.com/framework) as a fully static site. The released county-year parquet is queried client-side in the browser through DuckDB-WASM, so there is no backend server and no API.

**Live dashboard:** https://antjam-howell.github.io/skills-econ-geog-dashboard/

**Companion dataset:** [skills-econ-geog-data](https://github.com/AntJam-Howell/skills-econ-geog-data) (the 44-variable public-release panel that this dashboard visualizes)

---

## What the dashboard shows

Five pages, organized by the question they answer:

| Page | Question it answers |
|---|---|
| **Spatial visualization** (`/`) | Where in the U.S. is a given measure of labor or skill demand concentrated, and how has the geographic pattern shifted over time? Choropleth map with year slider and Play animation. |
| **Rankings & trends** (`/rankings`) | Which counties lead and lag on a given measure in a given year, and how is that measure distributed nationally? Ranked table, distribution histogram, and four national-context time series. |
| **County comparisons** (`/scatter`) | How do counties co-vary on any two measures? Bivariate scatter with a focal county and its k-nearest neighbors, year selector, and minimum-postings filter. |
| **County profiles** (`/county`) | What is the 15-year trajectory of a single county across the full battery of measures? Family-grouped sparklines plus composition stacks for employer entity, work mode, and skill type. |
| **How to use the dashboard** (`/about`) | How are the measures defined, and what workflows does the dashboard support? Glossary of measures, four end-to-end workflows, and methodology notes. |

The five metric families on the map, rankings, profile, and scatter pages are:

- **Skill Specialization** — local specializations (RCA > 1 breadth), mean skills per posting, distinct skills, skill concentration HHI
- **Economic complexity and sophistication** — ECI, fitness, entropy, average ubiquity
- **Network position** — Balland skill density, Neffke skill coherence, average centrality
- **Volume** — total postings, share specialized / software / common
- **Work mode** (county profile only) — share remote, hybrid, on-site

See the **How to use the dashboard** page for variable definitions.

---

## Data source

The dashboard reads a single 7.6 MB **Arrow IPC** file at `src/data/county_year_panel_export.arrow` (LZ4-compressed). It is a 39-column county-year aggregate panel constructed from 433.6 million Lightcast (Burning Glass) job postings spanning 2010-2024, covering 3,194 U.S. counties and 47,891 county-year observations. The variable set mirrors the public release: county-year scalars only, no per-skill columns.

The dashboard ships the Arrow IPC file (not parquet) because Observable Framework parses Arrow IPC natively via pure-JS `apache-arrow`, eliminating the ~2 MB `parquet-wasm` WebAssembly module that parquet readers require in the browser. The **canonical scientific artifact remains parquet** and lives in the companion data repository — see [skills-econ-geog-data](https://github.com/AntJam-Howell/skills-econ-geog-data) for the parquet download, codebook, and reproducible pipeline.

The pipeline that produces the parquet, the codebook, and the full methodological documentation live in the companion repository **[skills-econ-geog-data](https://github.com/AntJam-Howell/skills-econ-geog-data)**. The dashboard is intentionally read-only on the data; it does not transform the panel beyond on-the-fly aggregation for display.

The Connecticut planning-region remap (historic 8 counties to the new 9 planning regions, effective June 2022), the rural-urban continuum codes used for some filtering, and the county-name lookups live in `src/data/` alongside the parquet.

---

## Repository layout

```
skills-econ-geog-dashboard/
├── README.md                        # this file
├── LICENSE                          # MIT
├── CITATION.cff                     # citation metadata
├── observablehq.config.js           # site title, nav, theme, base path
├── package.json                     # dependencies
├── package-lock.json
├── .github/workflows/deploy.yml     # auto-deploy to GitHub Pages on push to main
└── src/
    ├── index.md                     # Spatial visualization (choropleth + slider)
    ├── rankings.md                  # Rankings & trends
    ├── scatter.md                   # County comparisons
    ├── county.md                    # County profiles
    ├── about.md                     # How to use the dashboard
    ├── style.css                    # site styles
    ├── components/
    │   ├── utils.js                 # METRICS registry, METRIC_INFO, helpers
    │   └── countySelector.js        # county dropdown with text-filter + browse
    └── data/
        ├── county_year_panel_export.arrow     # 7.6 MB, Arrow IPC LZ4, 47,891 x 39
        ├── data_dictionary.csv                # variable metadata (reference)
        ├── rucc_2023.csv                      # USDA Rural-Urban Continuum Codes
        ├── us-counties.json                   # static TopoJSON (us-atlas v3.0.1, 10m)
        └── county-meta.json                   # FIPS to {name, state} lookup
```

---

## Build and develop locally

```bash
npm install            # once
npm run dev            # local preview at http://localhost:3000 with hot reload
npm run build          # production build to dist/
npm run clean          # clear cached data-loader outputs
```

Requires Node 20.6 or later.

---

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the Observable Framework site and publishes `dist/` to GitHub Pages. To enable on a fresh fork or clone:

1. Push the repository to GitHub.
2. Settings -> Pages -> Build and deployment -> Source = **GitHub Actions**.
3. First successful run takes about three to four minutes. Subsequent pushes take about two minutes.

The site deploys to `https://<user>.github.io/skills-econ-geog-dashboard/`. The `base` field in `observablehq.config.js` is set to `/skills-econ-geog-dashboard/` to match. If you deploy under a different path, change the `base` value before building.

---

## Citation

If you use this dashboard, please cite both the dashboard and the underlying data release:

> Howell, Anthony (2026). *Economic Geography of U.S. Skill Specialization and Complexity: an interactive dashboard* [Software]. https://github.com/AntJam-Howell/skills-econ-geog-dashboard. Zenodo DOI to be assigned.

> Howell, Anthony (2026). *U.S. county-year panel of labor and skill demand, 2010-2024* [Data set]. https://github.com/AntJam-Howell/skills-econ-geog-data. Zenodo DOI to be assigned.

`CITATION.cff` provides machine-readable citation metadata. GitHub auto-renders a "Cite this repository" button from this file; Zenodo will read it on archive.

---

## License

The dashboard source code is released under the **MIT License**. See [`LICENSE`](LICENSE) for the full text.

The underlying data is released separately under **CC BY 4.0** in the [skills-econ-geog-data](https://github.com/AntJam-Howell/skills-econ-geog-data) repository. The data license governs the parquet shipped in `src/data/`.

---

## Acknowledgments

This work is supported by NSF Award #2431853 and an Anthropic Economic Futures Award. The Lightcast (formerly Burning Glass Technologies) US Job Postings 2010-2024 data underlie the released panel. Computation was performed on the ASU Sol supercomputer.

---

## Contact

**Anthony Howell**
Associate Professor, School of Public Affairs
Director, Center on Technology, Data & Society
Arizona State University
Email: ajhowel5@asu.edu
