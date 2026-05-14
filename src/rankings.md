---
title: Rankings & trends
toc: false
---

<h1 class="h1-clip">Rankings &amp; trends</h1>
<p class="page-intro">County-level rankings and distributions for any indicator, plus national labor-demand context. Pick a metric and a year; the table and histogram below respond. The four aggregate charts at the bottom are panel-wide totals and do not depend on the selector.</p>

```js
import {METRICS, METRIC_BY_KEY, fmtFips, fmtMetric, METRIC_INFO, metricSelect, makeInfoPopover} from "./components/utils.js";
```

```js
// Load county metadata and the county-year panel as an in-memory array.
// Single GET per file; all queries below are array operations on `panel`.
const cMeta = await FileAttachment("data/county-meta.json").json();
const panel = (await FileAttachment("data/county_year_panel_export.arrow").arrow()).toArray();
```

```js
// Metric selector + info popover, mirroring the Spatial visualization page.
// Independent state from the map page — pick a metric here without
// affecting what's loaded on the map.
const metricEl = metricSelect(
  METRIC_BY_KEY.get("n_rca_skills"),
  METRICS.filter(m => m.family !== "Work mode"),
);

const {btn: infoBtn, popover: infoBox, refresh: refreshInfo} = makeInfoPopover({
  label: "About this metric",
  renderBody: () => {
    const m = metricEl.value;
    const info = METRIC_INFO[m?.key];
    return info ? `<b>${info.label}</b><br><span style="opacity:0.85">${info.body}</span>` : "";
  },
});
metricEl.addEventListener("input", refreshInfo);

display(html`<div class="toolbar">
  <label style="display:inline-flex;align-items:center;gap:0.4rem;">Metric ${metricEl}</label>${infoBtn}
</div>${infoBox}`);

const metric = Generators.input(metricEl);
```

```js
const year = view(Inputs.range([2010, 2024], {label: "Year", step: 1, value: 2024}));
```

```js
// Pull all county-year rows for this (metric, year). Same suppression policy
// as the map: when a metric is flagged with `suppressBelow`, low-volume
// counties drop out of the rankings and the histogram so the page agrees
// with what the map renders.
const suppressBelow = metric.suppressBelow ?? 0;
const hasSuppression = suppressBelow > 0;

// All counties in the selected year, projected to the columns the
// histogram below uses. Used by the rectY/binX mark further down.
const rows = panel
  .filter(r => r.year === year)
  .map(r => ({county: r.county, value: r[metric.key], n_postings: r.total_postings}));
```

```js
const direction = view(Inputs.radio(["highest", "lowest"], {
  label: "Show",
  value: "highest"
}));
```

```js
// Top-25 highest or lowest counties for this (metric, year), respecting
// the per-metric suppression threshold.
const _filtered = panel.filter(r =>
  r.year === year &&
  r[metric.key] != null &&
  (!hasSuppression || r.total_postings >= suppressBelow)
);
const _cmp = direction === "highest"
  ? (a, b) => b[metric.key] - a[metric.key]
  : (a, b) => a[metric.key] - b[metric.key];
const topRows = _filtered.sort(_cmp).slice(0, 25).map(r => ({
  fips: r.county,
  name: cMeta[r.county]?.name ?? "",
  state: cMeta[r.county]?.state ?? "",
  value: r[metric.key],
  postings: r.total_postings,
}));
```

<div class="grid grid-cols-2">
  <div class="card">
    <h2>${direction === "highest" ? "Highest" : "Lowest"} ${metric.label}, ${year}${hasSuppression ? html`<span style="font-size:0.65em;font-weight:normal;opacity:0.7;"> (≥${suppressBelow.toLocaleString()} postings)</span>` : ""}</h2>
    ${Inputs.table(topRows, {
      columns: ["name", "state", "fips", "value", "postings"],
      header: {
        name: "County",
        state: "State",
        fips: "FIPS",
        value: metric.label,
        postings: "Total postings",
      },
      format: {
        value: v => fmtMetric(v, metric),
        postings: v => v?.toLocaleString() ?? "",
      },
      width: {value: 140, postings: 110},
      rows: 25,
      height: 540,
    })}
  </div>
  <div class="card">
    <h2>Distribution across counties, ${year}</h2>
    ${(() => {
      const filtered = rows.filter(r =>
        !hasSuppression || (r.n_postings ?? 0) >= suppressBelow
      );
      let binOpts = {x: "value", thresholds: 30, fill: "#0ea5e9", fillOpacity: 0.85};
      if (metric.scale === "log") {
        const vals = filtered.map(r => r.value).filter(v => v > 0);
        if (vals.length > 0) {
          const lmin = Math.log10(Math.min(...vals));
          const lmax = Math.log10(Math.max(...vals));
          const n = 30;
          binOpts.thresholds = Array.from({length: n + 1}, (_, i) =>
            Math.pow(10, lmin + (lmax - lmin) * i / n)
          );
        }
      }
      return Plot.plot({
        width: Math.min(width / 2 - 40, 600),
        height: 320,
        marginLeft: 60,
        marginBottom: 50,
        x: {
          label: metric.label,
          type: metric.scale === "log" ? "log" : "linear",
          grid: true,
        },
        // Sqrt y-axis softens the long right tail without breaking on zero
        // (which a strict log scale would).
        y: {label: "Number of counties (√ scale)", type: "sqrt", grid: true, ticks: 6},
        marks: [
          Plot.rectY(filtered, Plot.binX({y: "count"}, binOpts)),
          Plot.ruleY([0]),
        ]
      });
    })()}
    <p class="tiny-note">
      Histogram of <b>${metric.label}</b> across all 3,194 counties in ${year}.
    </p>
  </div>
