// src/components/utils.js
// Shared helpers used across pages.

// ─────────────────────────────────────────────────────────────────────────
// Metric registry
// Single source of truth for: which variables are user-facing, how to label
// them, and how to color/scale them on the map and in scatter plots.
// Add new metrics here. Phase 2 will add the top-K skill drilldown columns
// (e.g., eci_top5_skills) but those are tooltip strings, not map metrics.
// ─────────────────────────────────────────────────────────────────────────

// Family order matters: it determines the order families appear in the
// dropdown's <optgroup> sections AND the order of family cards on the
// county profile. Families ordered Skill Specialization → Economic
// complexity and sophistication → Network position → Volume → Work mode.
// Local specializations leads the first family because it is the default
// metric for the map and the rankings pages.
//
// colorMode is the explicit color-scale strategy:
//   "log"               — multiplicative metrics (postings, fitness, HHI)
//   "diverging-clipped" — signed metrics centered at 0, clamped to p5/p95
//   "quantile"          — equal-frequency bins; correct for skewed/bimodal
//                         distributions where linear or log scales misrepresent
//                         the bulk of counties (shares, network metrics)
//   "linear-clipped"    — linear with clamp at p5/p95; default for everything
//                         else (counts, entropies, dynamics)
export const METRICS = [
  // Skill Specialization — Local specializations leads (default landing
  // metric for the map and rankings pages), followed by three additional
  // measures of how concentrated and volume-loaded the county's skill
  // demand is. None of these are diversity-of-demand measures.
  {key: "n_rca_skills",            label: "Local specializations",                         family: "Skill Specialization",       scale: "linear",    scheme: "ylgnbu",  round: 0,                                        colorMode: "linear-clipped"},
  {key: "mean_skills_per_posting", label: "Average skills per posting",                    family: "Skill Specialization",       scale: "linear",    scheme: "ylgnbu",  round: 1,                 suppressBelow: 100,    colorMode: "linear-clipped"},
  {key: "n_distinct_skills",       label: "Distinct skills demanded",                      family: "Skill Specialization",       scale: "linear",    scheme: "ylgnbu",  round: 0,                                        colorMode: "linear-clipped", winsorize: true},
  {key: "skill_hhi",               label: "Skill concentration (HHI)",                     family: "Skill Specialization",       scale: "log",       scheme: "ylorrd",  round: 4,                 suppressBelow: 100,    colorMode: "log"},

  // Economic complexity and sophistication
  {key: "eci",                     label: "Economic Complexity Index (ECI)",               family: "Economic complexity and sophistication", scale: "diverging", scheme: "rdbu",  round: 2, divergeAt: 0,                       colorMode: "diverging-clipped"},
  {key: "fitness",                 label: "Skill fitness",                                 family: "Economic complexity and sophistication", scale: "log",       scheme: "viridis", round: 2,                                    colorMode: "log"},
  {key: "skill_entropy",           label: "Skill entropy",                                 family: "Economic complexity and sophistication", scale: "linear",    scheme: "ylgnbu",  round: 2,                 suppressBelow: 100, colorMode: "linear-clipped"},
  {key: "avg_ubiquity",            label: "Average ubiquity of local specializations",     family: "Economic complexity and sophistication", scale: "linear",    scheme: "ylorrd",  round: 1,                                    colorMode: "linear-clipped"},

  // Network position — how the county's specialized portfolio sits in the
  // global skill-relatedness network.
  {key: "skill_density",           label: "Skill density",                                 family: "Network position",           scale: "linear",    scheme: "ylgnbu",  round: 3,                 suppressBelow: 100,    colorMode: "quantile"},
  {key: "skill_coherence",         label: "Skill coherence",                               family: "Network position",           scale: "linear",    scheme: "ylgnbu",  round: 3,                 suppressBelow: 100,    colorMode: "quantile"},
  {key: "avg_centrality",          label: "Average centrality of local specializations",   family: "Network position",           scale: "linear",    scheme: "ylgnbu",  round: 3,                 suppressBelow: 100,    colorMode: "quantile"},

  // Volume — total postings plus share by skill type. No separate
  // "skill composition" group; the share metrics live here.
  {key: "total_postings",          label: "Total postings",                                family: "Volume",                     scale: "log",       scheme: "ylgnbu",  round: 0,                                          colorMode: "log"},
  {key: "share_specialized",       label: "Share specialized",                             family: "Volume",                     scale: "linear",    scheme: "ylgnbu",  round: 3, isShare: true, suppressBelow: 100,    colorMode: "quantile", winsorize: true},
  {key: "share_software",          label: "Share software",                                family: "Volume",                     scale: "linear",    scheme: "ylgnbu",  round: 3, isShare: true, suppressBelow: 100,    colorMode: "quantile"},
  {key: "share_common",            label: "Share common, soft",                            family: "Volume",                     scale: "linear",    scheme: "ylgnbu",  round: 3, isShare: true, suppressBelow: 100,    colorMode: "quantile"},

  // Work mode — filtered out from the choropleth and County-comparisons
  // dropdowns; surfaces on County profiles only.
  {key: "share_remote",            label: "Share remote postings",                         family: "Work mode",                  scale: "linear",    scheme: "ylgnbu",  round: 3, isShare: true, suppressBelow: 100,    colorMode: "quantile"},
  {key: "share_hybrid",            label: "Share hybrid postings",                         family: "Work mode",                  scale: "linear",    scheme: "ylgnbu",  round: 3, isShare: true, suppressBelow: 100,    colorMode: "quantile"},
];

