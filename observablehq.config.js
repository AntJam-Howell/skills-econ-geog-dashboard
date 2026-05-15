// observablehq.config.js
// See https://observablehq.com/framework/config for full documentation.

export default {
  title: "Economic Geography of Skill Specialization and Complexity",
  root: "src",

  // Page-level styles live in src/style.css so they get cached and compressed
  // by the host instead of being inlined into every HTML response.
  head: `<link rel="stylesheet" href="./style.css">`,

  // Top-level pages shown in the sidebar. Order matters.
  pages: [
    {name: "Spatial visualization", path: "/"},
    {name: "Rankings & trends",     path: "/rankings"},
    {name: "County comparisons",    path: "/scatter"},
    {name: "County profiles",       path: "/county"},
    {name: "How to use the dashboard", path: "/about"},
  ],

  // Dark color theme + Framework's built-in "wide" layout token (removes
  // the content max-width cap).
  theme: ["near-midnight", "wide"],

  header: "",
  footer:
    "Skill data derived from <b>Lightcast</b> (formerly Burning Glass Technologies) US Job Postings, 2010-2024. " +
    "Used under academic license.",

  sidebar: true,

  // Deployed at https://skills-econ-geog.netlify.app/ (Netlify, served from
  // domain root). The GH Pages mirror was retired in Phase 6; no `base` path
  // is needed.
  output: "dist",
};
