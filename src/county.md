---
title: County profiles
toc: false
---

# County profiles

Pick a county from the search box, click a county on the **Spatial visualization** page, or jump in from **County comparisons**. Each sparkline shows the county's 2010–2024 trajectory against the national distribution. The legend below the controls explains the line styles and shaded band.

```js
import {METRICS, METRIC_BY_KEY, fmtFips, fmtMetric, fipsForData, CT_PLANNING_REGION_NAMES, CT_BRIDGE, METRIC_INFO} from "./components/utils.js";
import {countySelector} from "./components/countySelector.js";
```

```js
// Load county metadata and the county-year panel as an in-memory array.
// Single GET per file. iqrRows and countyRows below are derived from
// `panel` via JS array operations (no DuckDB-WASM).
const cMeta = await FileAttachment("data/county-meta.json").json();
const _csvText = await FileAttachment("data/county_year_panel_export.csv").text();
const _STR_COLS = new Set(["county", "rucc_tier"]);
const panel = d3.csvParse(_csvText, r => {
  for (const k in r) {
    if (!_STR_COLS.has(k)) r[k] = r[k] === "" ? null : +r[k];
  }
  return r;
});
```

```js
// Read fips from URL ?fips=XXXXX, fall back to NYC (36061) as default.
const urlFips = (() => {
  const p = new URLSearchParams(location.search).get("fips");
  if (p && /^\d{5}$/.test(p)) return p;
  return "36061";
})();
```

```js
const selectedFips = view(countySelector({cMeta, value: urlFips, label: "County"}));
```

```js
const fips = selectedFips || urlFips;
const meta = cMeta[fips] || {name: "Unknown", state: ""};
// CT bridge: historic county FIPS → planning-region FIPS for panel queries
const dataFips = fipsForData(fips);
const isBridged = dataFips !== fips;
const bridgeNote = isBridged
  ? html` <span class="county-bridge-note">→ data from ${CT_PLANNING_REGION_NAMES[dataFips] ?? dataFips}</span>`
  : "";
```

<div class="card county-title">
  <h2>${meta.name}${meta.state ? `, ${meta.state}` : ""} <span class="county-fips-suffix">(FIPS ${fips})</span>${bridgeNote}</h2>
</div>

```js
// IQR per (metric, year) across all counties — independent of the selected
// county, so it lives in its own cell. Observable's reactive runtime caches
// the cell value; switching counties does not re-run this aggregation.
// Implementation: group panel by year, then for each metric column compute
// p25/p50/p75 via d3.quantileSorted on the sorted non-null values for that
// (year, metric). share_remote_or_hybrid is a derived series not in the
// parquet, so we compute it row-wise before sorting.
const metricKeys = METRICS.map(m => m.key);

function quantilesOf(vals) {
  if (!vals.length) return {p25: null, p50: null, p75: null};
  vals.sort((a, b) => a - b);
  return {
    p25: d3.quantileSorted(vals, 0.25),
    p50: d3.quantileSorted(vals, 0.50),
    p75: d3.quantileSorted(vals, 0.75),
  };
}

const iqrRows = Array.from(
  d3.rollup(panel, v => {
    const out = {};
    for (const k of metricKeys) {
      const vals = v.map(r => r[k]).filter(x => x != null);
      const {p25, p50, p75} = quantilesOf(vals);
      out[`${k}_p25`] = p25; out[`${k}_p50`] = p50; out[`${k}_p75`] = p75;
    }
    const rorh = v
      .filter(r => r.share_remote != null || r.share_hybrid != null)
      .map(r => (r.share_remote ?? 0) + (r.share_hybrid ?? 0));
    const q = quantilesOf(rorh);
    out.share_remote_or_hybrid_p25 = q.p25;
    out.share_remote_or_hybrid_p50 = q.p50;
    out.share_remote_or_hybrid_p75 = q.p75;
    return out;
  }, r => r.year),
  ([year, qs]) => ({year, ...qs})
).sort((a, b) => a.year - b.year);
```

