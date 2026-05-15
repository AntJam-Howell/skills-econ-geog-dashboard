---
title: How to use the dashboard
---

# How to use the dashboard

A short guide to what's in the dashboard, how to read each page, and what the main measures mean. New users should start with **About**, then **How to interpret the main measures**. Power users can skip to **Common workflows**.

## About

All measures are derived from US job postings collected by **Lightcast** (formerly Burning Glass Technologies), 2010 to 2024. Postings are de-duplicated, geocoded to county, and parsed for skills against Lightcast's Open Skills taxonomy.

The aggregation chain runs raw postings → posting × skill → county-skill-year → county-year. What you see in this dashboard is the final county-year panel: 47,891 observations covering 3,194 counties.

Suggested citation: Howell, A. (2026). *Economic Geography of Skill Specialization and Complexity: an interactive dashboard.* Center on Technology, Data & Society, Arizona State University. <https://skills-econ-geog.netlify.app/>

### Acknowledgments

Dashboard built and maintained by **Anthony Howell** (Arizona State University). This material is based upon work supported by the **National Science Foundation under Grant No. 2431853**. Any opinions, findings, and conclusions or recommendations expressed in this material are those of the author and do not necessarily reflect the views of the National Science Foundation.

### Dashboard scope

The dashboard exposes four analytical pages:

- **[Spatial visualization](./)** (landing) — choropleth map of any county-year metric, with low-volume suppression and a year slider.
- **[Rankings & trends](./rankings)** — ranked tables and distribution histograms for any county-year metric, plus four national labor-demand context charts.
- **[County comparisons](./scatter)** — bivariate scatter with a focal-county highlight and Euclidean *k*-nearest-neighbor peer discovery.
- **[County profiles](./county)** — per-county sparkline trajectories grouped by metric family.

## How to interpret the main measures

The metric families below match the optgroups in the metric dropdowns and the family-card sparkline groups on the County profiles. Click the **ⓘ** icon next to any metric in the dashboard for a one-paragraph plain-language definition.

### Skill Specialization

A skill is a **local specialization** when the county's share of mentions of that skill is greater than the national share, equivalently a revealed comparative advantage (RCA > 1) in the skill. RCA pools across all three Lightcast skill types (specialized, software, common).

- **Local specializations** — count of skills where the county is locally specialized. Default landing metric for the map and rankings pages.
- **Average skills per posting** — total skill mentions divided by postings with at least one skill.
- **Distinct skills demanded** — count of unique skill names appearing at least once in the county-year.
- **Skill concentration (HHI)** — Herfindahl-Hirschman index of skill-mention frequencies. Higher means a few skills dominate; lower means many skills evenly distributed.

### Economic complexity and sophistication

- **Economic Complexity Index (ECI)** standardizes the Hidalgo-Hausmann method of reflections. Higher ECI counties have local specializations that are themselves complex — few other counties also specialize in them.
- **Skill fitness** is the Tacchella non-linear alternative to ECI. It rewards counties with many local specializations, especially complex ones, but uses a multiplicative form that handles diversification differently from ECI.
- **Skill entropy** — Shannon entropy of the skill-frequency distribution, in bits. Effective number of skills.
- **Average ubiquity of local specializations** — mean ubiquity (number of other counties also specializing in the same skill) of the focal county's local specializations. Lower means specializing in rarer skills.

### Network position

Where the county's portfolio of local specializations sits in the global skill-relatedness network.

- **Skill density** — average φ-relatedness from each skill the county is NOT specialized in to the county's existing local specializations (Balland et al. 2019). Predicts what the county is likely to acquire next.
- **Skill coherence** — average pairwise relatedness among the county's local specializations (Neffke et al. 2011). Higher means an internally coherent portfolio rather than scattered specializations.
- **Average centrality of local specializations** — mean centrality of local specializations in the global skill-skill network.

### Volume

- **Total postings** — count of unique job postings active in the county-year. The most basic measure of labor demand.
- **Share specialized** — share of skill mentions classified as specialized (technical or domain-specific, like SQL, GAAP, FDA submissions).
- **Share software** — share classified as named software (Excel, AWS, Salesforce).
- **Share common, soft** — share classified as common or soft (communication, teamwork, problem-solving).

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
2. Sparklines are grouped by family. The dashed line is the national median for that year; the grey band is the inter-quartile range across all counties; the colored line + dot is your county.

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

**Connecticut note:** Lightcast adopted the post-2022Q3 planning-region FIPS (09110–09190) for all years, retroactively. RUCC 2023 has also already adopted these FIPS, so every CT planning region appears in the source file with its own RUCC code.

State-level placeholder FIPS (01999, 02999, etc., used by Lightcast for postings without a county assignment) are excluded from the dashboard panel.