</div>

## National labor demand context

These four charts summarize the whole panel; they don't respond to the metric or year selector above. They establish the baseline labor market — volume, year-over-year change, urbanicity breakdown, and employer-type breakdown — against which the per-county skill metrics on the other pages should be read.

```js
// ─────────────────────────────────────────────────────────────────────────
// National aggregate queries. Independent of the metric selector / year
// slider — these summarize the whole panel and run once on page load.
// ─────────────────────────────────────────────────────────────────────────

// National aggregate rollups via d3.rollup over the in-memory panel.
// 47k rows × 5 reducers ≈ a few ms. Runs once per page load.
const overviewTotals = Array.from(
  d3.rollup(panel, v => d3.sum(v, r => r.total_postings), r => r.year),
  ([year, total]) => ({year, total})
).sort((a, b) => a.year - b.year);

// Reassignment rule: NAICS 9999 (unclassified) postings get rolled into
// Private sector. University (6113-6117), Federal lab (5417, 9271), and
// Government (92xx) are all well-defined NAICS classes, so an unclassified
// posting is almost certainly a private-sector employer Lightcast couldn't
// tag. Staffing firms (NAICS 5613 + company_is_staffing) are excluded
// because they over-represent counties with single big agencies.
const overviewByEmployer = Array.from(
  d3.rollup(panel, v => ({
    "Private sector": d3.sum(v, r => (r.n_corporate ?? 0) + (r.n_unclassified ?? 0)),
    "University":     d3.sum(v, r => r.n_university),
    "Federal lab":    d3.sum(v, r => r.n_federal_lab),
    "Government":     d3.sum(v, r => r.n_government),
  }), r => r.year),
  ([year, sums]) => ({year, ...sums})
).sort((a, b) => a.year - b.year);

const overviewByUrbanicity = Array.from(
  d3.rollup(
    panel.filter(r => r.rucc_tier != null),
    v => ({
      "Large metro":       d3.sum(v.filter(r => r.rucc_tier === "large_metro"),       r => r.total_postings),
      "Small metro":       d3.sum(v.filter(r => r.rucc_tier === "small_metro"),       r => r.total_postings),
      "Nonmetro adjacent": d3.sum(v.filter(r => r.rucc_tier === "nonmetro_adjacent"), r => r.total_postings),
      "Rural":             d3.sum(v.filter(r => r.rucc_tier === "rural"),             r => r.total_postings),
    }),
    r => r.year
  ),
  ([year, sums]) => ({year, ...sums})
).sort((a, b) => a.year - b.year);

// Coverage stats for the popovers: how many postings are in unassigned-FIPS
// (XX999, no county) and in staffing firms — both excluded from their
// respective breakdowns. Reported for 2010 (start) and 2024 (end of panel).
const coverageStats = Array.from(
  d3.rollup(
    panel.filter(r => r.year === 2010 || r.year === 2024),
    v => ({
      unassigned_n: d3.sum(v.filter(r => r.county.endsWith("999")), r => r.total_postings),
      staffing_n:   d3.sum(v, r => r.n_staffing),
      total_n:      d3.sum(v, r => r.total_postings),
    }),
    r => r.year
  ),
  ([year, sums]) => ({year, ...sums})
).sort((a, b) => a.year - b.year);
const cov = Object.fromEntries(coverageStats.map(r => [r.year, {
  unassigned: r.unassigned_n,
  staffing: r.staffing_n,
  total: r.total_n,
  unassignedPct: 100 * r.unassigned_n / Math.max(1, r.total_n),
  staffingPct: 100 * r.staffing_n / Math.max(1, r.total_n),
}]));
const fmtPct = v => v.toFixed(1) + "%";
const fmtN = v => v.toLocaleString();

function pivot(rows, valueCols, categoryName = "category") {
  const out = [];
  for (const r of rows) {
    for (const c of valueCols) {
      out.push({year: Number(r.year), [categoryName]: c, value: Number(r[c]) || 0});
    }
  }
  return out;
}
const employerLong   = pivot(overviewByEmployer, ["Private sector","University","Federal lab","Government"], "type");
const urbanicityLong = pivot(overviewByUrbanicity, ["Large metro","Small metro","Nonmetro adjacent","Rural"], "type");

function totalsBars(data) {
  return Plot.plot({
    height: 240,
    marginLeft: 70,
    marginBottom: 40,
    marginTop: 22,
    x: {
      label: "Year",
      labelAnchor: "center",
      tickFormat: d => `'${String(d).slice(2)}`,
      ticks: [2010, 2013, 2016, 2019, 2022, 2024],
    },
    y: {label: "Postings", labelAnchor: "top", tickFormat: "~s", grid: true, ticks: 6},
    marks: [
      Plot.barY(data, {
        x: "year", y: "total",
        fill: "#60a5fa",
        title: d => `${d.year}\n${Number(d.total).toLocaleString()} postings`,
      }),
      Plot.ruleY([0]),
    ],
  });
}

