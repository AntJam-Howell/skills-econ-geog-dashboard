---
title: County comparisons
toc: false
---

# County comparisons

Pick any two metrics, a year, and optionally a focal county. Each dot is a county, sized by total postings. Hover for county name and values; click to open that county on the **County profiles** page. Highlight a focal county to see where it sits in the cloud, then toggle "Show similar counties" to surface its k nearest peers in this 2D space — useful both for bivariate analysis and for finding economic peers across the volume, composition, diversity, network, and complexity families.

```js
import {METRICS, METRIC_BY_KEY, fmtFips, fmtMetric, metricSelect, makeInfoPopover} from "./components/utils.js";
import {countySelector} from "./components/countySelector.js";
```

```js
// Load county metadata and the county-year panel as an in-memory array.
// Single GET per file; the scatter query below is an array filter + map.
const cMeta = await FileAttachment("data/county-meta.json").json();
const panel = (await FileAttachment("data/county_year_panel_export.arrow").arrow()).toArray();
```

```js
// Read URL params for deep-linking:
//   ?x=<metric>&y=<metric>&year=<year>&min=<n>&fips=<fips>&similar=true&k=<n>
const urlParams = new URLSearchParams(location.search);
const xDefault    = METRIC_BY_KEY.get(urlParams.get("x")) ?? METRIC_BY_KEY.get("total_postings");
const yDefault    = METRIC_BY_KEY.get(urlParams.get("y")) ?? METRIC_BY_KEY.get("n_rca_skills");
const yearParam   = parseInt(urlParams.get("year"));
const yearDefault = (yearParam >= 2010 && yearParam <= 2024) ? yearParam : 2024;
const minParam    = parseInt(urlParams.get("min"));
const minDefault  = (minParam >= 0 && minParam <= 50000) ? minParam : 100;
const urlFips     = (urlParams.get("fips") || "").replace(/[^\d]/g, "").padStart(5, "0");
const hasUrlFips  = /^\d{5}$/.test(urlFips) && cMeta[urlFips] != null;
const urlSimilar  = urlParams.get("similar") === "true";
const urlK        = parseInt(urlParams.get("k"));
const kDefault    = (urlK >= 5 && urlK <= 50) ? urlK : 10;
```

```js
// ─────────────────────────────────────────────────────────────────────────
// Build every input ELEMENT here without calling display() yet. Each gets
// a reactive value via Generators.input(). The chart cell (top of page)
// reads those values; the Controls cell (bottom of page) renders the
// elements in a grouped panel. Observable resolves reactive variables by
// name regardless of source position, so the chart correctly re-renders
// when any input changes even though the elements appear later in the DOM.
// ─────────────────────────────────────────────────────────────────────────

const scatterMetrics = METRICS.filter(m => m.family !== "Work mode");

const xMetricEl = metricSelect(xDefault, scatterMetrics);
const yMetricEl = metricSelect(yDefault, scatterMetrics);
const xMetric = Generators.input(xMetricEl);
const yMetric = Generators.input(yMetricEl);

const yearEl = Inputs.range([2010, 2024], {
  label: "Year",
  step: 1,
  value: yearDefault,
});
const year = Generators.input(yearEl);

const minPostingsEl = Inputs.range([0, 50000], {
  label: "Minimum total postings",
  step: 100,
  value: minDefault,
});
const minPostings = Generators.input(minPostingsEl);

// State filter — workforce boards / state planners often want to see only
// their state's counties relative to each other (and to the national fit
// line). "All states" is the default.
const allStates = [...new Set(Object.values(cMeta).map(m => m.state).filter(Boolean))].sort();
const stateFilterEl = Inputs.select(["All states", ...allStates], {
  label: "State filter",
  value: "All states",
});
const stateFilter = Generators.input(stateFilterEl);

const residualModeEl = Inputs.toggle({
  label: "Color by residual (above/below regression line)",
  value: true,
});
const residualMode = Generators.input(residualModeEl);

const focalToggleEl = Inputs.toggle({
  label: "Highlight focal county",
  value: hasUrlFips,
});
const focalToggle = Generators.input(focalToggleEl);

const focalFipsRawEl = countySelector({
  cMeta,
  value: hasUrlFips ? urlFips : "36061",
  label: "Focal county",
});
const focalFipsRaw = Generators.input(focalFipsRawEl);

const similarToggleEl = Inputs.toggle({
  label: "Show similar counties",
  value: hasUrlFips && urlSimilar,
});
const similarToggle = Generators.input(similarToggleEl);

const kEl = Inputs.range([5, 50], {
  label: "k (number of peers)",
  step: 1,
  value: kDefault,
});
const k = Generators.input(kEl);
```

