# Geography of Skill Specialization and Complexity

An open-access, interactive dashboard for exploring a U.S. county-year panel of labor and skill demand, 2010–2024. The panel covers 3,194 counties across 15 years (47,126 county-year observations), exposing 19 core measures organized into four groupings: skill specialization, economic complexity, network position, and overall employer demand volume.

The dashboard is designed for researchers, students, and policy users who want to explore the panel without writing code. Every metric in the dashboard has an ⓘ icon next to it; click it for a one-paragraph plain-language definition. For the full variable names, definitions, and background on how each measure is developed and used, see the accompanying working paper:

> Howell, A., Feldman, M., Lanahan, L., Kalathil, N., & Johnson, E. (2026). *Economic geography dataset of labor demand and skill specialization, diversity and complexity.* Working paper, SSRN. https://ssrn.com/abstract=XXXXXXX

**Live dashboard**

> [https://skills-econ-geog.netlify.app/](https://skills-econ-geog.netlify.app/)

**Companion data repository**

> The complete 201-variable county-year panel that this dashboard visualizes, with the full codebook, data dictionary, and reproducible construction pipeline: [skills-econ-geog-data](https://github.com/AntJam-Howell/skills-econ-geog-data)

Source code is released under the MIT License (see `LICENSE`). The underlying data is released separately under CC BY 4.0 in the companion data repository.

---

## What the dashboard offers

Four analytical pages plus a documentation page:

| Page | What it does |
|---|---|
| **Spatial visualization** | County-level choropleth map of any panel metric, with a year slider and Play button to animate 2010–2024. Low-volume county-years are hatched. Default landing metric: local specializations. |
| **Rankings & trends** | Top-25 ranked table for the selected metric and year, distribution histogram, and four national-context time series. |
| **County comparisons** | Bivariate scatter of any two metrics for a selected year, with a focal county and its k-nearest peers highlighted. Optional state filter and minimum-postings threshold. |
| **County profiles** | 15-year trajectory of a single county across the full battery of measures, with family-grouped sparklines and composition stacks for employer entity, work mode, and skill type. |
| **How to use the dashboard** | Layered usage guide: dashboard scope, four numbered workflows, and methodology notes. |

---

## Data source

The dashboard reads a county-year aggregate panel covering 3,194 U.S. counties from 2010 to 2024. The released panel is built from the underlying raw Lightcast (formerly Burning Glass Technologies) job-posting micro data: 929 GB across 22,967 gzipped CSV shards, 433.6 million postings, 2010–2024. The micro data are used under an academic license. The released county-year aggregates are derived statistics computed from those postings, not the postings themselves.

The panel, its codebook, and the full construction pipeline live in the companion repository [skills-econ-geog-data](https://github.com/AntJam-Howell/skills-econ-geog-data).

---

## License

Dashboard source code is released under the **MIT License**. See [`LICENSE`](LICENSE) for the full text.

The underlying data is released separately under **CC BY 4.0** in the [skills-econ-geog-data](https://github.com/AntJam-Howell/skills-econ-geog-data) repository.

---

## Attribution

Dashboard built and maintained by Anthony Howell. Any errors are my own; please submit a [GitHub issue](https://github.com/AntJam-Howell/skills-econ-geog-dashboard/issues) for any errors or suggestions.

---

## Acknowledgments

This material is based upon work supported by the National Science Foundation under Grant No. 2431853. Any opinions, findings, and conclusions or recommendations expressed in this material are those of the author and do not necessarily reflect the views of the National Science Foundation.

---

## Contact

Anthony Howell, Associate Professor, ASU. Email: Anthony.Howell@asu.edu.