function overviewLines(data, fields, categoryColors) {
  const safe = data.filter(d => Number(d.value) > 0);
  const vals = safe.map(d => d.value);
  const minV = vals.length ? Math.min(...vals) : 1;
  const maxV = vals.length ? Math.max(...vals) : 10;
  const k0 = Math.floor(Math.log10(minV));
  const k1 = Math.ceil(Math.log10(maxV));
  const yTicks = [];
  for (let k = k0; k <= k1; k++) yTicks.push(10 ** k);

  return Plot.plot({
    height: 240,
    marginLeft: 70,
    marginBottom: 40,
    marginTop: 22,
    x: {
      label: "Year",
      labelAnchor: "center",
      tickFormat: d => `'${String(d).slice(2)}`,
      ticks: [2010, 2013, 2016, 2019, 2022, 2024],
    },
    y: {
      label: "Postings (log scale)",
      labelAnchor: "top",
      type: "log",
      tickFormat: "~s",
      grid: true,
      ticks: yTicks,
      domain: [10 ** k0, 10 ** k1],
    },
    color: {legend: true, domain: fields, range: categoryColors},
    marks: [
      Plot.line(safe, {x: "year", y: "value", stroke: "type", strokeWidth: 2}),
      Plot.dot(safe, {
        x: "year", y: "value",
        fill: "type", r: 2.8, stroke: "type",
        title: d => `${d.type}, ${d.year}\n${Number(d.value).toLocaleString()} postings`,
      }),
    ],
  });
}

function yoyChangeBars(yearlyTotals) {
  const data = [];
  for (let i = 1; i < yearlyTotals.length; i++) {
    const prev = yearlyTotals[i - 1].total;
    const cur = yearlyTotals[i].total;
    data.push({year: yearlyTotals[i].year, pct: 100 * (cur - prev) / prev});
  }
  return Plot.plot({
    height: 240,
    marginLeft: 70,
    marginBottom: 40,
    marginTop: 22,
    x: {label: "Year", labelAnchor: "center",
        tickFormat: d => `'${String(d).slice(2)}`,
        ticks: [2011, 2014, 2017, 2020, 2024]},
    y: {label: "YoY change (%)", labelAnchor: "top", grid: true, ticks: 6,
        tickFormat: d => `${d > 0 ? "+" : ""}${d}%`},
    marks: [
      Plot.barY(data, {x: "year", y: "pct",
        fill: d => d.pct >= 0 ? "#60a5fa" : "#f87171",
        title: d => `${d.year}\n${d.pct > 0 ? "+" : ""}${d.pct.toFixed(1)}%`}),
      Plot.ruleY([0]),
    ],
  });
}

const makeOverviewInfo = (bodyHtml) => makeInfoPopover({bodyHtml, label: "More info"});