```js
// Reactively sync the `disabled` attribute on similar-toggle / k-slider
// based on focal-toggle and similar-toggle. The input elements are stable
// across this cell's re-runs (we mutate their underlying <input> directly),
// so we only need to flip the disabled property.
{
  const tgl = similarToggleEl.querySelector("input");
  if (tgl) tgl.disabled = !focalToggle;
}
{
  const inp = kEl.querySelector("input");
  if (inp) inp.disabled = !focalToggle || !similarToggle;
}
```

```js
// Controls panel rendered above the chart. Three cards: axes & filters
// (left), focal county controls (middle), peer-discovery controls (right).
// Each input was created above with Generators.input so the chart reacts
// to changes here.
display(html`
  <div class="grid grid-cols-3 scatter-controls">
    <div class="card card-tight">
      <h3 class="h3-flush">Axes &amp; filters</h3>
      <label class="ctl-row">X axis ${xMetricEl}</label>
      <label class="ctl-row">Y axis ${yMetricEl}</label>
      ${yearEl}
      ${minPostingsEl}
      ${stateFilterEl}
      ${residualModeEl}
    </div>
    <div class="card card-tight">
      <h3 class="h3-flush">Focal county</h3>
      ${focalToggleEl}
      ${focalFipsRawEl}
    </div>
    <div class="card card-tight">
      <h3 class="h3-flush">Find similar peers</h3>
      ${similarToggleEl}
      ${kEl}
      <p class="employer-help-line">
        Computes k-nearest neighbors to the focal county using Euclidean distance in the displayed 2D space. Different axes surface different peer groups.
      </p>
    </div>
  </div>
`);
```

```js
// Year-by-year 1%/99% winsorization for metrics flagged with `winsorize: true`
// in METRICS (currently n_distinct_skills and share_specialized). Compute
// p1/p99 from non-null county-level values in the selected year, then clip
// extreme values into that range. Skip the bounds computation when neither
// axis is winsorized.
//
// Exclude state-level placeholder FIPS (XX999, used by Lightcast for
// postings whose specific county couldn't be identified). 51 such codes
// — one per state + DC + territories — and they cluster around major
// state aggregates that distort the scatter (e.g., 12999 in FL with
// 36k postings appearing as a "phantom" county). Real county FIPS never
// end in 999 since the Census reserves that suffix for "unknown".
const wx = xMetric.winsorize === true;
const wy = yMetric.winsorize === true;

// Year-restricted set with both axes non-null and state-level FIPS dropped.
// Bounds for winsorization come from this set; the displayed point set
// further filters on minPostings.
const _yearRows = panel.filter(r =>
  r.year === year &&
  r[xMetric.key] != null &&
  r[yMetric.key] != null &&
  !r.county.endsWith("999")
);

let xLo = -Infinity, xHi = Infinity, yLo = -Infinity, yHi = Infinity;
if (wx) {
  const xv = _yearRows.map(r => r[xMetric.key]).sort((a, b) => a - b);
  xLo = d3.quantileSorted(xv, 0.01);
  xHi = d3.quantileSorted(xv, 0.99);
}
if (wy) {
  const yv = _yearRows.map(r => r[yMetric.key]).sort((a, b) => a - b);
  yLo = d3.quantileSorted(yv, 0.01);
  yHi = d3.quantileSorted(yv, 0.99);
}

const _clamp = (v, lo, hi) => Math.max(Math.min(v, hi), lo);

const allPoints = _yearRows
  .filter(r => r.total_postings >= minPostings)
  .map(r => ({
    fips: r.county,
    name: cMeta[r.county]?.name ?? "",
    state: cMeta[r.county]?.state ?? "",
    x: wx ? _clamp(r[xMetric.key], xLo, xHi) : r[xMetric.key],
    y: wy ? _clamp(r[yMetric.key], yLo, yHi) : r[yMetric.key],
    n: r.total_postings,
  }));

// Apply the state filter post-load. We pull the full national set from
// SQL so the user can pivot between states without re-querying.
const points = stateFilter === "All states"
  ? allPoints
  : allPoints.filter(p => p.state === stateFilter);
```

