---
title: Spatial visualization
toc: false
---

<h1 class="h1-clip">Spatial visualization</h1>
<p class="page-intro">County-level skill demand, local specialization, and complexity, built from <b>433.6 million job postings</b>, 2010 to 2024. Pick a metric and a year; hover a county for details; click any county to open it on the <b>County profiles</b> page. For ranked tables, distributions, and national labor-demand context see <b>Rankings &amp; trends</b>; for bivariate views see <b>County comparisons</b>.</p>

```js
import * as topojson from "npm:topojson-client";
import {METRICS, METRIC_BY_KEY, fmtFips, fmtMetric, metricGroups, fipsForData, CT_PLANNING_REGION_NAMES, METRIC_INFO, metricSelect, SUPPRESSION_THRESHOLD, makeInfoPopover} from "./components/utils.js";
```

```js
// Load static assets and the county-year panel as an Arrow Table.
// Single GET, parsed once into a typed columnar structure; all subsequent
// queries are in-memory array operations (no DuckDB-WASM, no range fetches).
const usTopo  = await FileAttachment("data/us-counties.json").json();
const cMeta   = await FileAttachment("data/county-meta.json").json();
const panel   = (await FileAttachment("data/county_year_panel_export.parquet").parquet()).toArray();

const counties = topojson.feature(usTopo, usTopo.objects.counties);
const states   = topojson.mesh(usTopo, usTopo.objects.states, (a, b) => a !== b);
```

```js
// Grouped metric selector (<optgroup> per family) + info popover.
// Default opens on Volume: Total postings.
// Work mode (share_remote/share_hybrid) is excluded from the choropleth
// dropdown — those metrics are noisy at the county level (NULL pre-2018,
// small-county jitter post-2018). They stay in METRICS so the county-
// profile sparklines and the Compare-counties scatter can use them.
const metricEl = metricSelect(
  METRIC_BY_KEY.get("n_rca_skills"),
  METRICS.filter(m => m.family !== "Work mode"),
);

// Reactive info popover: renderBody pulls the description for whatever
// metric is currently selected. Re-render on metric change while open so
// the panel content tracks the dropdown.
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
// Year slider with play button. The play button auto-advances 2010 → 2024
// at ~700ms per step; click again to pause. Defaults to 2024 on load.
const yearInput = Inputs.range([2010, 2024], {label: "Year", step: 1, value: 2024});
const playBtn = html`<button style="margin-left: 1rem; padding: 0.2rem 0.6rem; cursor: pointer;">▶ Play 2010–2024</button>`;
let _playing = false;
let _timer = null;
playBtn.onclick = () => {
  _playing = !_playing;
  playBtn.textContent = _playing ? "⏸ Pause" : "▶ Play 2010–2024";
  if (_playing) {
    if (+yearInput.value >= 2024) {
      yearInput.value = 2010;
      yearInput.dispatchEvent(new Event("input", {bubbles: true}));
    }
    _timer = setInterval(() => {
      const v = +yearInput.value;
      if (v >= 2024) {
        clearInterval(_timer);
        _playing = false;
        playBtn.textContent = "▶ Play 2010–2024";
        return;
      }
      yearInput.value = v + 1;
      yearInput.dispatchEvent(new Event("input", {bubbles: true}));
    }, 700);
  } else if (_timer) {
    clearInterval(_timer);
  }
};
display(html`<div class="toolbar-row">${yearInput}${playBtn}</div>`);
const year = Generators.input(yearInput);
```

```js
// Toggle: show suppressed counties' underlying values with a translucent
// hatch overlay (default ON). Unchecking it switches to a solid hatch with
// no underlying color. The element is created here so it's reactive, but
// it's displayed AFTER the chart and legend caption (further down) — see
// the chart cell where `display(showSuppressedEl)` runs at the end.
const showSuppressedEl = Inputs.toggle({
  label: "Show suppressed counties",
  value: true,
});
const showSuppressed = Generators.input(showSuppressedEl);
```

```js
// Pull the selected metric for the selected year from the in-memory panel.
//
// metric.suppressBelow gives a per-metric posting threshold (500 for shares,
// 1000 for network/concentration metrics). When set, low-volume counties get
// clamped to the color-scale floor at fill time so the map stays visually
// contiguous and reads as "no signal" rather than a missing-data gap.
const suppressBelow = metric.suppressBelow ?? 0;
const hasSuppression = suppressBelow > 0;

const valueByFips = new Map();
const postingsByFips = new Map();
const yr = Number(year);
for (const r of panel) {
  if (r.year !== yr) continue;
  valueByFips.set(r.county, r[metric.key]);
  postingsByFips.set(r.county, Number(r.total_postings));
}
```

