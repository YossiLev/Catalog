// ──────────────────────────────────────────────────────────────────────────────
//  app.js  — Application entry point
// ──────────────────────────────────────────────────────────────────────────────

(async function main() {

  // ── Element refs ─────────────────────────────────────────────────────────
  const catalogRoot   = document.getElementById("catalog-root");
  const tocNav        = document.getElementById("toc-nav");
  const loadingOverlay= document.getElementById("loading-overlay");
  const errorBanner   = document.getElementById("error-banner");
  const errorDetail   = document.getElementById("error-detail");
  const statusDot     = document.getElementById("status-dot");
  const statusText    = document.getElementById("status-text");
  const searchInput   = document.getElementById("search-input");
  const searchClear   = document.getElementById("search-clear");
  const srPanel       = document.getElementById("search-results-panel");
  const srQuery       = document.getElementById("sr-query");
  const srList        = document.getElementById("search-results-list");
  const btnExpandAll  = document.getElementById("btn-expand-all");
  const btnCollapseAll= document.getElementById("btn-collapse-all");
  const btnTheme      = document.getElementById("btn-theme");
  const btnReload     = document.getElementById("btn-reload");
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const sidebar       = document.getElementById("sidebar");
  const breadcrumb    = document.getElementById("breadcrumb");

  // ── Page title ────────────────────────────────────────────────────────────
  document.title = CONFIG.CATALOG_TITLE;
  const logoTitle = document.querySelector(".logo-title");
  if (logoTitle) logoTitle.textContent = CONFIG.CATALOG_TITLE;

  // ── Theme ─────────────────────────────────────────────────────────────────
  const savedTheme = localStorage.getItem("labcat-theme") || CONFIG.DEFAULT_THEME;
  applyTheme(savedTheme);

  btnTheme.addEventListener("click", () => {
    const current = document.body.dataset.theme;
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    localStorage.setItem("labcat-theme", next);
  });

  function applyTheme(theme) {
    document.body.dataset.theme = theme;
    btnTheme.title = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  }

  // ── Sidebar toggle ────────────────────────────────────────────────────────
  sidebarToggle.addEventListener("click", () => {
    sidebar.classList.toggle("sidebar-hidden");
    document.body.classList.toggle("sidebar-open");
  });

  // ── Data state ────────────────────────────────────────────────────────────
  let tree = [];

  async function loadData(bust = false) {
    loadingOverlay.hidden = false;
    catalogRoot.innerHTML = "";
    tocNav.innerHTML = "";
    errorBanner.hidden = true;
    setStatus("loading", "Loading…");

    if (bust) Parser.clearCache();

    try {
      tree = await Parser.load(CONFIG.SHEET_ID, CONFIG.SHEET_NAME);
      Renderer.renderTree(tree, catalogRoot);
      Renderer.buildTOC(tree, tocNav);
      setStatus("ok", "Loaded");
      loadingOverlay.hidden = true;
    } catch (err) {
      console.error(err);
      loadingOverlay.hidden = true;
      errorBanner.hidden = false;
      errorDetail.textContent = " " + err.message;
      setStatus("error", "Error");
    }
  }

  function setStatus(state, text) {
    statusDot.dataset.state = state;
    statusText.textContent = text;
  }

  btnReload.addEventListener("click", () => loadData(true));

  // ── Search ────────────────────────────────────────────────────────────────
  let searchTimeout;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(doSearch, 180);
  });
  searchInput.addEventListener("keydown", e => {
    if (e.key === "Escape") clearSearch();
  });
  searchClear.addEventListener("click", clearSearch);

  function doSearch() {
    const q = searchInput.value.trim();
    searchClear.hidden = !q;
    if (!q) {
      srPanel.hidden = true;
      catalogRoot.hidden = false;
      return;
    }
    const results = Renderer.searchTree(tree, q);
    srQuery.textContent = `"${q}"`;
    Renderer.renderSearchResults(results, q, srList);
    srPanel.hidden = false;
    catalogRoot.hidden = true;
  }

  function clearSearch() {
    searchInput.value = "";
    searchClear.hidden = true;
    srPanel.hidden = true;
    catalogRoot.hidden = false;
  }

  // ── Expand / Collapse all ─────────────────────────────────────────────────
  btnExpandAll.addEventListener("click", () => setAllSections(true));
  btnCollapseAll.addEventListener("click", () => setAllSections(false));

  function setAllSections(expand) {
    document.querySelectorAll(".section-toggle").forEach(btn => {
      const expanded = btn.getAttribute("aria-expanded") === "true";
      if (expand === expanded) return;
      btn.click();
    });
  }

  // ── Breadcrumb on scroll ──────────────────────────────────────────────────
  const scrollObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const h1 = entry.target.querySelector("h1,h2,h3");
        if (h1) breadcrumb.textContent = h1.textContent;
      }
    }
  }, { threshold: 0, rootMargin: "-30% 0px -60% 0px" });

  // Re-observe after render
  const bodyObserver = new MutationObserver(() => {
    document.querySelectorAll(".section-h1").forEach(s => scrollObserver.observe(s));
  });
  bodyObserver.observe(catalogRoot, { childList: true });

  // ── Keyboard shortcut: / focuses search ───────────────────────────────────
  document.addEventListener("keydown", e => {
    if (e.key === "/" && document.activeElement !== searchInput) {
      e.preventDefault();
      searchInput.focus();
    }
  });

  // ── Hash navigation ───────────────────────────────────────────────────────
  function scrollToHash() {
    const hash = location.hash.slice(1);
    if (!hash) return;
    setTimeout(() => {
      const target = document.getElementById(hash);
      if (target) {
        // Make sure parent sections are expanded
        let parent = target.parentElement;
        while (parent) {
          const body = parent.closest(".section-body");
          if (body && body.classList.contains("collapsed")) {
            body.classList.remove("collapsed");
            const id = body.id.replace("-body", "");
            const toggle = document.querySelector(`[aria-controls="${body.id}"]`);
            if (toggle) { toggle.setAttribute("aria-expanded","true"); toggle.querySelector(".toggle-chevron").textContent = "▾"; }
          }
          parent = parent.parentElement;
        }
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  }
  window.addEventListener("hashchange", scrollToHash);

  // ── Boot ──────────────────────────────────────────────────────────────────
  await loadData();
  scrollToHash();

})();