```js
// Compute Pearson correlation for the displayed sample
function pearson(arr, fx, fy) {
  let n = 0, mx = 0, my = 0, sxx = 0, syy = 0, sxy = 0;
  for (const d of arr) {
    const x = fx(d), y = fy(d);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    n++;
    const dx = x - mx, dy = y - my;
    mx += dx / n; my += dy / n;
    sxx += dx * (x - mx);
    syy += dy * (y - my);
    sxy += dx * (y - my);
  }
  return n > 1 ? sxy / Math.sqrt(sxx * syy) : NaN;
}

const r = pearson(points, d => d.x, d => d.y);
```

```js
// Build explicit decade ticks for log scales, derived from the actual data
// range. Suppresses Plot's default minor subdivisions (200, 300, ..., 900
// within each decade) by passing an explicit numeric array.
function decadeTicks(values) {
  const finite = values.filter(v => Number.isFinite(v) && v > 0);
  if (finite.length === 0) return undefined;
  const lo = Math.min(...finite);
  const hi = Math.max(...finite);
  const k0 = Math.floor(Math.log10(lo));
  const k1 = Math.ceil(Math.log10(hi));
  const ticks = [];
  for (let kk = k0; kk <= k1; kk++) ticks.push(10 ** kk);
  return ticks;
}

// Tricube-weighted local linear regression (LOESS). Plot doesn't ship a
// LOESS mark, so we compute the smoothed curve in JS and render it via
// Plot.line. bandwidth is the fraction of points in each local window;
// 0.3 = 30% of the data, which gives a smoothly varying fit without
// over-smoothing the L-shape on density-vs-coherence.
function computeLoess(pts, bandwidth = 0.3) {
  const sorted = [...pts]
    .filter(p => Number.isFinite(p.x) && Number.isFinite(p.y))
    .sort((a, b) => a.x - b.x);
  const n = sorted.length;
  if (n < 5) return [];
  const kk = Math.max(3, Math.floor(bandwidth * n));
  const out = [];
  for (let i = 0; i < n; i++) {
    const xi = sorted[i].x;
    const dists = sorted.map((p, j) => ({j, d: Math.abs(p.x - xi)}));
    dists.sort((a, b) => a.d - b.d);
    const nearest = dists.slice(0, kk);
    const maxD = nearest[kk - 1].d || 1;
    let sw = 0, swx = 0, swy = 0, swxx = 0, swxy = 0;
    for (const {j, d} of nearest) {
      const u = d / maxD;
      const w = u >= 1 ? 0 : Math.pow(1 - u * u * u, 3);
      const x = sorted[j].x, y = sorted[j].y;
      sw += w; swx += w * x; swy += w * y;
      swxx += w * x * x; swxy += w * x * y;
    }
    const denom = sw * swxx - swx * swx;
    let slope = 0, intercept = sw > 0 ? swy / sw : 0;
    if (Math.abs(denom) > 1e-12) {
      slope = (sw * swxy - swx * swy) / denom;
      intercept = (swy - slope * swx) / sw;
    }
    out.push({x: xi, y: intercept + slope * xi});
  }
  return out;
}

// Pair-specific overrides for axis scales and regression type:
//   - Total postings vs n_rca_skills: power-law relationship → force y
//     onto log scale (n_rca_skills is otherwise linear). Linear regression
//     on log-log axes recovers the power-law exponent.
//   - Skill density vs Skill coherence: nonlinear L-shape → swap linear
//     regression for LOESS so the fit captures the curvature.
const xKey = xMetric.key, yKey = yMetric.key;
const isPowerLawPair =
  (xKey === "total_postings" && yKey === "n_rca_skills") ||
  (xKey === "n_rca_skills" && yKey === "total_postings");
const isLoessPair =
  (xKey === "skill_density" && yKey === "skill_coherence") ||
  (xKey === "skill_coherence" && yKey === "skill_density");

const xLog = xMetric.scale === "log" || (isPowerLawPair && xKey === "n_rca_skills");
const yLog = yMetric.scale === "log" || (isPowerLawPair && yKey === "n_rca_skills");

const fitMark = isLoessPair
  ? Plot.line(computeLoess(points, 0.3), {x: "x", y: "y", stroke: "#dc2626", strokeWidth: 2})
  : Plot.linearRegressionY(points, {x: "x", y: "y", stroke: "#dc2626", strokeWidth: 1.5});

// Residuals = actual y minus fit-predicted y, computed in the SAME space
// the regression operates in (log-transformed when an axis is log) so the
// sign of the residual matches "above or below the visible regression
// line". Linear pair: closed-form OLS slope/intercept. LOESS pair:
// interpolate within the precomputed loess fit.
function computeResiduals(pts, fitKind, xLog, yLog) {
  const tf = (v, isLog) => isLog ? (v > 0 ? Math.log10(v) : NaN) : Number(v);
  const xs = pts.map(d => tf(d.x, xLog));
  const ys = pts.map(d => tf(d.y, yLog));

  if (fitKind === "loess") {
    const tfPts = pts
      .map((d, i) => ({x: xs[i], y: ys[i]}))
      .filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
    const fit = computeLoess(tfPts, 0.3).sort((a, b) => a.x - b.x);
    return pts.map((d, i) => {
      const xi = xs[i], yi = ys[i];
      if (!Number.isFinite(xi) || !Number.isFinite(yi) || fit.length === 0) {
        return {...d, residual: 0};
      }
      let lo = 0, hi = fit.length - 1;
      while (lo < hi - 1) {
        const mid = (lo + hi) >> 1;
        if (fit[mid].x <= xi) lo = mid; else hi = mid;
      }
      const a = fit[lo], b = fit[hi];
      const pred = a.x === b.x ? a.y : a.y + (b.y - a.y) * (xi - a.x) / (b.x - a.x);
      return {...d, residual: yi - pred};
    });
  }
  // Linear OLS in the (possibly transformed) space.
  let n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < pts.length; i++) {
    if (Number.isFinite(xs[i]) && Number.isFinite(ys[i])) {
      n++; sx += xs[i]; sy += ys[i];
      sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i];
    }
  }
  const denom = n * sxx - sx * sx;
  const slope = denom !== 0 ? (n * sxy - sx * sy) / denom : 0;
  const intercept = n > 0 ? (sy - slope * sx) / n : 0;
  return pts.map((d, i) => ({
    ...d,
    residual: Number.isFinite(xs[i]) && Number.isFinite(ys[i])
      ? ys[i] - (intercept + slope * xs[i])
      : 0,
  }));
}

const dotData = residualMode
  ? computeResiduals(points, isLoessPair ? "loess" : "linear", xLog, yLog)
  : points;

// Resolve focal county and (optionally) its k-NN peer set in this 2D view.
// kNN distance is computed in the *transformed* axis space so log-scale
// axes use log distance — reflects order-of-magnitude similarity rather
// than raw count similarity.
const focalFips = focalToggle ? focalFipsRaw : null;
const focal = focalFips ? dotData.find(d => d.fips === focalFips) : null;

let peerSet = new Set();
if (focal && similarToggle) {
  const tf = (v, isLog) => isLog ? (v > 0 ? Math.log10(v) : NaN) : Number(v);
  const fx = tf(focal.x, xLog);
  const fy = tf(focal.y, yLog);
  const xs = dotData.map(d => tf(d.x, xLog)).filter(Number.isFinite);
  const ys = dotData.map(d => tf(d.y, yLog)).filter(Number.isFinite);
  const xRange = (Math.max(...xs) - Math.min(...xs)) || 1;
  const yRange = (Math.max(...ys) - Math.min(...ys)) || 1;
  const peers = dotData
    .filter(d => d.fips !== focalFips)
    .map(d => {
      const tx = tf(d.x, xLog), ty = tf(d.y, yLog);
      if (!Number.isFinite(tx) || !Number.isFinite(ty) || !Number.isFinite(fx) || !Number.isFinite(fy)) {
        return {fips: d.fips, dist: Infinity};
      }
      const dx = (tx - fx) / xRange;
      const dy = (ty - fy) / yRange;
      return {fips: d.fips, dist: Math.sqrt(dx * dx + dy * dy)};
    })
    .sort((a, b) => a.dist - b.dist)
    .slice(0, k)
    .map(p => p.fips);
  peerSet = new Set(peers);
}

const peerData = focal ? dotData.filter(d => peerSet.has(d.fips)) : [];

// Compose marks. Order is z-order: cloud at the bottom, fit line, peer
// dots, focal dot + label on top.
const marks = [];
marks.push(
  Plot.dot(dotData, {
    x: "x",
    y: "y",
    r: d => Math.sqrt(d.n + 1),
    fill: focal
      ? "#3b6c8c"
      : (residualMode ? d => d.residual >= 0 ? "#60a5fa" : "#f87171" : "#0ea5e9"),
    fillOpacity: focal ? 0.30 : 0.5,
    stroke: focal
      ? "#1d3a52"
      : (residualMode ? d => d.residual >= 0 ? "#1d4ed8" : "#b91c1c" : "#075985"),
    strokeOpacity: focal ? 0.6 : 0.7,
    strokeWidth: 0.5,
    title: d => `${d.name}, ${d.state} (${d.fips})\n${xMetric.label}: ${fmtMetric(d.x, xMetric)}\n${yMetric.label}: ${fmtMetric(d.y, yMetric)}\nTotal postings: ${d.n.toLocaleString()}${residualMode && !focal ? `\nResidual: ${d.residual >= 0 ? "above" : "below"} the regression line` : ""}`,
    href: d => `./county?fips=${d.fips}`,
    target: "_self",
  }),
  fitMark,
);
if (focal && peerData.length) {
  marks.push(Plot.dot(peerData, {
    x: "x",
    y: "y",
    r: d => Math.max(6, Math.sqrt(d.n + 1)),
    fill: "#2dd4bf",
    fillOpacity: 0.85,
    stroke: "#0f766e",
    strokeWidth: 1.2,
    title: d => `Similar peer\n${d.name}, ${d.state} (${d.fips})\n${xMetric.label}: ${fmtMetric(d.x, xMetric)}\n${yMetric.label}: ${fmtMetric(d.y, yMetric)}\nTotal postings: ${d.n.toLocaleString()}`,
    href: d => `./county?fips=${d.fips}`,
    target: "_self",
  }));
}
if (focal) {
  marks.push(Plot.dot([focal], {
    x: "x",
    y: "y",
    r: d => Math.max(10, Math.sqrt(d.n + 1) * 1.4),
    fill: "#fbbf24",
    fillOpacity: 0.95,
    stroke: "#78350f",
    strokeWidth: 1.6,
    title: d => `Focal: ${d.name}, ${d.state} (${d.fips})\n${xMetric.label}: ${fmtMetric(d.x, xMetric)}\n${yMetric.label}: ${fmtMetric(d.y, yMetric)}\nTotal postings: ${d.n.toLocaleString()}`,
    href: d => `./county?fips=${d.fips}`,
    target: "_self",
  }));
  marks.push(Plot.text([focal], {
    x: "x",
    y: "y",
    text: d => `${d.name}, ${d.state}`,
    dy: -16,
    fontWeight: 700,
    fontSize: 12,
    fill: "#fbbf24",
    stroke: "#000",
    strokeWidth: 3,
    paintOrder: "stroke",
  }));
}

// Precompute decade ticks. When both axes are log AND their smallest
// decade matches (e.g. Total postings × Local specializations — both
// start at 100), the corner renders a tick label from each axis stacked
// on the same pixel. Drop the smallest x-tick so only the y-tick prints
// at the corner.
const xDecades = xLog ? decadeTicks(points.map(d => d.x)) : null;
const yDecades = yLog ? decadeTicks(points.map(d => d.y)) : null;
const xTicksFinal = (xDecades && yDecades && xDecades[0] === yDecades[0] && xDecades.length > 1)
  ? xDecades.slice(1)
  : xDecades;

display(Plot.plot({
  width: width,
  height: Math.max(540, Math.min(740, width * 0.55)),
  // Generous margins so axis labels and the highest / right-most tick
  // labels don't get clipped by the SVG bounding box.
  marginLeft: 110,
  marginRight: 55,
  marginTop: 40,
  marginBottom: 82,
  style: {fontSize: "14px"},
  x: {
    label: xMetric.label,
    labelAnchor: "center",
    labelOffset: 55,
    type: xLog ? "log" : "linear",
    grid: true,
    ticks: xLog ? xTicksFinal : 6,
    // tickPadding pushes tick labels away from the axis line; without it
    // the bottom-left x-tick label collides with the left-most y-tick
    // label on log-log pairs.
    tickPadding: 8,
  },
  y: {
    label: yMetric.label,
    labelAnchor: "center",
    labelOffset: 78,
    type: yLog ? "log" : "linear",
    grid: true,
    ticks: yLog ? yDecades : 6,
    tickPadding: 8,
  },
  r: {range: [2, 14]},
  marks,
}));
```