export const METRIC_BY_KEY = new Map(METRICS.map(m => [m.key, m]));

// ─────────────────────────────────────────────────────────────────────────
// Connecticut FIPS bridge
// CT abolished its 8 historic counties (09001-09015) effective June 2022 and
// replaced them with 9 planning regions (09110-09190). Lightcast adopted the
// new FIPS; us-atlas TopoJSON still has the old county polygons. Map each
// historic county to the planning region containing its largest population
// center so the choropleth renders. Two regions (Naugatuck Valley 09140 and
// Western CT 09190) get no historic-county polygon and won't surface — they
// remain queryable via the dropdown / panel, just not visible on the map.
// Documented limitation; replace with a planning-region TopoJSON when
// us-atlas catches up.
// ─────────────────────────────────────────────────────────────────────────

export const CT_BRIDGE = {
  "09001": "09120", // Fairfield      → Greater Bridgeport (Bridgeport)
  "09003": "09110", // Hartford       → Capitol            (Hartford)
  "09005": "09160", // Litchfield     → Northwest Hills    (Torrington)
  "09007": "09130", // Middlesex      → Lower CT River Valley (Middletown)
  "09009": "09170", // New Haven      → South Central      (New Haven)
  "09011": "09180", // New London     → Southeastern       (New London/Norwich)
  "09013": "09110", // Tolland        → Capitol            (Vernon/Manchester)
  "09015": "09150", // Windham        → Northeastern       (Windham/Putnam)
};

export const CT_PLANNING_REGION_NAMES = {
  "09110": "Capitol Region",
  "09120": "Greater Bridgeport",
  "09130": "Lower Connecticut River Valley",
  "09140": "Naugatuck Valley",
  "09150": "Northeastern Connecticut",
  "09160": "Northwest Hills",
  "09170": "South Central Connecticut",
  "09180": "Southeastern Connecticut",
  "09190": "Western Connecticut",
};

// Resolve a topojson FIPS (historic) to the panel's data FIPS (current).
// For non-CT counties this is a pass-through. For CT historic counties it
// returns the corresponding planning region FIPS.
export function fipsForData(fips) {
  return CT_BRIDGE[fips] ?? fips;
}

// Per-metric suppression threshold lives on each METRICS entry as
// `suppressBelow` (currently 100 for all flagged metrics). Suppressed
// counties render with a diagonal-hatch SVG pattern (cartographic standard
// for "no data / suppressed", per Census/BLS/FRB conventions), preserving
// visual continuity while honestly distinguishing them from low-value
// counties. A "show suppressed counties" toggle lets users see underlying
// values with a hatch overlay.
//
// 100 chosen empirically: catches the most-egregious single-employer
// counties without disqualifying the long tail of small-but-real labor
// markets (university towns, small county seats). Combined with the hatch
// rendering the visual signal stays clean.
//
// Counts (n_rca_skills, n_distinct_skills, by-employer) and the complexity
// scalars (eci, fitness, avg_ubiquity) are NOT suppressed: either they
// scale naturally with volume by user expectation (counts), or their
// small-N behaviour is variance-only and surfaces real findings from small
// high-complexity counties (Boulder, Madison, Princeton).
export const SUPPRESSION_THRESHOLD = 100;

// ─────────────────────────────────────────────────────────────────────────
// Plain-language metric definitions for the info popover
// Each entry: 1 sentence on what the number means, 1 sentence on why it
// matters, 1 sentence on how to read the trend. Aimed at a smart non-expert.
// ─────────────────────────────────────────────────────────────────────────