```js
// Pull this county's full time series (uses dataFips so CT historic counties
// resolve to their planning region).
const countyRows = panel
  .filter(r => r.county === dataFips)
  .sort((a, b) => a.year - b.year);

// Derived series for share_remote_or_hybrid (NULL pre-2018 because both
// inputs are NULL until Lightcast's structured work-mode tagging began).
const shareRorHSeries = countyRows.map(r => {
  const rem = r.share_remote, hyb = r.share_hybrid;
  if (rem == null && hyb == null) return {year: r.year, value: null};
  return {year: r.year, value: (rem ?? 0) + (hyb ?? 0)};
});
```

```js
// Build a sparkline with IQR band. Width is responsive: 3-column outer grid
// + 2-column inner grid means 6 sparklines across. `width` here is the
// content area width (Observable's reactive variable), already accounting
// for the sidebar. Buffer ~140px reserved for: 3 cards × ~24px padding,
// 2 outer grid gaps × 16px, 3 inner grid gaps × 10px, and SVG margins.
// Slightly conservative so labels like "519,721" don't clip at the right.
const _sparkW = Math.max(160, Math.floor((width - 140) / 6));

function sparkline(metric, county, iqr, customSeries = null) {
  const k = metric.key;
  // customSeries lets callers supply a precomputed {year, value} array for
  // derived metrics (e.g. share_remote_or_hybrid) that aren't columns in
  // the panel parquet.
  const series = customSeries ?? county.map(r => ({year: r.year, value: r[k]}));
  const band   = iqr.map(r => ({year: r.year, p25: r[`${k}_p25`], p50: r[`${k}_p50`], p75: r[`${k}_p75`]}));
  const last   = series[series.length - 1];

  return Plot.plot({
    width: _sparkW,
    // Taller box + bigger top/bottom margins so y-tick labels stay inside
    // the SVG and don't bleed up into the family-label / ⓘ row above.
    height: 100,
    marginTop: 16,
    marginBottom: 24,
    marginLeft: 50,
    marginRight: 16,
    x: {label: null, tickFormat: d => `'${String(d).slice(2)}`, ticks: [2010, 2015, 2020, 2024]},
    y: {label: null, type: metric.scale === "log" ? "log" : "linear", grid: false, ticks: 3},
    marks: [
      Plot.areaY(band, {x: "year", y1: "p25", y2: "p75", fill: "currentColor", fillOpacity: 0.15}),
      Plot.line(band,   {x: "year", y: "p50", stroke: "currentColor", strokeOpacity: 0.5, strokeDasharray: "2,2"}),
      Plot.line(series, {x: "year", y: "value", stroke: "#60a5fa", strokeWidth: 2}),
      Plot.dot(last ? [last] : [], {x: "year", y: "value", fill: "#60a5fa", r: 3.5}),
      Plot.text(last ? [last] : [], {
        x: "year", y: "value",
        text: d => fmtMetric(d.value, metric),
        dx: -6, dy: -9, textAnchor: "end",
        fill: "#60a5fa", fontWeight: "bold", fontSize: 11,
      }),
    ],
  });
}

// Group metrics for layout
function groupMetrics() {
  const groups = new Map();
  for (const m of METRICS) {
    if (!groups.has(m.family)) groups.set(m.family, []);
    groups.get(m.family).push(m);
  }
  return groups;
}
const grouped = groupMetrics();
```

```js
// Explicit three-column layout, one outer card per column, each containing
// multiple metric families stacked vertically. By-employer top-K skills
// live in their own section further down (not as sparklines).
//
// Left:   labor-demand context  → Volume (total + remote-or-hybrid) +
//                                 Skill type mix (specialized + common)
// Middle: structure              → Diversity (RCA breadth + HHI) +
//                                 Skill space position (density + coherence)
// Right:  complexity battery