<div class="card scatter-stats">
  <p>
    <b>${points.length.toLocaleString()}</b> counties shown
    (${year}${stateFilter !== "All states" ? html`, <b>${stateFilter}</b> only` : ""},
    total postings ≥ ${minPostings.toLocaleString()}).
    Pearson r = <b>${r.toFixed(3)}</b>.${needsWinsor ? html`<span class="muted-note"> Winsorized at 1%/99% within ${year}: ${[wx && xMetric.label, wy && yMetric.label].filter(Boolean).join(", ")}.</span>` : ""}${residualMode && !focalToggle ? html`<span class="muted-note"> <span style="color:#60a5fa">Blue</span> = above regression line; <span style="color:#f87171">red</span> = below.</span>` : ""}${focalToggle ? html`<span class="muted-note"> Focal: <b style="color:#fbbf24">${cMeta[focalFipsRaw]?.name ?? "?"}, ${cMeta[focalFipsRaw]?.state ?? "?"}</b>.${similarToggle ? html` Similar counties: top <b style="color:#2dd4bf">${k}</b> by Euclidean distance in this 2D view.` : ""}</span>` : ""}
  </p>
</div>

```js
// Peer table — when a focal is set + similar mode is on, render the k-NN
// peers as a compact ordered list. Helpful to read off the ranked results
// without needing tooltip hover.
if (focal && similarToggle && peerData.length) {
  // Pre-compute axis ranges and the transformed focal coordinates ONCE.
  const tf = (v, isLog) => isLog ? (v > 0 ? Math.log10(v) : NaN) : Number(v);
  const fx = tf(focal.x, xLog), fy = tf(focal.y, yLog);
  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
  for (const p of dotData) {
    const tx = tf(p.x, xLog), ty = tf(p.y, yLog);
    if (Number.isFinite(tx)) { if (tx < xMin) xMin = tx; if (tx > xMax) xMax = tx; }
    if (Number.isFinite(ty)) { if (ty < yMin) yMin = ty; if (ty > yMax) yMax = ty; }
  }
  const xR = (xMax - xMin) || 1;
  const yR = (yMax - yMin) || 1;
  const ordered = peerData.map(d => {
    const tx = tf(d.x, xLog), ty = tf(d.y, yLog);
    const dx = (tx - fx) / xR, dy = (ty - fy) / yR;
    return {...d, dist: Math.sqrt(dx * dx + dy * dy)};
  }).sort((a, b) => a.dist - b.dist);

  display(html`<details class="card peer-details">
    <summary>
      Top ${k} similar counties to ${cMeta[focalFips]?.name}, ${cMeta[focalFips]?.state}
      <span class="peer-hint">— click to expand</span>
    </summary>
    <ol class="peer-list">
      ${ordered.map(d => html`<li><a href="./county?fips=${d.fips}">${d.name}, ${d.state}</a> <span class="muted-note">(${xMetric.label}: ${fmtMetric(d.x, xMetric)}, ${yMetric.label}: ${fmtMetric(d.y, yMetric)})</span></li>`)}
    </ol>
    <p class="peer-footnote">Counties shown by Euclidean distance in this 2D view; choose different axes to see different peer groups.</p>
  </details>`);
}
```