export const METRIC_INFO = {
  total_postings: {
    label: "Total postings",
    body: "Number of unique job postings active in the county that year. Higher means more labor demand. Rendered on a log scale.",
  },
  share_remote: {
    label: "Share of postings tagged remote",
    body: "Fraction of postings explicitly flagged as remote by the employer. Spiked 2020-22, has receded somewhat. Pre-2018 Lightcast remote tagging was keyword-based and unreliable — use 2018+ for level comparisons.",
  },
  share_hybrid: {
    label: "Share of postings tagged hybrid",
    body: "Fraction of postings flagged as hybrid (some on-site, some remote). Tagging adoption is incomplete and inconsistent across employers, so trends are more reliable than levels.",
  },
  share_specialized: {
    label: "Share specialized",
    body: "Specialized skills are technical / domain-specific (e.g. SQL, GAAP, FDA submissions). A higher share signals a knowledge-economy labor market. Counties with mostly common skills tend to have less specialized labor demand.",
  },
  share_software: {
    label: "Share software",
    body: "Named software products and platforms (e.g. Excel, AWS, Salesforce). Useful as a proxy for digital intensity, but watch for double-counting: many specialized skills imply software too.",
  },
  share_common: {
    label: "Share common, soft",
    body: "Communication, teamwork, problem-solving, skills that aren't tied to a specific occupation or technology. Rises in low-specialization labor markets. Often inversely related to share specialized.",
  },
  mean_skills_per_posting: {
    label: "Average skills per posting",
    body: "How verbose employers are about skill requirements, on average. Has risen across the board since 2017 as employers shifted to skill-tagged ATS templates.",
  },
  skill_density: {
    label: "Skill density (Balland et al. 2019)",
    body: "For each skill the county does NOT have a local specialization in (RCA ≤ 1), how related is it to the skills the county DOES specialize in? This metric averages those relatednesses. Higher density predicts which new skills the county will acquire next; counties with high density are well-positioned to expand their portfolio without retraining.",
  },
  skill_coherence: {
    label: "Portfolio coherence (Neffke et al. 2011)",
    body: "Average pairwise relatedness AMONG the county's local specializations (RCA > 1). High coherence = a tightly-clustered specialization portfolio (e.g. a finance hub specializing in many adjacent finance skills). Low coherence = scattered specializations.",
  },
  avg_centrality: {
    label: "Average centrality of local specializations",
    body: "Where do the county's local specializations (RCA > 1) sit in the global skill-skill co-specialization network? High centrality = core, well-connected skills (most counties also need them). Low = peripheral, niche specializations.",
  },
  eci: {
    label: "Economic Complexity Index (Hidalgo & Hausmann 2009)",
    body: "A composite measure of how sophisticated a county's skill mix is, derived iteratively from which skills are rare and which counties have rare local specializations. Standardized: 0 = national mean, +2 = highly complex (e.g. NYC, Boston, San Jose), −2 = simple. The diverging color highlights both extremes; the dashed national-median line on sparklines stays at 0 by construction.",
  },
  fitness: {
    label: "Fitness (Tacchella et al. 2012)",
    body: "An alternative to ECI that handles diversification and rarity asymmetrically: highly diversified counties get higher fitness even if their local specializations aren't all rare. Better behaved than ECI for very specialized or very generalist counties. Log scale because the distribution is heavy-tailed.",
  },
  n_distinct_skills: {
    label: "Distinct skills mentioned in postings",
    body: "Raw count of unique skill names that appear at least once in the county-year. Reflects breadth of demand. Floor is ~500 in tiny counties; ceiling is ~30,000 in major metros.",
  },
  n_rca_skills: {
    label: "Local specializations",
    body: "Number of distinct skills in which the county is locally specialized: its share of mentions of that skill is greater than the national share, equivalently a revealed comparative advantage (RCA > 1) in the skill. Larger metros typically have 5,000-9,000; rural counties have a few hundred. Pools across all three Lightcast skill types (specialized, software, common).",
  },
  skill_hhi: {
    label: "Skill concentration (Herfindahl index)",
    body: "Concentration of skill mentions: sum of squared shares. Higher = a few skills dominate (specialized). Lower = many skills, evenly distributed (diversified). Log scale because the distribution is skewed.",
  },
  skill_entropy: {
    label: "Skill entropy (bits)",
    body: "Effective number of skills, log-base-2: 10 bits ≈ 1,000 effective skills. More granular than HHI for ranking diverse counties. Higher = more diverse skill demand.",
  },
  avg_ubiquity: {
    label: "Average ubiquity of local specializations",
    body: "For each of the county's local specializations (RCA > 1), how many other counties also specialize in that same skill? Average that count. Low = the county specializes in rare skills (often complex, knowledge-intensive). High = the county specializes in common skills.",
  },
};

// ─────────────────────────────────────────────────────────────────────────
// Shared info-popover helper
// Renders a small ⓘ button + a sibling collapsible panel. Used in three modes:
//   1. Static body: pass `bodyHtml` (string), button toggles that panel.
//   2. Reactive body: pass `renderBody()` (function) that returns string;
//      called each time the popover opens or its dependency changes.
//   3. Keyed body: pass `getBody(key)` for shared popovers driven by an
//      external select; call `setKey(key)` to swap content while open.
// Returns {btn, popover} — both DOM nodes the caller inserts where desired.
// ─────────────────────────────────────────────────────────────────────────