// Single shared info popover at the top of the family-card section.
// Each metric's ⓘ button opens the popover with that metric's definition,
// or closes it if the same button is clicked again.
const cyInfoPopover = document.createElement("div");
cyInfoPopover.className = "info-popover";
cyInfoPopover.setAttribute("role", "region");
cyInfoPopover.setAttribute("aria-label", "Metric description");
let _activeInfoBtn = null;

function showCountyInfo(metricKey, btn) {
  const info = METRIC_INFO[metricKey];
  if (!info) return;
  const wasActiveSame = _activeInfoBtn === btn && cyInfoPopover.classList.contains("open");
  if (wasActiveSame) {
    cyInfoPopover.classList.remove("open");
    btn.classList.remove("active");
    btn.setAttribute("aria-expanded", "false");
    _activeInfoBtn = null;
    return;
  }
  cyInfoPopover.innerHTML =
    '<button class="info-close" type="button" aria-label="Close">×</button>' +
    `<b>${info.label}</b><br><span style="opacity:0.85">${info.body}</span>`;
  cyInfoPopover.querySelector(".info-close").addEventListener("click", () => {
    cyInfoPopover.classList.remove("open");
    if (_activeInfoBtn) {
      _activeInfoBtn.classList.remove("active");
      _activeInfoBtn.setAttribute("aria-expanded", "false");
    }
    _activeInfoBtn = null;
  });
  cyInfoPopover.classList.add("open");
  if (_activeInfoBtn && _activeInfoBtn !== btn) {
    _activeInfoBtn.classList.remove("active");
    _activeInfoBtn.setAttribute("aria-expanded", "false");
  }
  btn.classList.add("active");
  btn.setAttribute("aria-expanded", "true");
  _activeInfoBtn = btn;
}

function makeInfoBtn(metricKey) {
  if (!METRIC_INFO[metricKey]) return "";
  const btn = document.createElement("button");
  btn.className = "info-btn";
  btn.type = "button";
  btn.textContent = "i";
  const label = `About ${METRIC_INFO[metricKey].label}`;
  btn.title = label;
  btn.setAttribute("aria-label", label);
  btn.setAttribute("aria-expanded", "false");
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    showCountyInfo(metricKey, btn);
  });
  return btn;
}

function renderFamily(family, ms, opts = {}) {
  if (!ms || ms.length === 0) return "";
  const filtered = opts.exclude ? ms.filter(m => !opts.exclude.includes(m.key)) : ms;
  return html`
    <h3>${family}</h3>
    <div class="family-block">
      ${filtered.map(m => html`
        <div>
          <div class="family-label">
            <span>${m.label}</span>${makeInfoBtn(m.key)}
          </div>
          ${sparkline(m, countyRows, iqrRows)}
        </div>
      `)}
    </div>
  `;
}

// Custom rendering for the Posting volume row: total_postings paired with
// the derived share_remote_or_hybrid metric. The derived metric isn't in
// METRICS or METRIC_INFO; it's computed in JS from share_remote + share_hybrid.
const totalPostingsMetric = METRIC_BY_KEY.get("total_postings");
const shareRorHMetric = {
  key: "share_remote_or_hybrid",
  label: "Share remote or hybrid",
  scale: "linear",
  round: 3,
};

function renderPostingVolumeRow() {
  return html`
    <h3>Posting volume</h3>
    <div class="family-block">
      <div>
        <div class="family-label">
          <span>${totalPostingsMetric.label}</span>${makeInfoBtn("total_postings")}
        </div>
        ${sparkline(totalPostingsMetric, countyRows, iqrRows)}
      </div>
      <div>
        <div class="family-label">
          <span>${shareRorHMetric.label}</span>
        </div>
        ${sparkline(shareRorHMetric, countyRows, iqrRows, shareRorHSeries)}
      </div>
    </div>
  `;
}

// County-level annual totals + YoY change charts. Mirror the structure on
// the National Profile (top row) but populated from this county's series.
const countyTotals = countyRows.map(r => ({
  year: r.year, total: r.total_postings ?? 0,
}));

