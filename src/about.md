---
title: How to use the dashboard
---

# How to use the dashboard

## About

This dashboard visualizes a county-year aggregate panel of U.S. labor and skill demand covering 3,194 counties from 2010 to 2024 (47,126 county-year observations), exposing 19 core measures organized into five metric families. Access to the complete 201-variable panel, which includes the full suite of economic geography skill-based measures by county and by county × entity type, along with the codebook and the reproducible construction pipeline, lives in the companion repository [skills-econ-geog-data](https://github.com/AntJam-Howell/skills-econ-geog-data).

Every metric in the dashboard has an **ⓘ** icon next to it; click it for a one-paragraph plain-language definition. For additional context on these variable definitions and technical background on how each measure is developed and used, see the accompanying working paper:

> Howell, A., Feldman, M., Lanahan, L., Kalathil, N., & Johnson, E. (2026). *Economic geography dataset of labor demand and skill specialization, diversity and complexity.* Working paper, SSRN. <https://ssrn.com/abstract=XXXXXXX>

## Dashboard scope

The dashboard exposes four analytical pages:

- **[Spatial visualization](./)** (landing): choropleth map of any county-year metric, with low-volume suppression and a year slider.
- **[Rankings & trends](./rankings)**: ranked tables and distribution histograms for any county-year metric, plus four national labor-demand context charts.
- **[County comparisons](./scatter)**: bivariate scatter with a focal-county highlight and Euclidean *k*-nearest-neighbor peer discovery.
- **[County profiles](./county)**: per-county sparkline trajectories grouped by metric family.

## Common workflows

### Pick a starting page based on the question

| You want to… | Start here |
|---|---|
| See how one measure varies across the country | **[Spatial visualization](./)** |
| See ranked counties or how a measure is distributed nationally | **[Rankings & trends](./rankings)** |
| Find counties similar to one you care about | **[County comparisons](./scatter)** with a focal county + "Show similar counties" |
| Track one county's trajectory across 15 years | **[County profiles](./county)** |
| Know what a measure means | Click the **ⓘ** icon next to it |

### Workflow 1 — Where does my county stand on a measure?

1. Open **[Spatial visualization](./)**.
2. Pick a metric from the dropdown. The map colors all 3,194 counties.
3. Drag the **Year slider** or click **▶ Play 2010–2024** to watch the map evolve.
4. Hover any county for its value; click to open it on the **[County profiles](./county)** page.
5. For the ranked top-25 table and a national distribution histogram of the same metric, switch to **[Rankings & trends](./rankings)**.

Tip: the color scale stays stable as the year changes so colors are comparable year-to-year.

### Workflow 2 — What does this county look like in detail?

1. Open **[County profiles](./county)**. Type a name, state, or FIPS in the selector at the top.
2. Sparklines are grouped by family. The dashed line is the national median for that year; the grey band is the inter-quartile range across all counties; the colored line and dot is your county.

### Workflow 3 — How are two measures related?

1. Open **[County comparisons](./scatter)**. Don't turn on the focal county.
2. Pick X and Y axes in the Controls panel.
3. The chart shows one dot per county, sized by total postings, with a red regression line. The header above reports the sample size and Pearson *r*.
4. Turn on **Color by residual** to see which counties sit above (blue) and below (red) the line.
5. Use the **Year slider** to check whether the relationship holds across years, or **State filter** to restrict the cloud to one state.

### Workflow 4 — Who are this county's peers?

1. Open **[County comparisons](./scatter)**.
2. Scroll down to the **Controls** panel. Turn on **Highlight focal county** and pick one. Turn on **Show similar counties** and pick a *k*.
3. The chart shows the cloud in muted blue, your county in gold with a label, and its *k* nearest neighbors in teal.
4. Below the chart, expand the "Top *k* similar counties" disclosure for a ranked list. Click any name to open its profile.

Tip: the peer group depends on which two metrics you put on the axes. **Economic Complexity Index × Total postings** finds large complex metros; **Skill density × Skill coherence** finds peers by where they sit in the skill-relatedness network.

## Methodology

### Low-volume suppression on the map

Some metrics behave badly when computed from a small posting base. They don't fail gracefully, they go to extreme values that look like real signal. To prevent the choropleth from rewarding tiny rural counties as more "specialized" than New York, low-volume county-years are **suppressed on the choropleth and rendered with a diagonal-hatch pattern**, the standard cartographic convention for "no data / suppressed" used by the Census, BLS, and the Federal Reserve.

The threshold is **100 postings** for all suppressed metrics. Below that, a single employer typically dominates the underlying skill base, which inflates shares and breaks the diversity, concentration, and skill-space-position measures. The threshold is deliberately permissive: combined with the hatch rendering, the visual signal stays clean without disqualifying the long tail of small-but-real labor markets like university towns and county seats.

The "Show suppressed counties" toggle on the map lets you see the underlying values. When on, suppressed counties render with their full color fill plus a translucent hatch overlay. Default ON.

### County urbanicity classification (USDA RUCC 2023)

The "Postings by metro tier" panel and the `rucc_tier` column come from the **USDA Economic Research Service Rural-Urban Continuum Codes 2023**, the canonical source for U.S. county urbanicity classification. The dashboard collapses the 9-code RUCC into a 4-tier scheme.

Source: <https://www.ers.usda.gov/data-products/rural-urban-continuum-codes/>.

## Attribution

Dashboard built and maintained by Anthony Howell. Any errors are my own; please submit a GitHub issue for any errors or suggestions: [Link](https://github.com/AntJam-Howell/skills-econ-geog-dashboard).

## Acknowledgments

This material is based upon work supported by the National Science Foundation under Grant No. 2431853. Any opinions, findings, and conclusions or recommendations expressed in this material are those of the author and do not necessarily reflect the views of the National Science Foundation.
