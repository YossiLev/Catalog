// ──────────────────────────────────────────────────────────────────────────────
//  renderer.js  — Turns the parsed tree into live DOM
// ──────────────────────────────────────────────────────────────────────────────

const Renderer = (() => {

  // ── Item type renderers ────────────────────────────────────────────────────
  // Each function receives the `params` array and returns an HTMLElement.
  // params[0] is always the first column after the type column.

  const itemRenderers = {

    // link  | label | url | [description]
    link(params) {
      const [label, url, desc] = params;
      const wrap = el("div", "item item-link");
      const a = el("a", "item-link-anchor");
      a.href = url || "#";
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = label || url || "Link";
      wrap.appendChild(iconEl("🔗"));
      wrap.appendChild(a);
      if (desc) {
        const d = el("span", "item-desc"); d.textContent = desc;
        wrap.appendChild(d);
      }
      return wrap;
    },

    // doc  | label | url | [description]
    doc(params) {
      const [label, url, desc] = params;
      const wrap = el("div", "item item-doc");
      const a = el("a", "item-link-anchor");
      a.href = url || "#"; a.target = "_blank"; a.rel = "noopener noreferrer";
      a.textContent = label || url || "Document";
      wrap.appendChild(iconEl("📄"));
      wrap.appendChild(a);
      if (desc) { const d = el("span", "item-desc"); d.textContent = desc; wrap.appendChild(d); }
      return wrap;
    },

    // pdf  | label | url | [description]
    pdf(params) {
      const [label, url, desc] = params;
      const wrap = el("div", "item item-pdf");
      const a = el("a", "item-link-anchor");
      a.href = url || "#"; a.target = "_blank"; a.rel = "noopener noreferrer";
      a.textContent = label || url || "PDF";
      wrap.appendChild(iconEl("📑"));
      wrap.appendChild(a);
      if (desc) { const d = el("span", "item-desc"); d.textContent = desc; wrap.appendChild(d); }
      return wrap;
    },

    // video  | label | url | [description]
    video(params) {
      const [label, url, desc] = params;
      const wrap = el("div", "item item-video");
      const a = el("a", "item-link-anchor");
      a.href = url || "#"; a.target = "_blank"; a.rel = "noopener noreferrer";
      a.textContent = label || url || "Video";
      wrap.appendChild(iconEl("🎬"));
      wrap.appendChild(a);
      if (desc) { const d = el("span", "item-desc"); d.textContent = desc; wrap.appendChild(d); }
      return wrap;
    },

    // image  | label | url | [alt text]
    image(params) {
      const [label, url, alt] = params;
      const wrap = el("div", "item item-image");
      const summary = el("details");
      const sumEl = el("summary");
      sumEl.appendChild(iconEl("🖼"));
      const titleSpan = el("span"); titleSpan.textContent = label || "Image";
      sumEl.appendChild(titleSpan);
      summary.appendChild(sumEl);
      const img = el("img");
      img.src = url || ""; img.alt = alt || label || "";
      img.loading = "lazy";
      summary.appendChild(img);
      wrap.appendChild(summary);
      return wrap;
    },

    // note  | text (free text, spans remaining params)
    note(params) {
      const wrap = el("div", "item item-note");
      wrap.appendChild(iconEl("📝"));
      const span = el("span"); span.textContent = params.join(" ");
      wrap.appendChild(span);
      return wrap;
    },

    // code  | label | language | code-snippet (or url)
    code(params) {
      const [label, lang, snippet] = params;
      const wrap = el("div", "item item-code");
      const hdr = el("div", "item-code-header");
      hdr.appendChild(iconEl("💻"));
      const lbl = el("span"); lbl.textContent = label || "Code"; hdr.appendChild(lbl);
      if (lang) { const badge = el("span", "code-lang"); badge.textContent = lang; hdr.appendChild(badge); }
      wrap.appendChild(hdr);
      if (snippet) {
        const pre = el("pre"); const code = el("code"); code.textContent = snippet;
        pre.appendChild(code); wrap.appendChild(pre);
      }
      return wrap;
    },

    // contact  | name | email | [role]
    contact(params) {
      const [name, email, role] = params;
      const wrap = el("div", "item item-contact");
      wrap.appendChild(iconEl("👤"));
      const span = el("span");
      span.textContent = name || "";
      if (role) span.textContent += ` (${role})`;
      wrap.appendChild(span);
      if (email) {
        const a = el("a", "item-link-anchor");
        a.href = `mailto:${email}`; a.textContent = email;
        wrap.appendChild(a);
      }
      return wrap;
    },

    // separator  (horizontal rule / visual break)
    separator(_params) {
      const hr = el("hr", "item-separator");
      return hr;
    },

    // embed  | label | url  (iframe embed)
    embed(params) {
      const [label, url] = params;
      const wrap = el("div", "item item-embed");
      const details = el("details");
      const sumEl = el("summary");
      sumEl.appendChild(iconEl("⧉"));
      const t = el("span"); t.textContent = label || "Embedded content"; sumEl.appendChild(t);
      details.appendChild(sumEl);
      const iframe = el("iframe");
      iframe.src = url || ""; iframe.loading = "lazy";
      iframe.setAttribute("allowfullscreen", "");
      details.appendChild(iframe);
      wrap.appendChild(details);
      return wrap;
    },
  };

  // Fallback for unknown types
  function unknownItem(type, params) {
    const wrap = el("div", "item item-unknown");
    wrap.appendChild(iconEl("❓"));
    const span = el("span");
    span.textContent = `[${type}] ${params.join(" | ")}`;
    wrap.appendChild(span);
    return wrap;
  }

  // ── DOM helpers ────────────────────────────────────────────────────────────
  function el(tag, cls) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }
  function iconEl(emoji) {
    const s = el("span", "item-icon"); s.textContent = emoji; return s;
  }

  // ── Recursive tree → DOM ───────────────────────────────────────────────────
  function renderTree(nodes, container, depth = 0) {
    for (const node of nodes) {
      switch (node.kind) {
        case "h1": container.appendChild(renderH1(node)); break;
        case "h2": container.appendChild(renderH2(node)); break;
        case "h3": container.appendChild(renderH3(node)); break;
        case "item": container.appendChild(renderItem(node)); break;
        case "note": container.appendChild(renderNote(node)); break;
      }
    }
  }

  function renderH1(node) {
    const section = el("section", "section-h1");
    section.id = node.id;

    const hdr = el("div", "section-h1-header");
    const toggle = el("button", "section-toggle");
    toggle.setAttribute("aria-expanded", CONFIG.AUTO_EXPAND ? "true" : "false");
    toggle.setAttribute("aria-controls", node.id + "-body");
    toggle.innerHTML = `<span class="toggle-chevron">${CONFIG.AUTO_EXPAND ? "▾" : "▸"}</span>`;

    const h = el("h1"); h.textContent = node.text;
    hdr.appendChild(toggle);
    hdr.appendChild(h);
    section.appendChild(hdr);

    const body = el("div", "section-body");
    body.id = node.id + "-body";
    if (!CONFIG.AUTO_EXPAND) body.classList.add("collapsed");

    renderTree(node.children || [], body, 1);
    section.appendChild(body);

    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!expanded));
      toggle.querySelector(".toggle-chevron").textContent = !expanded ? "▾" : "▸";
      body.classList.toggle("collapsed", expanded);
    });

    return section;
  }

  function renderH2(node) {
    const section = el("section", "section-h2");
    section.id = node.id;

    const hdr = el("div", "section-h2-header");
    const toggle = el("button", "section-toggle");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-controls", node.id + "-body");
    toggle.innerHTML = `<span class="toggle-chevron">▾</span>`;

    const h = el("h2"); h.textContent = node.text;
    hdr.appendChild(toggle);
    hdr.appendChild(h);
    section.appendChild(hdr);

    const body = el("div", "section-body");
    body.id = node.id + "-body";
    renderTree(node.children || [], body, 2);
    section.appendChild(body);

    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!expanded));
      toggle.querySelector(".toggle-chevron").textContent = !expanded ? "▾" : "▸";
      body.classList.toggle("collapsed", expanded);
    });

    return section;
  }

  function renderH3(node) {
    const section = el("section", "section-h3");
    section.id = node.id;

    const hdr = el("div", "section-h3-header");
    const toggle = el("button", "section-toggle");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-controls", node.id + "-body");
    toggle.innerHTML = `<span class="toggle-chevron">▾</span>`;

    const h = el("h3"); h.textContent = node.text;
    hdr.appendChild(toggle);
    hdr.appendChild(h);
    section.appendChild(hdr);

    const body = el("div", "section-body");
    body.id = node.id + "-body";
    renderTree(node.children || [], body, 3);
    section.appendChild(body);

    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!expanded));
      toggle.querySelector(".toggle-chevron").textContent = !expanded ? "▾" : "▸";
      body.classList.toggle("collapsed", expanded);
    });

    return section;
  }

  function renderItem(node) {
    const renderer = itemRenderers[node.type];
    if (renderer) return renderer(node.params);
    return unknownItem(node.type, node.params);
  }

  function renderNote(node) {
    const wrap = el("div", "item item-note");
    const span = el("span"); span.textContent = node.text;
    wrap.appendChild(span);
    return wrap;
  }

  // ── TOC builder ────────────────────────────────────────────────────────────
  function buildTOC(tree, container) {
    container.innerHTML = "";
    for (const node of tree) {
      if (node.kind === "h1") {
        const li = el("div", "toc-h1");
        const a = el("a"); a.href = "#" + node.id; a.textContent = node.text;
        li.appendChild(a);
        container.appendChild(li);

        for (const child of (node.children || [])) {
          if (child.kind === "h2") {
            const li2 = el("div", "toc-h2");
            const a2 = el("a"); a2.href = "#" + child.id; a2.textContent = child.text;
            li2.appendChild(a2);
            container.appendChild(li2);
          }
        }
      }
    }
  }

  // ── Search ─────────────────────────────────────────────────────────────────
  function flattenItems(tree, acc = []) {
    for (const node of tree) {
      if (["h1","h2","h3"].includes(node.kind)) {
        flattenItems(node.children || [], acc);
      } else if (node.kind === "item") {
        acc.push(node);
      }
    }
    return acc;
  }

  function searchTree(tree, query) {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const results = [];

    function walk(nodes, breadcrumb) {
      for (const node of nodes) {
        if (["h1","h2","h3"].includes(node.kind)) {
          const crumb = [...breadcrumb, node.text];
          walk(node.children || [], crumb);
        } else if (node.kind === "item") {
          const haystack = [node.type, ...node.params].join(" ").toLowerCase();
          if (haystack.includes(q)) {
            results.push({ node, breadcrumb });
          }
        } else if (node.kind === "note") {
          if (node.text.toLowerCase().includes(q)) {
            results.push({ node, breadcrumb });
          }
        }
      }
    }

    walk(tree, []);
    return results;
  }

  function renderSearchResults(results, query, container) {
    container.innerHTML = "";
    if (!results.length) {
      const p = el("p", "sr-empty"); p.textContent = "No results found.";
      container.appendChild(p); return;
    }
    for (const { node, breadcrumb } of results) {
      const card = el("div", "sr-card");
      const bc = el("div", "sr-breadcrumb");
      bc.textContent = breadcrumb.join(" › ");
      card.appendChild(bc);
      const itemEl = node.kind === "item" ? renderItem(node) : renderNote(node);
      card.appendChild(itemEl);
      container.appendChild(card);
    }
  }

  return { renderTree, buildTOC, searchTree, renderSearchResults };
})();