export function makeInfoPopover({bodyHtml, renderBody, label = "About this metric"} = {}) {
  const btn = document.createElement("button");
  btn.className = "info-btn";
  btn.type = "button";
  btn.textContent = "i";
  btn.title = label;
  btn.setAttribute("aria-label", label);
  btn.setAttribute("aria-expanded", "false");

  const popover = document.createElement("div");
  popover.className = "info-popover";
  popover.setAttribute("role", "region");
  popover.setAttribute("aria-label", label);

  function fill(html) {
    popover.innerHTML =
      '<button class="info-close" type="button" aria-label="Close">×</button>' + (html ?? "");
    popover.querySelector(".info-close").addEventListener("click", () => close());
  }

  function open() {
    fill(renderBody ? renderBody() : (bodyHtml ?? ""));
    popover.classList.add("open");
    btn.classList.add("active");
    btn.setAttribute("aria-expanded", "true");
  }
  function close() {
    popover.classList.remove("open");
    btn.classList.remove("active");
    btn.setAttribute("aria-expanded", "false");
  }
  function refresh() {
    if (popover.classList.contains("open") && renderBody) fill(renderBody());
  }

  btn.addEventListener("click", (e) => {
    e.preventDefault(); e.stopPropagation();
    popover.classList.contains("open") ? close() : open();
  });

  // Initial fill so the panel has content the first time it opens.
  if (bodyHtml != null) fill(bodyHtml);

  return {btn, popover, open, close, refresh};
}

// ─────────────────────────────────────────────────────────────────────────
// Grouped <select> with <optgroup> per family. Returns an HTMLSelectElement
// whose .value is the metric OBJECT (not the key string), so it can plug
// directly into Generators.input() for reactive consumption.
// ─────────────────────────────────────────────────────────────────────────

export function metricSelect(initialValue, customMetrics) {
  const select = document.createElement("select");
  select.style.font = "inherit";
  const groups = new Map();
  const metrics = customMetrics ?? METRICS;
  for (const m of metrics) {
    if (!groups.has(m.family)) groups.set(m.family, []);
    groups.get(m.family).push(m);
  }
  for (const [family, ms] of groups) {
    const og = document.createElement("optgroup");
    og.label = family;
    for (const m of ms) {
      const o = document.createElement("option");
      o.value = m.key;
      o.textContent = m.label;
      og.appendChild(o);
    }
    select.appendChild(og);
  }
  Object.defineProperty(select, "value", {
    get() {
      const k = select.options[select.selectedIndex]?.value;
      return METRIC_BY_KEY.get(k);
    },
    set(v) {
      const k = typeof v === "string" ? v : v?.key;
      for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].value === k) {
          select.selectedIndex = i;
          break;
        }
      }
    },
    configurable: true,
  });
  if (initialValue) select.value = initialValue;
  return select;
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

export function fmtFips(v) {
  // FIPS in the parquet are already 5-digit strings, but us-atlas TopoJSON
  // emits them as numeric ids. Normalize both ways.
  return String(v).padStart(5, "0");
}

export function fmtMetric(value, metric) {
  if (value == null || !Number.isFinite(value)) return "n/a";
  if (metric.round === 0) return Math.round(value).toLocaleString();
  return value.toFixed(metric.round);
}

export function metricGroups() {
  // Group metrics by family for grouped <select> rendering.
  const groups = new Map();
  for (const m of METRICS) {
    if (!groups.has(m.family)) groups.set(m.family, []);
    groups.get(m.family).push(m);
  }
  return groups;
}

// Top-5 skill drilldown columns from the v3.1 panel. Some keys are metric
// keys (resolved against METRICS via METRIC_BY_KEY); others (rarest, *_shared)
// are freestanding labels that the rendering logic uses on its own. The two-
// tier columns (eci_shared / fitness_shared / rarest_shared) require
// ubiquity_filtered >= 2 and surface different skills only for mega-portfolio
// counties — for ~all counties they coincide with the monopoly tier.
export const TOOLTIP_EXTENSIONS = {
  eci:                "eci_top5_skills",
  eci_shared:         "eci_top5_shared",
  fitness:            "fitness_top5_skills",
  fitness_shared:     "fitness_top5_shared",
  n_rca_skills:       "rca_top5_skills",
  rarest:             "rarest_5_rca_skills",
  rarest_shared:      "rarest_5_rca_shared",
  share_specialized:  "specialized_top5_skills",
  share_software:     "software_top5_skills",
  share_common:       "common_top5_skills",
  corp_n_rca_skills:  "corp_top5_skills",
  univ_n_rca_skills:  "univ_top5_skills",
  fede_n_rca_skills:  "fede_top5_skills",
  gove_n_rca_skills:  "gove_top5_skills",
  staf_n_rca_skills:  "staf_top5_skills",
};