const totalsInfo = makeOverviewInfo(`
  <b>Total postings per year</b><br>
  <span style="opacity:0.85">
    National sum of <code>total_postings</code> across all 3,194 US counties.
    Volume grew steadily 2010–2022 with the largest single-year jumps at
    +38% in 2013, +26% in 2018, and +26% in 2021. The 2017→2018 jump is
    partly real growth in employer demand and partly Lightcast enhancing
    its source coverage during that period (additional job-board feeds,
    deduplication updates, taxonomy revisions) — pre- and post-2018
    levels reflect a mix of true demand change and methodology change.
    2020 was essentially flat (+1%); COVID's shock surfaced in skill
    <em>composition</em>, not posting <em>counts</em>. Volume peaked at
    48.6M in 2022, then contracted −20% in 2023 and another −5% in 2024
    as the post-COVID hiring boom cooled.
  </span>
`);
const urbanicityInfo = makeOverviewInfo(`
  <b>Postings by metro tier (USDA RUCC 2023)</b><br>
  <span style="opacity:0.85">
    Total postings split by US Department of Agriculture <a href="https://www.ers.usda.gov/data-products/rural-urban-continuum-codes/" target="_blank" rel="noopener" style="color:inherit;">Rural-Urban Continuum Codes 2023</a> using a 4-tier roll-up:
    <b>Large metro</b> (RUCC 1, ~480 counties in metros of 1M+ population),
    <b>Small metro</b> (RUCC 2–3, ~770 counties in smaller metros),
    <b>Nonmetro adjacent</b> (RUCC 4, 6, 8, ~1,060 nonmetro counties adjacent to a metro), and
    <b>Rural</b> (RUCC 5, 7, 9, ~920 nonmetro counties not adjacent).
    Y-axis is log scale so all four tiers stay visible across the 2017–2018 structural break — each gridline is 10× the previous.
    <br><br>
    State-level placeholder FIPS (XX999 — postings without a county assignment) excluded:
    <b>${fmtPct(cov[2010]?.unassignedPct ?? 0)}</b> of 2010 postings (${fmtN(cov[2010]?.unassigned ?? 0)} of ${fmtN(cov[2010]?.total ?? 0)}) and
    <b>${fmtPct(cov[2024]?.unassignedPct ?? 0)}</b> of 2024 postings (${fmtN(cov[2024]?.unassigned ?? 0)} of ${fmtN(cov[2024]?.total ?? 0)}) fall into this category.
  </span>
`);
const employerInfo = makeOverviewInfo(`
  <b>Postings by employer type</b><br>
  <span style="opacity:0.85">
    Total postings split by employer's NAICS-4 classification:
    <b>University</b> (NAICS 6113–6117),
    <b>Federal lab</b> (NAICS 5417 + 9271),
    <b>Government</b> (NAICS 92xx). The remaining postings — including
    NAICS 9999 (unclassified) — are <b>private sector</b>.
    <br><br>
    <b>Excluded:</b> Staffing firms (NAICS 5613 + the
    <code>company_is_staffing</code> flag) over-represent counties with single
    big agencies. <b>${fmtPct(cov[2010]?.staffingPct ?? 0)}</b> of 2010 postings
    and <b>${fmtPct(cov[2024]?.staffingPct ?? 0)}</b> of 2024 postings.
  </span>
`);
const yoyInfo = makeOverviewInfo(`
  <b>Year-over-year change in total postings (%)</b><br>
  <span style="opacity:0.85">
    Percent change in national total postings vs. the previous year. Blue
    bars are growth, red bars contraction. The 2017→2018 jump (+26%) is
    in line with 2010→2011 (+22%) and 2012→2013 (+38%) — and it's partly
    driven by Lightcast updating and enhancing source-material coverage
    during 2017–2018 (more job-board feeds, deduplication updates,
    taxonomy revisions), so part of the apparent jump reflects methodology
    rather than pure demand growth. The largest single contraction is
    2022→2023 at −20% as the post-COVID hiring boom cooled.
  </span>
`);

display(html`
  <div class="grid grid-cols-2">
    <div class="card">
      <div class="card-header">
        <h3>Total postings per year</h3>${totalsInfo.btn}
      </div>
      ${totalsInfo.popover}
      ${totalsBars(overviewTotals)}
    </div>
    <div class="card">
      <div class="card-header">
        <h3>Year-over-year change</h3>${yoyInfo.btn}
      </div>
      ${yoyInfo.popover}
      ${yoyChangeBars(overviewTotals)}
    </div>
  </div>
  <div class="grid grid-cols-2">
    <div class="card">
      <div class="card-header">
        <h3>Postings by metro tier</h3>${urbanicityInfo.btn}
      </div>
      ${urbanicityInfo.popover}
      ${overviewLines(urbanicityLong, ["Large metro","Small metro","Nonmetro adjacent","Rural"],
                      ["#60a5fa","#a78bfa","#fbbf24","#f87171"])}
    </div>
    <div class="card">
      <div class="card-header">
        <h3>By employer type</h3>${employerInfo.btn}
      </div>
      ${employerInfo.popover}
      ${overviewLines(employerLong, ["Private sector","University","Federal lab","Government"],
                      ["#60a5fa","#a78bfa","#34d399","#fbbf24"])}
    </div>
  </div>
`);
```