## Featured analyses

```js
// Per-pair info button + popover. Uses the shared helper from utils.js
// (consistent ARIA, close handling) and adapts {btn, popover} → {btn, pop}
// for the rendering below.
const makePairInfo = (bodyHtml) => {
  const {btn, popover} = makeInfoPopover({bodyHtml, label: "Full interpretation"});
  return {btn, pop: popover};
};

const pair1 = makePairInfo(`
  <span style="opacity:0.85">
  The fitted line is a power law with exponent β around 0.6–0.7 — sublinear
  scaling, so larger labor markets accumulate specialized skills faster than
  small ones in absolute terms but slower than proportional. Counties above
  the line are more diversified than their size would suggest — typically
  university towns, federal-lab counties, and regional capitals (Boulder CO,
  Madison WI, Princeton NJ, Burlington VT). Counties below the line have
  narrower specialization for their size — typically single-industry counties
  (oil and gas, military bases, manufacturing-only).
  </span>
`);
const pair2 = makePairInfo(`
  <span style="opacity:0.85">
  Counties ranked highly by ECI are also ranked highly by fitness. For
  top-tier complex counties (NYC, Santa Clara, Suffolk MA, King WA),
  either metric works equivalently. Disagreement concentrates at low
  complexity, where similar ECI values can correspond to fitness values
  spanning 3–4 orders of magnitude. Counties above the line have
  spike-like specialization in a few highly complex skills (favored by
  fitness's amplification); counties below have broad-but-shallow
  specialization (favored by ECI's diversification weighting).
  </span>
`);
const pair3 = makePairInfo(`
  <span style="opacity:0.85">
  Counties with low coherence and high density (top-left, e.g., NYC,
  Santa Clara, Suffolk MA, King WA) span many regions of the skill space
  simultaneously: their portfolios cover unrelated industries, so the
  broader skill universe always has neighbors close to something they
  already do. Counties with high coherence and low density (bottom-right)
  have deeply focused specializations that exhaust their immediate
  neighborhood; they've maximized depth at the cost of optionality. The
  relationship steepens at low coherence and saturates at high coherence;
  meaningful differentiation happens mainly in the diversified regime.
  </span>
`);
const pair4 = makePairInfo(`
  <span style="opacity:0.85">
  Highlighting Suffolk MA on this view places it among the highest-complexity,
  highest-volume counties in the country. Toggling "Show similar counties"
  surfaces NYC, Cambridge MA, San Francisco, and Washington DC — all
  large-metro labor markets with diversified high-complexity portfolios
  (finance, biotech, consulting, federal research). The peer group reflects
  what makes Suffolk distinct as a labor market: scale plus complexity, not
  one or the other alone.
  </span>
`);
const pair5 = makePairInfo(`
  <span style="opacity:0.85">
  Boulder anchors a recognizable cluster of small-metro university towns
  in the upper-left of the density-coherence space: high density (the
  broader skill universe is full of neighbors close to its existing
  research specializations) paired with relatively low coherence (its
  specializations span unrelated areas — atmospheric science, aerospace
  engineering, biotech). Toggling "Show similar counties" surfaces
  Madison WI, Princeton NJ, Ithaca NY, Champaign IL, and similar
  research-anchored small metros — the cohort that policy work on
  knowledge spillovers usually wants to compare against.
  </span>
`);
const pair6 = makePairInfo(`
  <span style="opacity:0.85">
  King County WA (Seattle) sits in the upper-right of share_specialized ×
  ECI: an unusually technical posting mix (over half of all skill
  mentions are specialized rather than software-named or common) paired
  with one of the highest complexity scores in the country. That
  combination is the high-tech-high-skill signature — both the
  <em>content</em> of demand (specialized over generic) and its
  <em>sophistication</em> (rare-and-complex over common) point in the
  same direction. Toggling "Show similar counties" surfaces Santa Clara
  CA, San Mateo CA, Suffolk MA, and Travis TX — peer tech / biotech /
  research metros, all of which share the same upper-right corner.
  </span>
`);
display(html`
  <div class="grid grid-cols-2">
    <div class="card">
      <h3 class="h3-flush">Bivariate analyses</h3>
      <p class="muted-note-strong" style="margin: 0 0 0.6rem 0; font-size: 0.92em;">
        Pick a pair of metrics; explore the cloud and the regression fit. The
        residual coloring (default ON) highlights counties above versus below
        the fit line — usually the policy-relevant outliers.
      </p>
      <ol class="feature-list">
        <li>
          <a href="?x=total_postings&y=n_rca_skills"><b>Total postings vs Local specializations (RCA &gt; 1)</b></a>
          — Relationship between labor-market scale and specialization breadth.
          ${pair1.btn}
          <div class="feature-blurb">
            Strong positive scaling with diminishing returns: a 10× increase in postings is associated with roughly a 5× increase in local specializations.
          </div>
          ${pair1.pop}
        </li>
        <li>
          <a href="?x=eci&y=fitness"><b>Economic Complexity Index vs Fitness</b></a>
          — Do the two complexity measures rank counties similarly?
          ${pair2.btn}
          <div class="feature-blurb">
            Strong agreement across the full range; meaningful disagreement only at the bottom of the distribution.
          </div>
          ${pair2.pop}
        </li>
        <li>
          <a href="?x=skill_density&y=skill_coherence"><b>Skill density vs Skill coherence</b></a>
          — Relatedness to non-RCA skills (Balland) vs relatedness within the RCA portfolio (Neffke).
          ${pair3.btn}
          <div class="feature-blurb">
            Strong negative L-shaped relationship reflecting the focused-vs-diversified tradeoff.
          </div>
          ${pair3.pop}
        </li>
      </ol>
    </div>
    <div class="card">
      <h3 class="h3-flush">Notable counties</h3>
      <p class="muted-note-strong" style="margin: 0 0 0.6rem 0; font-size: 0.92em;">
        Each link selects a focal county and turns on "Show similar counties" so
        the chart surfaces its k-nearest peers in the chosen 2D space. Try
        different axes after loading the view — different pairings find
        different peer groups.
      </p>
      <ol class="feature-list">
        <li>
          <a href="?x=eci&y=total_postings&fips=25025&similar=true&k=10"><b>Suffolk MA on ECI vs Total postings</b></a>
          — Suffolk's peers among the highest-complexity, highest-volume metros.
          ${pair4.btn}
          <div class="feature-blurb">
            Shares the high-complexity, high-volume corner with NYC, Cambridge MA, San Francisco, Washington DC.
          </div>
          ${pair4.pop}
        </li>
        <li>
          <a href="?x=skill_density&y=skill_coherence&fips=08013&similar=true&k=10"><b>Boulder CO on Skill density vs Skill coherence</b></a>
          — Boulder's peers in the small-metro university-town cluster.
          ${pair5.btn}
          <div class="feature-blurb">
            k-NN surfaces Madison WI, Princeton NJ, Ithaca NY, Champaign IL — research-anchored peers.
          </div>
          ${pair5.pop}
        </li>
        <li>
          <a href="?x=share_specialized&y=eci&fips=53033&similar=true&k=10"><b>King County WA on Share specialized vs ECI</b></a>
          — Seattle's high-tech, high-skill signature: technical posting mix paired with high complexity.
          ${pair6.btn}
          <div class="feature-blurb">
            k-NN surfaces Santa Clara CA, San Mateo CA, Suffolk MA, Travis TX — peer tech, biotech, and research metros.
          </div>
          ${pair6.pop}
        </li>
      </ol>
    </div>
  </div>
`);
```
