// ──────────────────────────────────────────────────────────────────────────────
//  parser.js  — Fetches and parses the Google Sheet CSV into a node tree
// ──────────────────────────────────────────────────────────────────────────────

const Parser = (() => {

  // ── CSV fetch ──────────────────────────────────────────────────────────────
  async function fetchCSV(sheetId, sheetName) {
    const encodedName = encodeURIComponent(sheetName);
    // Use the public CSV export endpoint (works for sheets shared "anyone with link")
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodedName}`;

    const cached = _loadCache(url);
    if (cached) return cached;

    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    const text = await resp.text();

    _saveCache(url, text);
    return text;
  }

  // ── Simple cache using sessionStorage ─────────────────────────────────────
  function _cacheKey(url) { return "labcat_" + btoa(url).slice(0, 60); }

  function _loadCache(url) {
    if (!CONFIG.CACHE_TTL_MS) return null;
    try {
      const raw = sessionStorage.getItem(_cacheKey(url));
      if (!raw) return null;
      const { ts, data } = JSON.parse(raw);
      if (Date.now() - ts < CONFIG.CACHE_TTL_MS) return data;
    } catch (_) {}
    return null;
  }

  function _saveCache(url, data) {
    if (!CONFIG.CACHE_TTL_MS) return;
    try {
      sessionStorage.setItem(_cacheKey(url), JSON.stringify({ ts: Date.now(), data }));
    } catch (_) {}
  }

  // ── RFC-4180 CSV tokeniser (handles quoted fields with commas/newlines) ───
  function parseCSV(text) {
    const rows = [];
    let row = [], field = "", inQuote = false;
    // Normalise line endings
    text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];

      if (inQuote) {
        if (ch === '"' && next === '"') { field += '"'; i++; }
        else if (ch === '"') { inQuote = false; }
        else { field += ch; }
      } else {
        if (ch === '"') { inQuote = true; }
        else if (ch === ',') { row.push(field); field = ""; }
        else if (ch === '\n') {
          row.push(field); field = "";
          rows.push(row); row = [];
        } else { field += ch; }
      }
    }
    if (field !== "" || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  // ── Row classifier ─────────────────────────────────────────────────────────
  function classifyRow(cols) {
    // cols is a raw string array from the CSV
    const c = (i) => (cols[i] || "").trim();

    // Skip blank rows
    if (cols.every(v => v.trim() === "")) return null;

    // Skip comment rows (first non-empty column starts with #)
    const firstNonempty = cols.find(v => v.trim() !== "");
    if (firstNonempty && firstNonempty.trim().startsWith("#")) return null;

    // Heading levels
    if (c(0) !== "" && c(1) === "" && c(2) === "" && c(3) === "") {
      return { kind: "h1", text: c(0) };
    }
    if (c(0) === "" && c(1) !== "" && c(2) === "" && c(3) === "") {
      return { kind: "h2", text: c(1) };
    }
    if (c(0) === "" && c(1) === "" && c(2) !== "" && c(3) === "") {
      return { kind: "h3", text: c(2) };
    }

    // Item row — col3 is type, rest are params
    const type = c(3).toLowerCase();
    if (type !== "") {
      const params = cols.slice(4).map(v => v.trim()).filter(v => v !== "");
      // Also capture columns 0-2 as context labels (some sheets mix heading + item on same row)
      const label0 = c(0), label1 = c(1), label2 = c(2);
      return { kind: "item", type, params, label0, label1, label2 };
    }

    // Fallback: treat as plain text note
    const text = cols.map(v => v.trim()).filter(v => v).join(" — ");
    return text ? { kind: "note", text } : null;
  }

  // ── Build document tree ────────────────────────────────────────────────────
  //
  //  Tree shape:
  //  [
  //    { kind:"h1", text, id, children: [
  //      { kind:"h2", text, id, children: [
  //        { kind:"h3", text, id, children: [ ...items ] }
  //        { kind:"item", ... }
  //      ]}
  //      { kind:"item", ... }
  //    ]}
  //  ]

  let _idCounter = 0;
  function uid(prefix) { return `${prefix}-${++_idCounter}`; }

  function buildTree(rows) {
    _idCounter = 0;
    const root = [];
    let h1Node = null, h2Node = null, h3Node = null;

    for (const cols of rows) {
      const node = classifyRow(cols);
      if (!node) continue;

      if (node.kind === "h1") {
        node.id = uid("h1");
        node.children = [];
        root.push(node);
        h1Node = node; h2Node = null; h3Node = null;

      } else if (node.kind === "h2") {
        node.id = uid("h2");
        node.children = [];
        const parent = h1Node || root;
        if (h1Node) h1Node.children.push(node);
        else root.push(node);
        h2Node = node; h3Node = null;

      } else if (node.kind === "h3") {
        node.id = uid("h3");
        node.children = [];
        if (h2Node) h2Node.children.push(node);
        else if (h1Node) h1Node.children.push(node);
        else root.push(node);
        h3Node = node;

      } else {
        // item / note — attach to deepest open heading
        const target = h3Node || h2Node || h1Node;
        if (target) target.children.push(node);
        else root.push(node);
      }
    }
    return root;
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  async function load(sheetId, sheetName) {
    const csv = await fetchCSV(sheetId, sheetName);
    const rows = parseCSV(csv);
    return buildTree(rows);
  }

  function clearCache() {
    for (const k of Object.keys(sessionStorage)) {
      if (k.startsWith("labcat_")) sessionStorage.removeItem(k);
    }
  }

  return { load, clearCache, parseCSV, buildTree };

})();