```js
// Compute a stable color domain across years so the slider doesn't cause
// the legend to jump around. When the metric uses a suppression threshold,
// restrict the domain to counties above the threshold so the legend isn't
// dominated by tiny-county noise. p5/p95 used by linear/diverging scales
// (avoids outlier pull); data_min/data_max used by log scales because log
// already compresses outliers and we want the gradient and tick labels to
// span the full visible range.
const _domainVals = [];
for (const r of panel) {
  const v = r[metric.key];
  if (v == null) continue;
  if (hasSuppression && Number(r.total_postings) < suppressBelow) continue;
  _domainVals.push(Number(v));
}
_domainVals.sort((a, b) => a - b);
const dom = {
  lo:        d3.quantileSorted(_domainVals, 0.05),
  mid:       d3.quantileSorted(_domainVals, 0.50),
  hi:        d3.quantileSorted(_domainVals, 0.95),
  data_min:  _domainVals[0],
  data_max:  _domainVals[_domainVals.length - 1],
};
```

```js
// Build the color spec from metric.colorMode. All scales target ~5 visible
// tick labels with metric-aware formatting (`fmtMetric`) so the legend
// doesn't collapse into an unreadable string of decimals.
const colorMode = metric.colorMode ?? "linear-clipped";
const fmtTick = d => fmtMetric(d, metric);
const colorSpec = (() => {
  if (colorMode === "diverging-clipped") {
    const at = metric.divergeAt ?? 0;
    const half = Math.max(Math.abs(dom.lo - at), Math.abs(dom.hi - at));
    return {
      type: "diverging",
      domain: [at - half, at, at + half],
      clamp: true,
      scheme: metric.scheme,
      legend: true,
      label: metric.label,
      ticks: 5,
      tickFormat: fmtTick,
    };
  }
  if (colorMode === "log") {
    // Round to nice decade boundaries so the gradient bar and labelled
    // ticks span the same range. Two rules:
    //   1. Upper bound: round to whichever decade is closer to hi in log
    //      space (sqrt(10) ≈ 3.16 cutoff). If hi is just past a decade
    //      (e.g., 1.2M), round down to 1M and clamp; if hi is well past
    //      (e.g., 908k), round up to 1M.
    //   2. Lower bound: floor at p5 to avoid numerical-floor artifacts
    //      (fitness has values like 1e-34 from edge cases — including
    //      those would produce a 38-decade legend with ticks every 1px).
    //      Cap the total span at 6 decades regardless.
    const MAX_DECADES = 6;
    const p5 = Math.max(Number(dom.lo) || 1e-6, 1e-12);
    const hi = Math.max(Number(dom.data_max ?? dom.hi) || 1, p5);
    const lowerD = Math.floor(Math.log10(hi));
    const upperD = Math.ceil(Math.log10(hi));
    const decadeMax = (Math.log10(hi) - lowerD > 0.5) ? upperD : lowerD;
    let decadeMin = Math.floor(Math.log10(p5));
    if (decadeMax - decadeMin > MAX_DECADES) decadeMin = decadeMax - MAX_DECADES;
    const niceLo = 10 ** decadeMin;
    const niceHi = 10 ** decadeMax;
    const ticks = [];
    for (let k = decadeMin; k <= decadeMax; k++) ticks.push(10 ** k);
    return {
      type: "log",
      domain: [niceLo, niceHi],
      clamp: true,
      scheme: metric.scheme,
      legend: true,
      label: metric.label,
      ticks,
      tickFormat: "~s",
    };
  }
  if (colorMode === "quantile") {
    // 5 bins (was 7) — at the n=7 width the quantile breaks were colliding
    // into an unreadable run-on of decimals. 5 bins gives 6 visible
    // breakpoints, plenty of color resolution and readable labels.
    const dataValues = rows.toArray()
      .filter(r =>
        r.value != null &&
        (!hasSuppression || (Number(r.n_postings) ?? 0) >= suppressBelow)
      )
      .map(r => Number(r.value));
    return {
      type: "quantile",
      n: 5,
      domain: dataValues,
      scheme: metric.scheme,
      legend: true,
      label: metric.label,
      tickFormat: fmtTick,
    };
  }
  // linear-clipped (default)
  return {
    type: "linear",
    domain: [dom.lo, dom.hi],
    clamp: true,
    scheme: metric.scheme,
    legend: true,
    label: metric.label,
    ticks: 5,
    tickFormat: fmtTick,
  };
})();

// Classify each topojson feature into one of three categories:
//   "colored"    — county has a trusted value, render with the color scale
//   "suppressed" — county has data but below the volume threshold
//   "missing"    — county has no value (e.g. pre-2018 share_remote)
function classify(d) {
  const fips = fmtFips(d.id);
  const dataFips = fipsForData(fips);
  const v = valueByFips.get(dataFips);
  if (v == null) return "missing";
  if (hasSuppression) {
    const n = postingsByFips.get(dataFips);
    if (n != null && n < suppressBelow) return "suppressed";
  }
  return "colored";
}

function buildTitle(d) {
  const fips = fmtFips(d.id);
  const dataFips = fipsForData(fips);
  const v = valueByFips.get(dataFips);
  const n = postingsByFips.get(dataFips);
  const meta = cMeta[fips] || {};
  let display = meta.name ? `${meta.name}, ${meta.state}` : `FIPS ${fips}`;
  if (dataFips !== fips) {
    display += ` → ${CT_PLANNING_REGION_NAMES[dataFips] ?? dataFips} planning region`;
  }
  let txt;
  if (v == null) {
    txt = `${display}\n${metric.label}: no data for this year`;
  } else {
    txt = `${display}\n${metric.label}: ${fmtMetric(v, metric)}`;
    if (hasSuppression && n != null && n < suppressBelow) {
      txt += ` (low volume: ${n.toLocaleString()} postings — value suppressed on map)`;
    }
  }
  return txt;
}

const counties_colored    = counties.features.filter(d => classify(d) === "colored");
const counties_suppressed = counties.features.filter(d => classify(d) === "suppressed");
const counties_missing    = counties.features.filter(d => classify(d) === "missing");

// Build the marks list. Layer order is critical:
//   1. Trusted counties (full color from the scale)
//   2. Suppressed/missing counties — either solid hatch (toggle OFF) or
//      colored underneath with a translucent hatch overlay (toggle ON)
//   3. State borders
// Pattern URLs (#hatch-solid, #hatch-overlay) are injected into the SVG
// <defs> after Plot returns the element.
const marks = [
  Plot.geo(counties_colored, {
    fill: d => valueByFips.get(fipsForData(fmtFips(d.id))),
    stroke: "white",
    strokeWidth: 0.15,
    title: buildTitle,
    href: d => `./county?fips=${fmtFips(d.id)}`,
    target: "_self",
  }),
];

if (showSuppressed && counties_suppressed.length > 0) {
  marks.push(Plot.geo(counties_suppressed, {
    fill: d => valueByFips.get(fipsForData(fmtFips(d.id))),
    stroke: "white",
    strokeWidth: 0.15,
    title: buildTitle,
    href: d => `./county?fips=${fmtFips(d.id)}`,
    target: "_self",
  }));
  marks.push(Plot.geo(counties_suppressed, {
    fill: "url(#hatch-overlay)",
    stroke: "none",
    title: buildTitle,
  }));
}

if (counties_missing.length > 0) {
  marks.push(Plot.geo(counties_missing, {
    fill: "url(#hatch-cross)",
    stroke: "white",
    strokeWidth: 0.15,
    title: buildTitle,
    href: d => `./county?fips=${fmtFips(d.id)}`,
    target: "_self",
  }));
}

marks.push(Plot.geo(states, {stroke: "black", strokeWidth: 0.5, fill: "none"}));

const chart = Plot.plot({
  projection: "albers-usa",
  width: width,
  height: Math.max(520, Math.min(720, width * 0.55)),
  color: colorSpec,
  marks,
});

// Inject SVG hatch patterns into <defs>. Three patterns:
//   #hatch-solid   — single diagonal lines for suppressed counties (low
//                    volume); opaque dark backdrop, used when toggle OFF.
//   #hatch-overlay — translucent single diagonal, layered over a color
//                    fill when the toggle is ON.
//   #hatch-cross   — crosshatch (two perpendicular diagonals) for
//                    missing-data counties (e.g. pre-2018 share_remote).
//                    Visually distinct from #hatch-solid so users can tell
//                    "suppressed" from "no data" at a glance.
// Light slate-grey lines (#9ca3af) on the dark theme stay visible without
// overpowering the colored bins of the scale.
{
  const ns = "http://www.w3.org/2000/svg";
  let defs = chart.querySelector("defs");
  if (!defs) {
    defs = document.createElementNS(ns, "defs");
    chart.insertBefore(defs, chart.firstChild);
  }
  function makeDiagonal(id, bgColor, strokeColor, strokeOpacity) {
    if (defs.querySelector("#" + id)) return;
    const p = document.createElementNS(ns, "pattern");
    p.setAttribute("id", id);
    p.setAttribute("patternUnits", "userSpaceOnUse");
    p.setAttribute("width", "5");
    p.setAttribute("height", "5");
    p.setAttribute("patternTransform", "rotate(45)");
    if (bgColor) {
      const bg = document.createElementNS(ns, "rect");
      bg.setAttribute("width", "5");
      bg.setAttribute("height", "5");
      bg.setAttribute("fill", bgColor);
      p.appendChild(bg);
    }
    const line = document.createElementNS(ns, "line");
    line.setAttribute("x1", "0"); line.setAttribute("y1", "0");
    line.setAttribute("x2", "0"); line.setAttribute("y2", "5");
    line.setAttribute("stroke", strokeColor);
    line.setAttribute("stroke-width", "1.2");
    if (strokeOpacity != null) line.setAttribute("stroke-opacity", String(strokeOpacity));
    p.appendChild(line);
    defs.appendChild(p);
  }
  function makeCrosshatch(id, bgColor, strokeColor) {
    if (defs.querySelector("#" + id)) return;
    const p = document.createElementNS(ns, "pattern");
    p.setAttribute("id", id);
    p.setAttribute("patternUnits", "userSpaceOnUse");
    p.setAttribute("width", "6");
    p.setAttribute("height", "6");
    if (bgColor) {
      const bg = document.createElementNS(ns, "rect");
      bg.setAttribute("width", "6");
      bg.setAttribute("height", "6");
      bg.setAttribute("fill", bgColor);
      p.appendChild(bg);
    }
    for (const [x1, y1, x2, y2] of [[0,0,6,6], [0,6,6,0]]) {
      const ln = document.createElementNS(ns, "line");
      ln.setAttribute("x1", x1); ln.setAttribute("y1", y1);
      ln.setAttribute("x2", x2); ln.setAttribute("y2", y2);
      ln.setAttribute("stroke", strokeColor);
      ln.setAttribute("stroke-width", "1");
      p.appendChild(ln);
    }
    defs.appendChild(p);
  }
  makeDiagonal("hatch-solid",    "#1f1f1f", "#9ca3af", null);
  makeDiagonal("hatch-overlay",  null,      "#cbd5e1", 0.55);
  makeCrosshatch("hatch-cross",  "#1f1f1f", "#9ca3af");
}

display(chart);

// Caption beneath the map: hatch swatches + counts.
const capItems = [];
if (counties_suppressed.length > 0) {
  capItems.push(html`<span class="legend-swatch">
    <svg width="14" height="14" viewBox="0 0 14 14" style="vertical-align:middle" role="img" aria-label="Suppressed-county hatch pattern">
      <title>Suppressed-county hatch pattern</title>
      <defs><pattern id="leg-suppr" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)">
        <rect width="5" height="5" fill="#1f1f1f"/>
        <line x1="0" y1="0" x2="0" y2="5" stroke="#9ca3af" stroke-width="1.2"/>
      </pattern></defs>
      <rect width="14" height="14" fill="url(#leg-suppr)" stroke="#888" stroke-width="0.5"/>
    </svg>
    suppressed — fewer than ${SUPPRESSION_THRESHOLD} postings (${counties_suppressed.length.toLocaleString()} counties)
  </span>`);
}
if (counties_missing.length > 0) {
  capItems.push(html`<span class="legend-swatch">
    <svg width="14" height="14" viewBox="0 0 14 14" style="vertical-align:middle" role="img" aria-label="No-data crosshatch pattern">
      <title>No-data crosshatch pattern</title>
      <defs><pattern id="leg-miss" patternUnits="userSpaceOnUse" width="6" height="6">
        <rect width="6" height="6" fill="#1f1f1f"/>
        <line x1="0" y1="0" x2="6" y2="6" stroke="#9ca3af" stroke-width="1"/>
        <line x1="0" y1="6" x2="6" y2="0" stroke="#9ca3af" stroke-width="1"/>
      </pattern></defs>
      <rect width="14" height="14" fill="url(#leg-miss)" stroke="#888" stroke-width="0.5"/>
    </svg>
    no data for this year (${counties_missing.length.toLocaleString()} counties)
  </span>`);
}
if (capItems.length > 0) {
  display(html`<div class="legend-row">${capItems}</div>`);
}
```

```js
// Render the show-suppressed toggle here in its OWN cell, so it doesn't
// get re-displayed every time the chart cell re-runs. Re-displaying the
// same DOM element moves it (Observable's display() relocates the node
// rather than cloning), which causes the page to scroll back to the top
// each click. This cell has no reactive dependencies — it runs once.
display(html`<div class="suppress-row">${showSuppressedEl}</div>`);
```