function countyTotalsBars(data) {
  return Plot.plot({
    height: 200,
    marginLeft: 60,
    marginBottom: 36,
    marginTop: 18,
    x: {label: "Year", labelAnchor: "center",
        tickFormat: d => `'${String(d).slice(2)}`,
        ticks: [2010, 2013, 2016, 2019, 2022, 2024]},
    y: {label: "Postings", labelAnchor: "top", tickFormat: "~s", grid: true, ticks: 5},
    marks: [
      Plot.barY(data, {x: "year", y: "total", fill: "#60a5fa",
                       title: d => `${d.year}\n${Number(d.total).toLocaleString()} postings`}),
      Plot.ruleY([0]),
    ],
  });
}

function countyYoyBars(data) {
  const yoy = [];
  for (let i = 1; i < data.length; i++) {
    const prev = Number(data[i - 1].total);
    const cur = Number(data[i].total);
    if (prev > 0) yoy.push({year: data[i].year, pct: 100 * (cur - prev) / prev});
  }
  return Plot.plot({
    height: 200,
    marginLeft: 60,
    marginBottom: 36,
    marginTop: 18,
    x: {label: "Year", labelAnchor: "center",
        tickFormat: d => `'${String(d).slice(2)}`,
        ticks: [2011, 2014, 2017, 2020, 2024]},
    y: {label: "YoY change (%)", labelAnchor: "top", grid: true, ticks: 5,
        tickFormat: d => `${d > 0 ? "+" : ""}${d}%`},
    marks: [
      Plot.barY(yoy, {x: "year", y: "pct",
        fill: d => d.pct >= 0 ? "#60a5fa" : "#f87171",
        title: d => `${d.year}\n${d.pct > 0 ? "+" : ""}${d.pct.toFixed(1)}%`}),
      Plot.ruleY([0]),
    ],
  });
}

display(html`
  <div class="grid grid-cols-2">
    <div class="card card-tight">
      <h3>Total postings per year</h3>
      ${countyTotalsBars(countyTotals)}
    </div>
    <div class="card card-tight">
      <h3>Year-over-year change</h3>
      ${countyYoyBars(countyTotals)}
    </div>
  </div>
`);

// Sparkline legend — applies to every sparkline below. Three glyphs match
// the three Plot marks: focal-county line (solid blue), national-median
// line (dashed light grey), and inter-quartile band (translucent fill).
display(html`
  <div class="sparkline-legend">
    <span class="legend-item">
      <svg width="28" height="10" viewBox="0 0 28 10" role="img" aria-label="Solid blue line">
        <line x1="0" y1="5" x2="28" y2="5" stroke="#60a5fa" stroke-width="2"/>
      </svg>
      this county
    </span>
    <span class="legend-item">
      <svg width="28" height="10" viewBox="0 0 28 10" role="img" aria-label="Dashed line">
        <line x1="0" y1="5" x2="28" y2="5" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" stroke-dasharray="3,2"/>
      </svg>
      national median
    </span>
    <span class="legend-item">
      <svg width="28" height="10" viewBox="0 0 28 10" role="img" aria-label="Shaded band">
        <rect x="0" y="2" width="28" height="6" fill="currentColor" fill-opacity="0.15"/>
      </svg>
      national 25th–75th percentile (IQR)
    </span>
  </div>
`);

display(cyInfoPopover);
display(html`
  <div class="grid grid-cols-3">
    <div class="card card-tight">
      ${renderPostingVolumeRow()}
      ${renderFamily("Skill type mix",              grouped.get("Volume"), {exclude: ["total_postings", "share_software"]})}
    </div>
    <div class="card card-tight">
      ${renderFamily("Diversity and concentration", grouped.get("Skill Specialization"), {exclude: ["mean_skills_per_posting", "n_distinct_skills"]})}
      ${renderFamily("Skill space position",        grouped.get("Network position"), {exclude: ["avg_centrality"]})}
    </div>
    <div class="card card-tight">
      ${renderFamily("Complexity and sophistication", grouped.get("Economic complexity and sophistication"))}
    </div>
  </div>
`);
```

