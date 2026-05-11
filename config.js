// ──────────────────────────────────────────────────────────────────────────────
//  config.js  — Edit this file to configure your catalog
// ──────────────────────────────────────────────────────────────────────────────

const CONFIG = {
  // Google Sheets document ID (the long string in the URL between /d/ and /edit)
  SHEET_ID: "1kta1-5Fqm9TblToqok6BCx-C58lmFpSXzP4iRCMKmHE",
  // https://docs.google.com/spreadsheets/d/1kta1-5Fqm9TblToqok6BCx-C58lmFpSXzP4iRCMKmHE/edit?usp=sharing

  // The name of the sheet tab that contains the catalog data
  SHEET_NAME: "Site",

  // Lab / catalog display name shown in the page title and header
  CATALOG_TITLE: "Lab Documentation Catalog",

  // Subtitle shown under the title
  CATALOG_SUBTITLE: "Your central hub for lab knowledge",

  // Default theme: "dark" or "light"
  DEFAULT_THEME: "dark",

  // How long to cache the fetched CSV (milliseconds). 0 = no cache.
  CACHE_TTL_MS: 5 * 60 * 1000,   // 5 minutes

  // Whether to auto-expand all H1 sections on load
  AUTO_EXPAND: true,
};