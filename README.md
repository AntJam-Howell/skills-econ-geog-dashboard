# Economic Geography of U.S. Skill Specialization and Complexity

An open-access, interactive dashboard for exploring a U.S. county-year panel of labor and skill demand, 2010-2024.

**Live dashboard:** https://skills-econ-geog.netlify.app/

**Companion dataset:** [skills-econ-geog-data](https://github.com/AntJam-Howell/skills-econ-geog-data) (the public-release panel that this dashboard visualizes)

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

The dashboard visualizes a county-year aggregate panel constructed from 433.6 million Lightcast (Burning Glass) job postings spanning 2010-2024, covering 3,194 U.S. counties and 47,126 county-year observations.

The pipeline that produces the panel, the codebook, and the full methodological documentation live in the companion repository **[skills-econ-geog-data](https://github.com/AntJam-Howell/skills-econ-geog-data)**. The canonical scientific artifact at full float64 precision is also released there.

The Connecticut planning-region remap (historic 8 counties to the new 9 planning regions, effective June 2022) is applied throughout.

---

## Citation

If you use this dashboard, please cite:

> Howell, Anthony (2026). *Economic Geography of Skill Specialization and Complexity: an interactive dashboard* [Software]. https://github.com/AntJam-Howell/skills-econ-geog-dashboard. Zenodo DOI to be assigned.

`CITATION.cff` provides machine-readable citation metadata. For the underlying data, see the citation in the [skills-econ-geog-data](https://github.com/AntJam-Howell/skills-econ-geog-data) repository.

---

## License

The dashboard source code is released under the **MIT License**. See [`LICENSE`](LICENSE) for the full text.

The underlying data is released separately under **CC BY 4.0** in the [skills-econ-geog-data](https://github.com/AntJam-Howell/skills-econ-geog-data) repository.

---

## Acknowledgments

This material is based upon work supported by the National Science Foundation under Grant No. 2431853. Any opinions, findings, and conclusions or recommendations expressed in this material are those of the author and do not necessarily reflect the views of the National Science Foundation.

---

## Contact

**Anthony Howell**
Associate Professor, School of Public Affairs
Director, Center on Technology, Data & Society
Arizona State University
Email: Anthony.Howell@asu.edu
