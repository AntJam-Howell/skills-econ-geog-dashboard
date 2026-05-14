// Hybrid county selector: text-input filter + alphabetical browse panel.
//
// Returns a DOM element compatible with Observable Framework's `view()` —
// it has a `value` getter (FIPS string) and dispatches "input" events when
// the selection changes.
//
// Usage:
//   const fips = view(countySelector({cMeta, value: "25025", label: "County"}));
//
// Behavior:
//   - Click the field → panel opens. When empty, panel shows all 3,194 counties
//     alphabetical (rendered in a fixed-height scrollable container — modern
//     browsers handle 3k DOM nodes fine in a single scroll viewport).
//   - Type to filter (case-insensitive substring match against name + state + FIPS).
//     Match count shown above the list ("Showing 12 of 3,194 matching 'mar'").
//   - Arrow keys move highlighted row; Enter selects; Escape closes without changing.
//   - Selecting collapses the panel and dispatches `input`.

const PANEL_MAX_HEIGHT = 280;
const ROW_HEIGHT = 26;

// Monotonically increasing instance counter so each combobox gets unique
// element IDs for ARIA wiring (aria-controls / aria-activedescendant must
// reference real IDs in the same document).
let _instanceCounter = 0;

export function countySelector({cMeta, value: initialFips, label = "County"} = {}) {
  const instanceId = ++_instanceCounter;
  const listboxId = `county-selector-list-${instanceId}`;
  const rowId = (i) => `county-selector-row-${instanceId}-${i}`;
  const options = Object.entries(cMeta)
    .map(([fips, m]) => ({
      fips,
      name: m.name,
      state: m.state,
      label: `${m.name}, ${m.state} (${fips})`,
      searchable: `${m.name} ${m.state} ${fips}`.toLowerCase(),
    }))
    .sort((a, b) =>
      a.name.localeCompare(b.name) || a.state.localeCompare(b.state)
    );

  const optionByFips = new Map(options.map(o => [o.fips, o]));

  let selectedFips =
    optionByFips.has(initialFips) ? initialFips :
    options[0].fips;
  let highlighted = -1;
  let isOpen = false;
  let filtered = options;

  // Container: vertical stack with a label, the input, and the floating panel.
  const root = document.createElement("div");
  root.className = "county-selector";
  root.style.cssText = "position: relative; display: flex; flex-direction: column; gap: 4px; width: 100%; max-width: 460px; font-size: 13px;";

  // Label.
  const lbl = document.createElement("label");
  lbl.textContent = label;
  lbl.style.cssText = "color: var(--theme-foreground-muted, #888); font-size: 12px;";

  // The input field. Mimics Inputs.select dark theme. ARIA: this is the
  // editable text portion of a combobox (W3C APG combobox-with-listbox
  // pattern). The listbox is referenced via aria-controls; activedescendant
  // tracks the highlighted row without moving DOM focus.
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Type county name, state, or FIPS";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-haspopup", "listbox");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-controls", listboxId);
  input.setAttribute("aria-label", label);
  input.style.cssText = `
    padding: 5px 8px;
    background: var(--theme-background-alt, #2a2a2a);
    color: var(--theme-foreground, #ddd);
    border: 1px solid var(--theme-foreground-faintest, #444);
    border-radius: 3px;
    font: inherit;
    width: 100%;
    box-sizing: border-box;
  `;
  input.value = optionByFips.get(selectedFips)?.label ?? "";

  // Floating panel.
  const panel = document.createElement("div");
  panel.className = "county-selector-panel";
  panel.style.cssText = `
    position: absolute;
    top: calc(100% + 2px);
    left: 0;
    right: 0;
    z-index: 100;
    max-height: ${PANEL_MAX_HEIGHT}px;
    overflow-y: auto;
    background: var(--theme-background-alt, #1f1f1f);
    border: 1px solid var(--theme-foreground-faintest, #444);
    border-radius: 3px;
    box-shadow: 0 6px 18px rgba(0,0,0,0.4);
    display: none;
  `;

  const status = document.createElement("div");
  status.id = `${listboxId}-status`;
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  status.style.cssText = `
    padding: 5px 10px;
    color: var(--theme-foreground-muted, #888);
    font-size: 11.5px;
    border-bottom: 1px solid var(--theme-foreground-faintest, #333);
    background: var(--theme-background, #161616);
    position: sticky;
    top: 0;
  `;

  const list = document.createElement("div");
  list.id = listboxId;
  list.setAttribute("role", "listbox");
  list.setAttribute("aria-label", `${label} options`);
  list.style.cssText = "display: flex; flex-direction: column;";

  panel.appendChild(status);
  panel.appendChild(list);

  root.appendChild(lbl);
  root.appendChild(input);
  root.appendChild(panel);

  function applyFilter(query) {
    const term = (query ?? "").toLowerCase().trim();
    if (!term) {
      filtered = options;
      status.textContent = `${options.length.toLocaleString()} counties — type to filter`;
    } else {
      filtered = options.filter(o => o.searchable.includes(term));
      status.textContent = `Showing ${filtered.length.toLocaleString()} of ${options.length.toLocaleString()} counties matching "${query}"`;
    }
    highlighted = filtered.length > 0 ? 0 : -1;
    renderList();
  }

  function renderList() {
    list.innerHTML = "";
    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.textContent = "No matches";
      empty.style.cssText = "padding: 10px; color: var(--theme-foreground-muted, #888); font-style: italic; text-align: center;";
      list.appendChild(empty);
      return;
    }
    const frag = document.createDocumentFragment();
    filtered.forEach((o, i) => {
      const row = document.createElement("div");
      row.id = rowId(i);
      row.setAttribute("role", "option");
      row.setAttribute("aria-selected", o.fips === selectedFips ? "true" : "false");
      row.dataset.index = i;
      row.dataset.fips = o.fips;
      row.style.cssText = `
        padding: 4px 10px;
        height: ${ROW_HEIGHT - 8}px;
        line-height: ${ROW_HEIGHT - 8}px;
        cursor: pointer;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: var(--theme-foreground, #ddd);
      `;
      if (o.fips === selectedFips) {
        row.style.background = "rgba(110, 231, 183, 0.13)";
        row.style.color = "#6ee7b7";
      }
      if (i === highlighted) {
        row.style.background = "rgba(255,255,255,0.08)";
      }
      // Render with name, state visually distinct from FIPS.
      row.innerHTML = `<span>${escapeHtml(o.name)}, ${escapeHtml(o.state)}</span> <span style="color: var(--theme-foreground-muted, #777); font-size: 11px;">${o.fips}</span>`;
      row.addEventListener("mousedown", e => {
        // mousedown so it fires before input blur
        e.preventDefault();
        select(o.fips);
      });
      row.addEventListener("mouseenter", () => {
        highlighted = i;
        updateActiveDescendant();
        // Just refresh row backgrounds without rebuilding (cheap path).
        for (const r of list.children) {
          const ri = +r.dataset.index;
          const rf = r.dataset.fips;
          r.style.background =
            rf === selectedFips ? "rgba(110, 231, 183, 0.13)" :
            ri === highlighted ? "rgba(255,255,255,0.08)" :
            "";
        }
      });
      frag.appendChild(row);
    });
    list.appendChild(frag);
    updateActiveDescendant();
  }

  // Keep aria-activedescendant pointing at the highlighted row so screen
  // readers announce the current option without DOM focus leaving the input.
  function updateActiveDescendant() {
    if (highlighted >= 0 && highlighted < filtered.length) {
      input.setAttribute("aria-activedescendant", rowId(highlighted));
    } else {
      input.removeAttribute("aria-activedescendant");
    }
  }

  function scrollHighlightedIntoView() {
    if (highlighted < 0) return;
    const row = list.children[highlighted];
    if (!row) return;
    const rt = row.offsetTop;
    const rb = rt + row.offsetHeight;
    if (rt < panel.scrollTop + status.offsetHeight) {
      panel.scrollTop = rt - status.offsetHeight;
    } else if (rb > panel.scrollTop + panel.clientHeight) {
      panel.scrollTop = rb - panel.clientHeight;
    }
  }

  function open() {
    if (isOpen) return;
    isOpen = true;
    panel.style.display = "block";
    input.setAttribute("aria-expanded", "true");
    applyFilter(input.value && input.value !== optionByFips.get(selectedFips)?.label ? input.value : "");
    // If the user just opened with no typing, scroll to the selected county.
    if (!input.dataset.userTyped) {
      const idx = filtered.findIndex(o => o.fips === selectedFips);
      if (idx >= 0) {
        highlighted = idx;
        renderList();
        // Rendered after layout — scroll on next tick.
        requestAnimationFrame(scrollHighlightedIntoView);
      }
    }
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    panel.style.display = "none";
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    // Restore the canonical label so the input doesn't show stale typed text.
    input.value = optionByFips.get(selectedFips)?.label ?? "";
    delete input.dataset.userTyped;
  }

  function select(fips) {
    if (!optionByFips.has(fips)) return;
    const changed = fips !== selectedFips;
    selectedFips = fips;
    input.value = optionByFips.get(fips).label;
    delete input.dataset.userTyped;
    close();
    if (changed) {
      root.dispatchEvent(new Event("input", {bubbles: true}));
    }
  }

  // Wire up input events.
  input.addEventListener("focus", open);
  input.addEventListener("input", () => {
    input.dataset.userTyped = "1";
    if (!isOpen) open();
    applyFilter(input.value);
  });
  input.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") {
      if (!isOpen) { open(); return; }
      e.preventDefault();
      if (filtered.length === 0) return;
      highlighted = (highlighted + 1) % filtered.length;
      renderList();
      scrollHighlightedIntoView();
    } else if (e.key === "ArrowUp") {
      if (!isOpen) return;
      e.preventDefault();
      if (filtered.length === 0) return;
      highlighted = (highlighted - 1 + filtered.length) % filtered.length;
      renderList();
      scrollHighlightedIntoView();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isOpen && highlighted >= 0 && filtered[highlighted]) {
        select(filtered[highlighted].fips);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
      input.blur();
    }
  });

  // Click outside closes the panel.
  document.addEventListener("mousedown", e => {
    if (!root.contains(e.target)) close();
  });

  // The Observable contract: expose `value` getter.
  Object.defineProperty(root, "value", {
    get() { return selectedFips; },
    set(v) {
      if (optionByFips.has(v)) {
        selectedFips = v;
        input.value = optionByFips.get(v).label;
      }
    },
    configurable: true,
  });

  return root;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
