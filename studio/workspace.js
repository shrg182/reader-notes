(function () {
  const workspaceRoot = document.currentScript?.src
    ? new URL(".", document.currentScript.src)
    : new URL("./", window.ReaderAssetsBase || location.href);

  const key = "reading-workspace-skin";
  const requested = new URLSearchParams(location.search).get("skin");
  const saved = localStorage.getItem(key);
  const englishFirst = /English-First Reader/i.test(document.title) || document.documentElement.lang.toLowerCase().startsWith("en");
  const russianFirst = /Russian Reader/i.test(document.title) || document.documentElement.lang.toLowerCase().startsWith("ru");
  const interfaceLanguageKey = "reading-workspace-interface-language-v1";
  const interfacePreference = localStorage.getItem(interfaceLanguageKey) || "auto";
  const interfaceLanguage = interfacePreference === "auto" ? (russianFirst ? "ru" : englishFirst ? "en" : "zh") : interfacePreference;
  const englishInterface = englishFirst || (russianFirst && interfaceLanguage === "en");
  const russianInterface = russianFirst && interfaceLanguage === "ru";
  const fallback = "sheet";
  const supportedSkins = new Set(["reading", "sheet", "source"]);
  const initial = supportedSkins.has(requested)
    ? requested
    : (supportedSkins.has(saved) ? saved : fallback);
  const readingThemeKey = "reading-workspace-color-theme-v1";
  const initialReadingTheme = localStorage.getItem(readingThemeKey) === "night" ? "night" : "day";

  document.documentElement.dataset.readingTheme = initialReadingTheme;
  const readingThemeStyle = document.createElement("style");
  readingThemeStyle.id = "reading-workspace-color-theme";
  readingThemeStyle.textContent = `
    html[data-reading-theme="night"]{color-scheme:dark;--bg:#090b0e!important;--paper:#11151a!important;--panel:#14191f!important;--ink:#e8eaed!important;--muted:#aeb4bc!important;--line:#343b44!important;--soft:#20262d!important;--accent:#ef9a9a!important;--accent-ink:#17191c!important;--warn:#f6c26b!important;--ok:#81c995!important;--workspace-surface:#11151a!important;--workspace-canvas:#090b0e!important;--workspace-border:#343b44!important;--workspace-text:#e8eaed!important;--workspace-muted:#aeb4bc!important;--workspace-green-soft:#173b2a!important;--workspace-blue-soft:#172b46!important;--reading-content-background:#11151a!important}
    html[data-reading-theme="night"] body,html[data-reading-theme="night"] .app,html[data-reading-theme="night"] main,html[data-reading-theme="night"] .shell{background:#090b0e!important;color:#e8eaed!important}
    html[data-reading-theme="night"] header,html[data-reading-theme="night"] .topbar,html[data-reading-theme="night"] .toolbar,html[data-reading-theme="night"] .actions,html[data-reading-theme="night"] .controls,html[data-reading-theme="night"] .masthead,html[data-reading-theme="night"] footer{background:#11151a!important;color:#e8eaed!important;border-color:#343b44!important}
    html[data-reading-theme="night"] .paper,html[data-reading-theme="night"] .editor,html[data-reading-theme="night"] #editor[contenteditable],html[data-reading-theme="night"] .rich-editor,html[data-reading-theme="night"] .editor-panel,html[data-reading-theme="night"] .page,html[data-reading-theme="night"] .page-card,html[data-reading-theme="night"] .panel,html[data-reading-theme="night"] .reference-panel,html[data-reading-theme="night"] .source-viewer,html[data-reading-theme="night"] .source-viewer-head,html[data-reading-theme="night"] .toc-page,html[data-reading-theme="night"] .toc-head,html[data-reading-theme="night"] .toc-link,html[data-reading-theme="night"] .collection,html[data-reading-theme="night"] .entry,html[data-reading-theme="night"] .book,html[data-reading-theme="night"] .book-header,html[data-reading-theme="night"] .category-header,html[data-reading-theme="night"] .note-controls,html[data-reading-theme="night"] .log-list{background:#11151a!important;color:#e8eaed!important;border-color:#343b44!important}
    html[data-reading-theme="night"] input,html[data-reading-theme="night"] textarea,html[data-reading-theme="night"] select,html[data-reading-theme="night"] button,html[data-reading-theme="night"] .action-link,html[data-reading-theme="night"] .file-label,html[data-reading-theme="night"] .category-chip,html[data-reading-theme="night"] .collection-tool{background:#1a2027!important;color:#e8eaed!important;border-color:#434b55!important}
    html[data-reading-theme="night"] table,html[data-reading-theme="night"] th,html[data-reading-theme="night"] td{background:#11151a!important;color:#e8eaed!important;border-color:#343b44!important}
    html[data-reading-theme="night"] a{color:#8ab4f8}html[data-reading-theme="night"] .source,html[data-reading-theme="night"] .status,html[data-reading-theme="night"] .subtitle,html[data-reading-theme="night"] .log-meta,html[data-reading-theme="night"] .entry-number,html[data-reading-theme="night"] time{color:#aeb4bc!important}
    html[data-reading-theme="night"] .rich-editor.annotated-view{background:#1d1a10!important;color:#f1e1aa!important}html[data-reading-theme="night"] .dictionary-occurrence-hit{background:#705b00!important;color:#fff4bd!important}
    html[data-reading-theme="night"] #editor[contenteditable] .lead,html[data-reading-theme="night"] #editor[contenteditable] .objectives,html[data-reading-theme="night"] #editor[contenteditable] .case,html[data-reading-theme="night"] #editor[contenteditable] .reader-footnotes{background:#17241e!important;color:#e8eaed!important;border-color:#365448!important}
    html[data-reading-theme="night"] #editor[contenteditable] .boundary,html[data-reading-theme="night"] #editor[contenteditable] .comment-block{background:#292315!important;color:#f1dfb5!important;border-color:#6e5930!important}
    html[data-reading-theme="night"] #editor[contenteditable] .eyebrow,html[data-reading-theme="night"] #editor[contenteditable] .interlinear-note ruby>rt{color:#d8aa74!important}html[data-reading-theme="night"] #editor[contenteditable] h2{border-color:#343b44!important}
    html[data-reading-theme="night"] .editor .notation rt,html[data-reading-theme="night"] .editor .interlinear-note rt,html[data-reading-theme="night"] .rich-editor .notation rt,html[data-reading-theme="night"] .rich-editor .interlinear-note rt{color:#f6c26b!important;font-weight:600!important}
    html[data-reading-theme="night"] .editor .notation,html[data-reading-theme="night"] .editor .term-anchor,html[data-reading-theme="night"] .editor .doubt,html[data-reading-theme="night"] .editor .comment-anchor,html[data-reading-theme="night"] #editor[contenteditable] .notation,html[data-reading-theme="night"] #editor[contenteditable] .term-anchor,html[data-reading-theme="night"] #editor[contenteditable] .doubt,html[data-reading-theme="night"] #editor[contenteditable] .comment-anchor,html[data-reading-theme="night"] .rich-editor .notation,html[data-reading-theme="night"] .rich-editor .term-anchor,html[data-reading-theme="night"] .rich-editor .doubt,html[data-reading-theme="night"] .rich-editor .comment-anchor,html[data-reading-theme="night"] .editor [style*="background-color"],html[data-reading-theme="night"] #editor[contenteditable] [style*="background-color"],html[data-reading-theme="night"] .rich-editor [style*="background-color"]{color:#202124!important}
    .reading-theme-toggle{min-height:32px;padding:5px 11px;border:1px solid #c9c3b7;border-radius:18px;background:#fff;color:#202124;font:12px/1.2 Arial,"PingFang SC",sans-serif;cursor:pointer;white-space:nowrap}
    html[data-reading-theme="night"] .reading-theme-toggle{background:#242a31!important;color:#f1f3f4!important;border-color:#59636f!important}
    @media(max-width:700px){.reading-theme-toggle{min-height:38px}}
    @media print{.reading-theme-toggle{display:none!important}}
  `;
  document.head.appendChild(readingThemeStyle);

  function applySkin(skin, persist) {
    document.documentElement.dataset.workspaceSkin = skin;
    const theme = document.querySelector('link[href$="workspace_theme.css"]');
    if (theme) theme.disabled = skin === "reading" || skin === "source";
    document.querySelectorAll("[data-skin-choice]").forEach((button) => {
      const active = button.dataset.skinChoice === skin;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    if (persist) localStorage.setItem(key, skin);
  }

  applySkin(initial, false);

  function installReadingThemeToggle() {
    if (document.querySelector(".reading-theme-toggle")) return;
    const host = document.querySelector(".masthead-inner") || document.querySelector(".topbar") || document.querySelector(".toolbar");
    if (!host) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "reading-theme-toggle";
    const apply = (theme, persist = true) => {
      const night = theme === "night";
      document.documentElement.dataset.readingTheme = night ? "night" : "day";
      button.textContent = night
        ? (englishInterface ? "☀ Day" : russianInterface ? "☀ День" : "☀ 日间")
        : (englishInterface ? "☾ Night" : russianInterface ? "☾ Ночь" : "☾ 夜间");
      button.title = night
        ? (englishInterface ? "Switch to light appearance" : russianInterface ? "Включить светлую тему" : "切换为日间模式")
        : (englishInterface ? "Switch to dark appearance" : russianInterface ? "Включить тёмную тему" : "切换为夜间模式");
      button.setAttribute("aria-pressed", String(night));
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", night ? "#090b0e" : "#188038");
      if (persist) localStorage.setItem(readingThemeKey, night ? "night" : "day");
    };
    button.addEventListener("click", () => apply(document.documentElement.dataset.readingTheme === "night" ? "day" : "night"));
    host.appendChild(button);
    apply(initialReadingTheme, false);
  }

  function installToolbarLayering() {
    if (!document.querySelector(".toolbar") || !document.querySelector(".workspace") || document.getElementById("workspace-toolbar-layering")) return;
    const style = document.createElement("style");
    style.id = "workspace-toolbar-layering";
    style.textContent = `.toolbar{position:sticky!important;top:0!important;z-index:500!important}.topbar{position:relative!important;z-index:501!important}@media(min-width:851px){.toolbar{max-height:none!important;overflow:visible!important}.workspace{position:relative!important;z-index:1!important}}`;
    document.head.appendChild(style);
  }

  function installDictionaryOccurrences() {
    const lists = [...document.querySelectorAll(".term-list")];
    const editor = document.querySelector(".rich-editor,#editor.editor,.editor[contenteditable]");
    if (!lists.length || !editor) return;
    const labels = englishInterface
      ? { heading: "Occurrences", none: "Not found in the current text.", previous: "Previous", next: "Next", result: "occurrence" }
      : russianInterface
        ? { heading: "Вхождения", none: "В текущем тексте не найдено.", previous: "Назад", next: "Далее", result: "вхождение" }
        : { heading: "正文用例", none: "当前正文中未找到这个词。", previous: "上一处", next: "下一处", result: "处" };
    const style = document.createElement("style");
    style.textContent = `.dictionary-occurrences{margin-top:9px;padding:10px;border:1px solid #c9d8df;border-radius:6px;background:#f7fbfc;color:#202124;font:12px/1.45 Arial,"PingFang SC",sans-serif}.dictionary-occurrences[hidden]{display:none}.dictionary-occurrences-header{display:flex;gap:7px;align-items:center;margin-bottom:7px}.dictionary-occurrences-header strong{margin-right:auto}.dictionary-occurrences-header button{min-height:27px!important;padding:3px 7px!important}.dictionary-occurrence-list{display:grid;gap:5px;max-height:190px;overflow:auto}.dictionary-occurrence{display:grid!important;grid-template-columns:24px 1fr;gap:6px;width:100%;min-height:0!important;padding:6px 7px!important;text-align:left!important;border:1px solid #dbe5e9!important;background:#fff!important;color:#3c4043!important}.dictionary-occurrence.active{border-color:#1a73e8!important;background:#e8f0fe!important}.dictionary-occurrence-index{color:#5f6368;font-weight:700}.dictionary-occurrence-hit{background:#fff1a8;color:#202124}.dictionary-text-target{border-radius:2px;outline:3px solid #f4c542;outline-offset:2px}.toolbar.collapsed{min-height:42px}`;
    document.head.appendChild(style);
    const excluded = "rt,.inline-gloss,.comment-block,.footnote-ref,.inline-media,.annotation-register,[contenteditable=false]";
    const escapeMarkup = value => String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
    let matches = [], activeIndex = -1, activeTarget = null, timer = 0;
    const clearTarget = () => {
      if (activeTarget) activeTarget.classList?.remove("dictionary-text-target");
      activeTarget = null;
      clearTimeout(timer);
    };
    const textMatches = term => {
      const found = [], walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
      let node;
      while (node = walker.nextNode()) {
        if (!node.nodeValue.includes(term) || node.parentElement?.closest(excluded)) continue;
        let offset = 0;
        while ((offset = node.nodeValue.indexOf(term, offset)) !== -1) {
          found.push({ node, offset, term });
          offset += Math.max(term.length, 1);
        }
      }
      return found;
    };
    const excerpt = match => {
      const block = match.node.parentElement?.closest("p,li,td,th,h1,h2,h3") || match.node.parentElement;
      const text = (block?.innerText || block?.textContent || match.node.nodeValue).replace(/\s+/g, " ").trim();
      const position = Math.max(0, text.indexOf(match.term));
      const start = Math.max(0, position - 22), end = Math.min(text.length, position + match.term.length + 30);
      return `${start ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
    };
    const selectMatch = (index, panel) => {
      if (!matches.length) return;
      activeIndex = (index + matches.length) % matches.length;
      const match = matches[activeIndex];
      if (!match.node.isConnected) return;
      clearTarget();
      const range = document.createRange();
      range.setStart(match.node, match.offset);
      range.setEnd(match.node, match.offset + match.term.length);
      const selection = getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      activeTarget = match.node.parentElement;
      activeTarget?.classList.add("dictionary-text-target");
      activeTarget?.scrollIntoView({ behavior: "smooth", block: "center" });
      timer = setTimeout(clearTarget, 2400);
      panel.querySelectorAll(".dictionary-occurrence").forEach((button, buttonIndex) => button.classList.toggle("active", buttonIndex === activeIndex));
      panel.querySelector("[data-occurrence-count]").textContent = `${activeIndex + 1}/${matches.length}`;
    };
    for (const list of lists) {
      if (list.parentElement.querySelector(":scope > .dictionary-occurrences")) continue;
      const panel = document.createElement("section");
      panel.className = "dictionary-occurrences";
      panel.hidden = true;
      panel.innerHTML = `<div class="dictionary-occurrences-header"><strong>${labels.heading}</strong><span data-occurrence-count></span><button type="button" data-occurrence-previous>${labels.previous}</button><button type="button" data-occurrence-next>${labels.next}</button></div><div class="dictionary-occurrence-list"></div>`;
      list.after(panel);
      list.addEventListener("click", event => {
        if (event.target.closest(".edit-term")) return;
        const row = event.target.closest(".term");
        if (!row || !list.contains(row)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        const term = row.querySelector("strong")?.textContent?.trim();
        if (!term) return;
        matches = textMatches(term);
        activeIndex = -1;
        panel.hidden = false;
        const results = panel.querySelector(".dictionary-occurrence-list");
        if (!matches.length) {
          results.innerHTML = `<div>${labels.none}</div>`;
          panel.querySelector("[data-occurrence-count]").textContent = "0";
          return;
        }
        results.replaceChildren(...matches.map((match, index) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "dictionary-occurrence";
          button.dataset.occurrenceIndex = String(index);
          const source = excerpt(match), hit = source.indexOf(term);
          const rendered = hit < 0 ? escapeMarkup(source) : `${escapeMarkup(source.slice(0, hit))}<mark class="dictionary-occurrence-hit">${escapeMarkup(term)}</mark>${escapeMarkup(source.slice(hit + term.length))}`;
          button.innerHTML = `<span class="dictionary-occurrence-index">${index + 1}</span><span>${rendered}</span>`;
          button.setAttribute("aria-label", `${term}: ${labels.result} ${index + 1}/${matches.length}`);
          return button;
        }));
        selectMatch(0, panel);
      }, true);
      panel.addEventListener("click", event => {
        const result = event.target.closest("[data-occurrence-index]");
        if (result) selectMatch(Number(result.dataset.occurrenceIndex), panel);
        else if (event.target.closest("[data-occurrence-previous]")) selectMatch(activeIndex - 1, panel);
        else if (event.target.closest("[data-occurrence-next]")) selectMatch(activeIndex + 1, panel);
      });
    }
  }

  function installColoredUnderlines() {
    const popovers = [...document.querySelectorAll(".format-popover")];
    if (!popovers.length) return;
    const editorSelector = ".rich-editor,#editor.editor,.editor[contenteditable]";
    const colors = [
      ["#d39e00", englishInterface ? "Yellow underline" : russianInterface ? "Жёлтое подчёркивание" : "黄色下划线"],
      ["#2e8b57", englishInterface ? "Green underline" : russianInterface ? "Зелёное подчёркивание" : "绿色下划线"],
      ["#2474a6", englishInterface ? "Blue underline" : russianInterface ? "Синее подчёркивание" : "蓝色下划线"],
      ["#d94f87", englishInterface ? "Pink underline" : russianInterface ? "Розовое подчёркивание" : "粉色下划线"],
      ["#8e44ad", englishInterface ? "Purple underline" : russianInterface ? "Фиолетовое подчёркивание" : "紫色下划线"]
    ];
    let underlineRange = null;
    const captureRange = () => {
      const selection = getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement;
      if (container?.closest(editorSelector)) underlineRange = range.cloneRange();
    };
    document.addEventListener("selectionchange", captureRange);
    document.addEventListener("mouseup", captureRange, true);
    const style = document.createElement("style");
    style.textContent = `.format-underline-swatch{position:relative;width:15px;height:15px;flex:0 0 auto}.format-underline-swatch::after{position:absolute;left:1px;right:1px;bottom:2px;height:3px;border-radius:2px;background:var(--underline-color);content:""}`;
    document.head.appendChild(style);
    for (const popover of popovers) {
      if (popover.querySelector("[data-underline-color]")) continue;
      const neutralUnderline = popover.querySelector('[data-command="underline"]');
      if (!neutralUnderline) continue;
      const fragment = document.createDocumentFragment();
      for (const [color, label] of colors) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "format-option";
        button.setAttribute("role", "menuitem");
        button.dataset.underlineColor = color;
        button.dataset.label = label;
        button.innerHTML = `<span class="format-underline-swatch" style="--underline-color:${color}" aria-hidden="true"></span>${label}`;
        fragment.appendChild(button);
      }
      neutralUnderline.before(fragment);
    }
    document.addEventListener("mousedown", event => {
      if (event.target.closest("[data-underline-color]")) event.preventDefault();
    }, true);
    document.addEventListener("click", event => {
      const button = event.target.closest("[data-underline-color]");
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const range = underlineRange;
      const container = range && (range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement);
      const editor = container?.closest(editorSelector);
      if (!range || range.collapsed || !editor) return;
      const span = document.createElement("span");
      span.style.textDecorationLine = "underline";
      span.style.textDecorationColor = button.dataset.underlineColor;
      span.style.textDecorationThickness = "1.5px";
      span.style.textUnderlineOffset = ".2em";
      try { range.surroundContents(span); }
      catch { span.append(range.extractContents()); range.insertNode(span); }
      editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "formatUnderline" }));
      const menu = button.closest(".format-menu");
      menu?.classList.remove("open");
      menu?.querySelector("[aria-expanded]")?.setAttribute("aria-expanded", "false");
      underlineRange = null;
    }, true);
  }

  function installPwaAssets() {
    if (!document.querySelector('meta[name="viewport"]')) {
      const viewport = document.createElement("meta");
      viewport.name = "viewport"; viewport.content = "width=device-width,initial-scale=1,viewport-fit=cover";
      document.head.appendChild(viewport);
    }
    if (!document.querySelector('link[rel="manifest"]')) {
      const manifest = document.createElement("link");
      manifest.rel = "manifest"; manifest.href = new URL("manifest.webmanifest", workspaceRoot).href;
      document.head.appendChild(manifest);
    }
    if (!document.querySelector('meta[name="theme-color"]')) {
      const theme = document.createElement("meta");
      theme.name = "theme-color"; theme.content = "#188038"; document.head.appendChild(theme);
    }
    if (!document.querySelector('link[rel="apple-touch-icon"]')) {
      const touchIcon = document.createElement("link");
      touchIcon.rel = "apple-touch-icon";
      touchIcon.href = new URL("icons/reading-room-192.png", workspaceRoot).href;
      document.head.appendChild(touchIcon);
    }
    if (!document.querySelector('script[src$="mobile_pwa.js"]')) {
      const script = document.createElement("script");
      script.src = new URL("mobile_pwa.js", workspaceRoot).href; script.defer = true;
      document.head.appendChild(script);
    }
  }

  // Installation is managed by the host app.

  function installProjectDictionaryLinks() {
    const base = location.protocol === "file:" ? new URL("../", workspaceRoot) : workspaceRoot;
    document.querySelectorAll('a[href*="project_dictionary/"]').forEach((link) => {
      const original = link.getAttribute("href") || "";
      const suffix = original.split("project_dictionary/")[1] || "index.html";
      link.href = new URL(`project_dictionary/${suffix}`, base).href;
    });
  }

  function recordReading() {
    const match = decodeURIComponent(location.pathname).match(/\/practice\/(.+\/editor\.html)$/);
    if (!match) return;
    const editorPath = match[1];
    const historyKey = "reading-workspace-history-v1";
    const sessionKey = `reading-workspace-counted:${editorPath}`;
    let history = {};
    try { history = JSON.parse(localStorage.getItem(historyKey) || "{}"); } catch { history = {}; }
    const previous = history[editorPath] || {};
    history[editorPath] = {
      count: (Number(previous.count) || 0) + (sessionStorage.getItem(sessionKey) ? 0 : 1),
      firstRead: previous.firstRead || new Date().toISOString(),
      lastRead: new Date().toISOString()
    };
    localStorage.setItem(historyKey, JSON.stringify(history));
    sessionStorage.setItem(sessionKey, "1");
  }

  recordReading();

  function installEditingHistory() {
    const match = decodeURIComponent(location.pathname).match(/\/practice\/(.+\/editor\.html)$/);
    if (!match) return;
    const editorPath = match[1];
    const historyKey = "reading-workspace-editing-history-v1";
    const sessionKey = `reading-workspace-edited:${editorPath}`;
    let timer = 0;
    const classify = (target) => {
      if (target.closest(".rich-editor,#editor.editor,.editor[contenteditable]")) return "正文";
      if (target.closest(".footnote-item,.annotation-register,.marker-composer")) return "注释";
      if (target.closest("#user-notes,.notes-dock,.chapter-note-entry")) return "札记";
      if (target.closest(".global-edit-form,.dictionary-actions,.term-list")) return "词典";
      return "";
    };
    const save = (kind) => {
      let history = {};
      try { history = JSON.parse(localStorage.getItem(historyKey) || "{}"); } catch { history = {}; }
      const previous = history[editorPath] || {};
      const now = new Date().toISOString();
      const kinds = new Set(previous.kinds || []); kinds.add(kind);
      history[editorPath] = {
        sessions: (Number(previous.sessions) || 0) + (sessionStorage.getItem(sessionKey) ? 0 : 1),
        changes: (Number(previous.changes) || 0) + 1,
        firstEdited: previous.firstEdited || now,
        lastEdited: now,
        kinds: [...kinds]
      };
      localStorage.setItem(historyKey, JSON.stringify(history));
      sessionStorage.setItem(sessionKey, "1");
    };
    document.addEventListener("input", (event) => {
      const kind = classify(event.target);
      if (!kind) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => save(kind), 700);
    }, true);
  }

  installEditingHistory();

  function installSwitch() {
    if (document.querySelector(".workspace-skin-switch")) return;
    const host = document.querySelector(".masthead-inner") || document.querySelector(".topbar");
    if (!host) return;
    const style = document.createElement("style");
    style.textContent = `.workspace-skin-switch{display:inline-flex;flex:0 0 auto;gap:2px;margin-left:auto;padding:3px;border:1px solid #c9c3b7;border-radius:18px;background:#fff;color:#3c4043;font:12px/1.2 Arial,"PingFang SC",sans-serif;box-shadow:0 1px 2px #00000010}.workspace-skin-switch button{min-height:28px;margin:0;padding:5px 10px;border:0;border-radius:14px;background:transparent;color:inherit;cursor:pointer;font:inherit;white-space:nowrap}.workspace-skin-switch button:hover{background:#f1f3f4}.workspace-skin-switch button.active{background:#e6f4ea;color:#137333;font-weight:700}html[data-workspace-skin=reading] .workspace-skin-switch button.active{background:#eee5d2;color:#71352e}html[data-workspace-skin=source] .workspace-skin-switch button.active{background:#d1e9e9;color:#000080}@media(max-width:700px){.workspace-skin-switch{width:100%;margin-left:0;justify-content:center;overflow-x:auto}.workspace-skin-switch button{padding-inline:8px}}@media print{.workspace-skin-switch{display:none!important}}`;
    style.textContent += `html[data-workspace-skin="sheet"] body.reading-immersive .paper,html[data-workspace-skin="sheet"] body.reading-immersive .editor-panel{width:100%!important;max-width:none!important;padding:clamp(18px,2vw,32px)!important}html[data-workspace-skin="sheet"] body.reading-immersive .civil-war-table-wrap,html[data-workspace-skin="sheet"] body.reading-immersive .chinese-war-table-wrap{max-width:100%;overflow-x:auto;scrollbar-gutter:stable}`;
    style.textContent += `html[data-workspace-skin="source"] body{background-color:#f4f1e8!important;background-image:radial-gradient(#c9c3b733 .7px,transparent .7px)!important;background-size:6px 6px!important;color:#111!important;font-family:"Times New Roman","Songti SC",serif!important}html[data-workspace-skin="source"] .workspace{max-width:1180px!important;margin:auto!important}html[data-workspace-skin="source"] .paper,html[data-workspace-skin="source"] .editor-panel,html[data-workspace-skin="source"] .page-card{background:#fffef8!important;border:1px solid #aaa!important;border-radius:0!important;box-shadow:none!important}html[data-workspace-skin="source"] .editor,html[data-workspace-skin="source"] .rich-editor,html[data-workspace-skin="source"] #editor[contenteditable]{background:#fffef8!important;color:#111!important;font-family:"Times New Roman","Songti SC",serif!important;line-height:1.8!important;text-align:justify!important}html[data-workspace-skin="source"] .editor p,html[data-workspace-skin="source"] .rich-editor p,html[data-workspace-skin="source"] #editor[contenteditable] p{line-height:1.8!important}html[data-workspace-skin="source"] .editor h1,html[data-workspace-skin="source"] .rich-editor h1,html[data-workspace-skin="source"] #editor[contenteditable] h1{text-align:center!important;font-size:2em!important;letter-spacing:.12em!important;line-height:2!important}html[data-workspace-skin="source"] .editor h2,html[data-workspace-skin="source"] .rich-editor h2,html[data-workspace-skin="source"] #editor[contenteditable] h2{text-align:center!important;line-height:2!important;border:0!important}html[data-workspace-skin="source"] .editor h3,html[data-workspace-skin="source"] .rich-editor h3,html[data-workspace-skin="source"] #editor[contenteditable] h3{text-align:center!important;letter-spacing:.12em!important}html[data-workspace-skin="source"] .editor a:link,html[data-workspace-skin="source"] .rich-editor a:link,html[data-workspace-skin="source"] #editor[contenteditable] a:link{color:#000080!important;text-decoration:none!important}html[data-workspace-skin="source"] .editor a:visited,html[data-workspace-skin="source"] .rich-editor a:visited,html[data-workspace-skin="source"] #editor[contenteditable] a:visited{color:#0f4bff!important}html[data-workspace-skin="source"] .editor a:hover,html[data-workspace-skin="source"] .rich-editor a:hover,html[data-workspace-skin="source"] #editor[contenteditable] a:hover{color:#e00000!important;text-decoration:underline!important}html[data-workspace-skin="source"] .quote,html[data-workspace-skin="source"] blockquote{margin:10px 0 10px 30px!important;padding-left:8px!important;border-left:3px solid #444!important;font-size:.92em!important;line-height:1.5!important}html[data-workspace-skin="source"] .footnote,html[data-workspace-skin="source"] .reader-footnotes{background:#ddd!important;color:#111!important;border:0!important;border-radius:0!important}html[data-workspace-skin="source"] .lead,html[data-workspace-skin="source"] .objectives,html[data-workspace-skin="source"] .case{background:#d1e9e9!important;color:#000080!important;border:0!important;border-radius:0!important}html[data-workspace-skin="source"] table{line-height:1.8!important}html[data-workspace-skin="source"] img{max-width:100%;height:auto}@media(max-width:700px){html[data-workspace-skin="source"] .workspace{padding-inline:8px!important}html[data-workspace-skin="source"] .paper,html[data-workspace-skin="source"] .editor-panel{padding:22px 16px!important}}`;
    document.head.appendChild(style);
    const control = document.createElement("div");
    control.className = "workspace-skin-switch";
    control.setAttribute("role", "group");
    control.setAttribute("aria-label", englishInterface ? "Interface style" : russianInterface ? "Стиль интерфейса" : "界面风格");
    control.innerHTML = englishInterface
      ? '<button type="button" data-skin-choice="reading" title="A warm book style for extended reading">Reading</button><button type="button" data-skin-choice="sheet" title="A compact style for editing and navigation">Workspace</button><button type="button" data-skin-choice="source" title="Preserve the typography and character of the source page">Original</button>'
      : russianInterface
        ? '<button type="button" data-skin-choice="reading" title="Тёплый книжный вид для долгого чтения">Чтение</button><button type="button" data-skin-choice="sheet" title="Компактный вид для редактирования и навигации">Рабочий режим</button><button type="button" data-skin-choice="source" title="Сохранить оформление исходной страницы">Оригинал</button>'
      : '<button type="button" data-skin-choice="reading" title="适合长时间阅读的温暖书卷风格">阅读模式</button><button type="button" data-skin-choice="sheet" title="适合目录管理和密集编辑的表格风格">表格模式</button><button type="button" data-skin-choice="source" title="保留来源网页的字体、色彩与版式特征">原网页</button>';
    control.addEventListener("click", (event) => {
      const button = event.target.closest("[data-skin-choice]");
      if (button) applySkin(button.dataset.skinChoice, true);
    });
    host.appendChild(control);
    applySkin(document.documentElement.dataset.workspaceSkin || initial, false);

    document.addEventListener("click", (event) => {
      const link = event.target.closest("a[href]");
      if (!link || link.target === "_blank" || /^(https?:|mailto:|#)/i.test(link.getAttribute("href"))) return;
      const url = new URL(link.href, location.href);
      if (!/\.html$/i.test(url.pathname)) return;
      url.searchParams.set("skin", document.documentElement.dataset.workspaceSkin);
      link.href = url.href;
    });
  }

  function installReadingEnvironment() {
    if (document.querySelector(".reading-environment")) return;
    const content = document.querySelector(".editor, .rich-editor, #editor[contenteditable]");
    const host = document.querySelector(".toolbar") || document.querySelector("jianshang-editor-header .view-tools") || document.querySelector(".actions");
    if (!content || !host) return;
    const key = "reading-workspace-environment-v1";
    const defaults = { fontSize: Number.parseFloat(getComputedStyle(content).fontSize) || 18, lineHeight: 1.85, background: "#fffdfa" };
    let settings = defaults;
    try { settings = { ...defaults, ...JSON.parse(localStorage.getItem(key) || "{}") }; } catch {}
    const style = document.createElement("style");
    style.textContent = `.editor,.rich-editor,#editor[contenteditable]{font-size:var(--reading-content-font-size)!important;line-height:var(--reading-content-line-height)!important;background:var(--reading-content-background)!important}.paper,.editor-panel,.page-card,.pane[data-pane-primary]{background:var(--reading-content-background,#fffdfa)!important}.reading-environment{position:relative;display:inline-flex}.reading-environment-trigger{min-height:30px!important;padding:4px 9px!important;border:1px solid #c9d2df!important;border-radius:5px!important;background:#fff!important;color:#202124!important;cursor:pointer}.reading-environment-panel{position:absolute;z-index:340;top:calc(100% + 6px);left:0;right:auto;display:none;width:min(280px,calc(100vw - 24px));padding:14px;border:1px solid #dadce0;border-radius:10px;background:#fff;color:#202124;box-shadow:0 10px 30px #0003;font:12px/1.4 Arial,"PingFang SC",sans-serif}.reading-environment.open .reading-environment-panel{display:grid;gap:12px}.reading-setting{display:grid;grid-template-columns:70px 1fr 42px;gap:8px;align-items:center}.reading-setting input{min-width:0;width:100%}.reading-language-setting select{grid-column:2/4;width:100%;min-width:0}.reading-colors{display:flex;gap:8px}.reading-environment .reading-colors .reading-color{flex:0 0 30px;width:30px!important;min-width:30px!important;height:30px!important;min-height:30px!important;padding:0!important;background:var(--reading-swatch)!important;border:2px solid #aeb8c2!important;border-radius:50%!important}.reading-environment .reading-colors .reading-color.active{border-color:#1a73e8!important;box-shadow:0 0 0 2px #d2e3fc}.reading-reset{justify-self:start}.bilingual-layout-popover{width:min(440px,calc(100vw - 24px))!important}.bilingual-presets button{line-height:1.2!important;white-space:normal}.bilingual-slider-label{grid-template-columns:auto minmax(140px,1fr) auto!important}.bilingual-slider-label>span{white-space:nowrap}.bilingual-layout-output{grid-column:1/-1!important}@media(max-width:520px){.bilingual-layout-popover{position:fixed!important;top:64px!important;left:12px!important;right:12px!important;width:auto!important}.bilingual-presets{grid-template-columns:repeat(3,1fr)!important}.bilingual-slider-label{grid-template-columns:1fr!important}.bilingual-slider-label>span:last-of-type{display:none}.bilingual-layout-output{grid-column:1!important}}@media print{.reading-environment{display:none!important}}`;
    document.head.appendChild(style);
    const controls = document.createElement("div");
    controls.className = "reading-environment";
    const languageSetting = russianFirst ? `<label class="reading-setting reading-language-setting"><span>${russianInterface ? "Язык" : "Language"}</span><select data-interface-language><option value="auto">Auto · Русский</option><option value="ru">Русский</option><option value="en">English</option></select></label>` : "";
    controls.innerHTML = englishInterface
      ? `<button type="button" class="reading-environment-trigger" aria-expanded="false">Settings</button><div class="reading-environment-panel">${languageSetting}<label class="reading-setting"><span>Font size</span><input data-reading-setting="fontSize" type="range" min="12" max="34" step="1"><output data-reading-output="fontSize"></output></label><label class="reading-setting"><span>Line spacing</span><input data-reading-setting="lineHeight" type="range" min="1.3" max="2.6" step="0.05"><output data-reading-output="lineHeight"></output></label><div><div style="margin-bottom:7px">Background</div><div class="reading-colors"><button class="reading-color" data-reading-color="#ffffff" style="background:#fff" title="White"></button><button class="reading-color" data-reading-color="#fffdfa" style="background:#fffdfa" title="Warm white"></button><button class="reading-color" data-reading-color="#f3eedf" style="background:#f3eedf" title="Parchment"></button><button class="reading-color" data-reading-color="#eaf2e7" style="background:#eaf2e7" title="Soft green"></button><button class="reading-color" data-reading-color="#e9f0f5" style="background:#e9f0f5" title="Soft blue"></button></div></div><button type="button" class="reading-reset">Reset</button></div>`
      : russianInterface
        ? `<button type="button" class="reading-environment-trigger" aria-expanded="false">Настройки</button><div class="reading-environment-panel">${languageSetting}<label class="reading-setting"><span>Размер</span><input data-reading-setting="fontSize" type="range" min="12" max="34" step="1"><output data-reading-output="fontSize"></output></label><label class="reading-setting"><span>Интервал</span><input data-reading-setting="lineHeight" type="range" min="1.3" max="2.6" step="0.05"><output data-reading-output="lineHeight"></output></label><div><div style="margin-bottom:7px">Фон</div><div class="reading-colors"><button class="reading-color" data-reading-color="#ffffff" style="background:#fff" title="Белый"></button><button class="reading-color" data-reading-color="#fffdfa" style="background:#fffdfa" title="Тёплый белый"></button><button class="reading-color" data-reading-color="#f3eedf" style="background:#f3eedf" title="Пергамент"></button><button class="reading-color" data-reading-color="#eaf2e7" style="background:#eaf2e7" title="Мягкий зелёный"></button><button class="reading-color" data-reading-color="#e9f0f5" style="background:#e9f0f5" title="Мягкий синий"></button></div></div><button type="button" class="reading-reset">Сбросить</button></div>`
      : `<button type="button" class="reading-environment-trigger" aria-expanded="false">阅读设置</button><div class="reading-environment-panel"><label class="reading-setting"><span>字号</span><input data-reading-setting="fontSize" type="range" min="12" max="34" step="1"><output data-reading-output="fontSize"></output></label><label class="reading-setting"><span>行距</span><input data-reading-setting="lineHeight" type="range" min="1.3" max="2.6" step="0.05"><output data-reading-output="lineHeight"></output></label><div><div style="margin-bottom:7px">背景颜色</div><div class="reading-colors"><button class="reading-color" data-reading-color="#ffffff" style="background:#fff" title="白色"></button><button class="reading-color" data-reading-color="#fffdfa" style="background:#fffdfa" title="米白"></button><button class="reading-color" data-reading-color="#f3eedf" style="background:#f3eedf" title="羊皮纸"></button><button class="reading-color" data-reading-color="#eaf2e7" style="background:#eaf2e7" title="护眼绿"></button><button class="reading-color" data-reading-color="#e9f0f5" style="background:#e9f0f5" title="浅蓝"></button></div></div><button type="button" class="reading-reset">恢复默认</button></div>`;
    // Toolbar/theme button rules must not erase the color samples.
    controls.querySelectorAll("[data-reading-color]").forEach(button => {
      button.type = "button";
      button.style.setProperty("--reading-swatch", button.dataset.readingColor);
      button.setAttribute("aria-label", button.title);
    });
    const languageSelect = controls.querySelector("[data-interface-language]");
    if (languageSelect) { languageSelect.value = interfacePreference; languageSelect.addEventListener("change", () => { localStorage.setItem(interfaceLanguageKey, languageSelect.value); location.reload(); }); }
    const trigger = controls.querySelector(".reading-environment-trigger");
    const panel = controls.querySelector(".reading-environment-panel");
    const positionPanel = () => {
      panel.style.left = "0px";
      const rect = panel.getBoundingClientRect();
      const left = Math.max(12 - rect.left, Math.min(0, innerWidth - 12 - rect.right));
      panel.style.left = `${left}px`;
    };
    const apply = (persist = true) => {
      settings.fontSize = Math.max(12, Math.min(34, Number(settings.fontSize) || defaults.fontSize));
      settings.lineHeight = Math.max(1.3, Math.min(2.6, Number(settings.lineHeight) || defaults.lineHeight));
      document.documentElement.style.setProperty("--reading-content-font-size", `${settings.fontSize}px`);
      document.documentElement.style.setProperty("--reading-content-line-height", String(settings.lineHeight));
      document.documentElement.style.setProperty("--reading-content-background", settings.background);
      controls.querySelector('[data-reading-setting="fontSize"]').value = settings.fontSize;
      controls.querySelector('[data-reading-setting="lineHeight"]').value = settings.lineHeight;
      controls.querySelector('[data-reading-output="fontSize"]').textContent = `${settings.fontSize}px`;
      controls.querySelector('[data-reading-output="lineHeight"]').textContent = settings.lineHeight.toFixed(2);
      controls.querySelectorAll("[data-reading-color]").forEach(button => {
        const selected = button.dataset.readingColor === settings.background;
        button.classList.toggle("active", selected);
        button.setAttribute("aria-pressed", String(selected));
      });
      if (persist) localStorage.setItem(key, JSON.stringify(settings));
    };
    controls.addEventListener("input", event => { const name = event.target.dataset.readingSetting; if (name) { settings[name] = Number(event.target.value); apply(); } });
    controls.addEventListener("click", event => {
      const triggerButton = event.target.closest(".reading-environment-trigger");
      if (triggerButton) { const open = controls.classList.toggle("open"); triggerButton.setAttribute("aria-expanded", String(open)); if (open) requestAnimationFrame(positionPanel); }
      const color = event.target.closest("[data-reading-color]"); if (color) { settings.background = color.dataset.readingColor; apply(); }
      if (event.target.closest(".reading-reset")) { settings = { ...defaults }; apply(); }
    });
    document.addEventListener("click", event => { if (!controls.contains(event.target)) { controls.classList.remove("open"); trigger.setAttribute("aria-expanded", "false"); } });
    window.addEventListener("resize", () => { if (controls.classList.contains("open")) positionPanel(); });
    host.appendChild(controls); apply(false);
    window.ReadingWorkspace ||= {}; window.ReadingWorkspace.openSettings = () => controls.querySelector(".reading-environment-trigger").click();
  }

  function installFileMenu() {
    if (document.querySelector(".workspace-file-menu")) return;
    const pdf = document.getElementById("printPdfBtn") || document.getElementById("pdfBtn");
    if (!pdf) return;
    pdf.textContent = englishInterface ? "PDF draft" : russianInterface ? "Черновик PDF" : "PDF 草稿";
    const ids = ["saveBtn", "exportTxtBtn", "exportHtmlBtn", "exportJsonBtn", "exportLogBtn", "exportTermsBtn", "exportNotesBtn", "exportBtn", "downloadBtn", "backupBtn", "resetBtn"];
    const controls = ids.map((id) => document.getElementById(id)).filter(Boolean);
    const supplementalLabels = englishInterface
      ? { exportTermsBtn: "Export CSV", exportNotesBtn: "Export notes" }
      : russianInterface ? { exportTermsBtn: "Экспорт CSV", exportNotesBtn: "Экспорт заметок" } : {};
    controls.forEach(control => { if (supplementalLabels[control.id]) control.textContent = supplementalLabels[control.id]; });
    const importInput = document.getElementById("importJson") || document.getElementById("importBackup") || document.getElementById("importInput");
    const importLabel = importInput ? document.querySelector(`label[for="${importInput.id}"]`) : null;
    if (!controls.length) return;
    const style = document.createElement("style");
    style.textContent = `.workspace-file-menu{position:relative;display:inline-flex;align-items:center}.workspace-file-trigger{min-height:30px!important;padding:4px 9px!important;border:1px solid #c9d2df!important;border-radius:5px!important;background:#fff!important;color:#202124!important;white-space:nowrap;cursor:pointer}.workspace-file-trigger::after{content:" ▾";font-size:10px}.workspace-file-popover{position:absolute;z-index:100;top:calc(100% + 5px);left:0;right:auto;display:none;width:min(210px,calc(100vw - 24px));padding:6px;border:1px solid #dadce0;border-radius:8px;background:#fff;box-shadow:0 8px 24px #3c404333}.workspace-file-menu.open .workspace-file-popover{display:grid;gap:2px}.workspace-file-popover button,.workspace-file-popover label{display:flex!important;width:100%;min-height:32px!important;padding:6px 9px!important;align-items:center;border:0!important;border-radius:4px!important;background:#fff!important;color:#202124!important;text-align:left;font:12px/1.3 Arial,"PingFang SC",sans-serif!important;cursor:pointer}.workspace-file-popover button:hover,.workspace-file-popover label:hover{background:#edf2fa!important}.workspace-file-popover .export-all-action{margin-bottom:5px;border-bottom:1px solid #e3e7ed!important;border-radius:4px 4px 0 0!important;background:#e8f0fe!important;color:#174ea6!important;font-weight:700!important}.workspace-file-popover .danger-action{margin-top:5px;border-top:1px solid #eee!important;border-radius:0 0 4px 4px!important;color:#b3261e!important}.workspace-file-popover input{display:none!important}@media print{.workspace-file-menu{display:none!important}}`;
    document.head.appendChild(style);
    const menu = document.createElement("div"), trigger = document.createElement("button"), popover = document.createElement("div");
    menu.className = "workspace-file-menu"; trigger.className = "workspace-file-trigger"; trigger.type = "button"; trigger.textContent = englishInterface ? "Files" : russianInterface ? "Файлы" : "文件与备份"; trigger.setAttribute("aria-haspopup", "menu"); trigger.setAttribute("aria-expanded", "false");
    popover.className = "workspace-file-popover"; popover.setAttribute("role", "menu");
    const exportAll = document.createElement("button");
    exportAll.type = "button"; exportAll.className = "export-all-action"; exportAll.textContent = englishInterface ? "Export all" : russianInterface ? "Экспортировать всё" : "一键导出全部";
    exportAll.addEventListener("click", () => {
      const downloadIds = ["exportTxtBtn", "exportHtmlBtn", "exportJsonBtn", "exportTermsBtn", "exportNotesBtn", "downloadBtn", "backupBtn", "downloadLogBtn"];
      const downloadLog = document.getElementById("downloadLogBtn");
      if (!downloadLog) downloadIds.push("exportLogBtn");
      downloadIds.map((id) => document.getElementById(id)).filter(Boolean).forEach((control) => control.click());
    });
    popover.appendChild(exportAll);
    controls.forEach((control) => { if (control.id === "resetBtn") control.classList.add("danger-action"); popover.appendChild(control); });
    if (importLabel) popover.insertBefore(importLabel, popover.querySelector(".danger-action"));
    if (importInput) popover.appendChild(importInput);
    menu.append(trigger, popover); pdf.insertAdjacentElement("afterend", menu);
    const positionPopover = () => {
      popover.style.left = "0px";
      const rect = popover.getBoundingClientRect();
      const offset = Math.max(12 - rect.left, Math.min(0, innerWidth - 12 - rect.right));
      popover.style.left = `${offset}px`;
    };
    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      const open = menu.classList.toggle("open");
      trigger.setAttribute("aria-expanded", String(open));
      if (open) requestAnimationFrame(positionPopover);
    });
    popover.addEventListener("click", (event) => { if (!event.target.closest("label")) { menu.classList.remove("open"); trigger.setAttribute("aria-expanded", "false"); } });
    importInput?.addEventListener("change", () => { menu.classList.remove("open"); trigger.setAttribute("aria-expanded", "false"); });
    document.addEventListener("click", (event) => { if (!menu.contains(event.target)) { menu.classList.remove("open"); trigger.setAttribute("aria-expanded", "false"); } });
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") { menu.classList.remove("open"); trigger.setAttribute("aria-expanded", "false"); } });
    window.addEventListener("resize", () => { if (menu.classList.contains("open")) positionPopover(); });
  }

  function installInsertMenu() {
    if (document.querySelector(".workspace-insert-menu")) return;
    const ids = ["notationBtn", "interlinearBtn", "footnoteBtn", "commentBtn", "insertImageBtn", "imageBtn", "doubtBtn"];
    const controls = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (controls.length < 2) return;
    const firstControl = controls[0];
    const host = firstControl.parentNode;
    const style = document.createElement("style");
    style.textContent = `.workspace-insert-menu{position:relative;display:inline-flex;align-items:center}.workspace-insert-trigger{min-height:30px!important;padding:4px 9px!important;border:1px solid #c9d2df!important;border-radius:5px!important;background:#fff!important;color:#202124!important;white-space:nowrap;cursor:pointer}.workspace-insert-trigger::after{content:" ▾";font-size:10px}.workspace-insert-popover{position:absolute;z-index:101;top:calc(100% + 5px);left:0;display:none;width:190px;padding:6px;border:1px solid #dadce0;border-radius:8px;background:#fff;box-shadow:0 8px 24px #3c404333}.workspace-insert-menu.open .workspace-insert-popover{display:grid;gap:2px}.workspace-insert-popover button{display:flex!important;width:100%;min-height:32px!important;padding:6px 9px!important;align-items:center;border:0!important;border-radius:4px!important;background:#fff!important;color:#202124!important;text-align:left;font:12px/1.3 Arial,"PingFang SC",sans-serif!important;cursor:pointer}.workspace-insert-popover button:hover,.workspace-insert-popover button:focus-visible{background:#edf2fa!important}@media print{.workspace-insert-menu{display:none!important}}`;
    document.head.appendChild(style);
    const menu = document.createElement("div"), trigger = document.createElement("button"), popover = document.createElement("div");
    menu.className = "workspace-insert-menu";
    trigger.className = "workspace-insert-trigger"; trigger.type = "button"; trigger.textContent = englishInterface ? "Annotate" : russianInterface ? "Примечания" : "插入与注释";
    trigger.setAttribute("aria-haspopup", "menu"); trigger.setAttribute("aria-expanded", "false");
    popover.className = "workspace-insert-popover"; popover.setAttribute("role", "menu");
    host.insertBefore(menu, firstControl);
    menu.append(trigger, popover);
    controls.forEach((control) => { control.setAttribute("role", "menuitem"); popover.appendChild(control); });
    const editor = document.querySelector("#editor, .rich-editor, .editor");
    let preservedRange = null;
    let preservedTextSelection = null;
    const preserveSelection = () => {
      preservedRange = null; preservedTextSelection = null;
      const active = document.activeElement;
      if (active?.matches(".footnote-item textarea") && active.selectionStart !== active.selectionEnd) {
        preservedTextSelection = {
          input: active,
          start: active.selectionStart,
          end: active.selectionEnd,
          text: active.value.slice(active.selectionStart, active.selectionEnd)
        };
        return;
      }
      const selection = getSelection();
      if (selection?.rangeCount && editor?.contains(selection.getRangeAt(0).commonAncestorContainer)) {
        preservedRange = selection.getRangeAt(0).cloneRange();
      }
    };
    const restoreSelection = () => {
      if (!preservedRange) return;
      const selection = getSelection();
      selection.removeAllRanges(); selection.addRange(preservedRange.cloneRange());
    };
    const close = () => { menu.classList.remove("open"); trigger.setAttribute("aria-expanded", "false"); };
    const addFootnoteNotation = () => {
      const selected = preservedTextSelection;
      if (!selected?.input.isConnected || !selected.text.trim()) return false;
      const term = selected.text;
      const pronunciation = prompt(`“${term}”的拼音或读音（可留空）：`, "");
      if (pronunciation === null) return true;
      const pinyin = pronunciation.trim();
      const note = prompt("简注（可留空；保存在本篇词典）：", "");
      if (note === null) return true;
      const replacement = pinyin ? `${term}（${pinyin}）` : term;
      selected.input.setRangeText(replacement, selected.start, selected.end, "select");
      selected.input.dispatchEvent(new Event("input", { bubbles: true }));
      selected.input.focus({ preventScroll: true });
      if (typeof window.upsertRuntimeTerm === "function") window.upsertRuntimeTerm(term, pinyin, note);
      if (typeof window.addLog === "function") window.addLog("添加脚注注音/简注", term);
      preservedTextSelection = null;
      return true;
    };
    menu.addEventListener("mousedown", (event) => {
      if (!event.target.closest("button")) return;
      if (event.target === trigger) preserveSelection();
      event.preventDefault();
    });
    popover.addEventListener("click", (event) => {
      if (event.target.closest("#notationBtn") && addFootnoteNotation()) {
        event.preventDefault(); event.stopPropagation(); close(); return;
      }
      restoreSelection();
    }, true);
    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      const open = menu.classList.toggle("open");
      trigger.setAttribute("aria-expanded", String(open));
    });
    popover.addEventListener("click", close);
    document.addEventListener("click", (event) => { if (!menu.contains(event.target)) close(); });
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") { close(); trigger.focus(); } });
  }

  function installUserNotesAccess() {
    const input = document.getElementById("userNoteInput");
    const list = document.getElementById("userNoteList");
    const addButton = document.getElementById("addUserNoteBtn");
    const host = document.querySelector(".toolbar") || document.querySelector(".actions");
    if (!input || !list || !addButton || !host || document.querySelector(".user-notes-shortcut")) return;
    const section = list.closest("section") || list;
    section.id ||= "user-notes";
    const style = document.createElement("style");
    style.textContent = `.user-notes-shortcut{min-height:30px!important;padding:4px 9px!important;border:1px solid #c9d2df!important;border-radius:5px!important;background:#fff!important;color:#174ea6!important;font-weight:700!important;white-space:nowrap;cursor:pointer}.note-item.duplicate-note-highlight{outline:3px solid #f9ab00;outline-offset:2px;background:#fef7e0!important;animation:noteDuplicatePulse .8s ease-in-out 2}@keyframes noteDuplicatePulse{50%{outline-color:#fdd663;background:#fff8d8!important}}@media print{.user-notes-shortcut{display:none!important}}`;
    document.head.appendChild(style);
    const shortcut = document.createElement("button");
    shortcut.type = "button"; shortcut.className = "user-notes-shortcut"; shortcut.textContent = englishInterface ? "Notes (0)" : russianInterface ? "Заметки (0)" : "札记（0）";
    shortcut.title = englishInterface ? "View notes for this reading" : russianInterface ? "Открыть заметки к тексту" : "查看本篇用户札记";
    const rows = () => [...list.querySelectorAll(".note-item")];
    const updateCount = () => { shortcut.textContent = englishInterface ? `Notes (${rows().length})` : russianInterface ? `Заметки (${rows().length})` : `札记（${rows().length}）`; };
    shortcut.addEventListener("click", () => {
      window.BilingualStudyPane?.activateTab?.("notes");
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    host.appendChild(shortcut);
    new MutationObserver(updateCount).observe(list, { childList: true, subtree: true });
    updateCount();
    const normalize = (value) => value.replace(/\s+/g, " ").trim();
    addButton.addEventListener("click", (event) => {
      const draft = normalize(input.value);
      const hasDraftMedia = Boolean(document.querySelector("#userNoteMedia > *"));
      if (!draft || hasDraftMedia) return;
      const duplicate = rows().find((row) => normalize(row.firstElementChild?.textContent || "") === draft);
      if (!duplicate) return;
      event.preventDefault(); event.stopImmediatePropagation();
      rows().forEach((row) => row.classList.remove("duplicate-note-highlight"));
      duplicate.classList.add("duplicate-note-highlight");
      duplicate.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => duplicate.classList.remove("duplicate-note-highlight"), 3500);
      window.alert("此札记已经保存，现已为您定位到原札记。");
    }, true);
  }

  function installUserNoteActions() {
    const list = document.getElementById("userNoteList");
    if (!list || typeof NOTES_KEY === "undefined" || typeof window.renderNotes !== "function" || list.dataset.noteActionsInstalled) return;
    list.dataset.noteActionsInstalled = "true";
    const notesKey = NOTES_KEY, trashKey = notesKey + "-trash-v1", suppressedKey = notesKey + "-suppressed-v1";
    const words = englishInterface
      ? {edit:"Edit", remove:"Delete", save:"Save", cancel:"Cancel", undo:"Undo delete", empty:"Enter a note or keep an attachment.", deleted:"Note deleted. You can undo this deletion.", restored:"Note restored.", saved:"Note updated.", label:"Edit reading note"}
      : russianInterface
      ? {edit:"Изменить", remove:"Удалить", save:"Сохранить", cancel:"Отмена", undo:"Отменить удаление", empty:"Введите текст или оставьте вложение.", deleted:"Заметка удалена. Удаление можно отменить.", restored:"Заметка восстановлена.", saved:"Заметка обновлена.", label:"Изменить заметку"}
      : {edit:"编辑", remove:"删除", save:"保存", cancel:"取消", undo:"撤销删除", empty:"请填写札记，或保留至少一个附件。", deleted:"札记已删除，可撤销。", restored:"札记已恢复。", saved:"札记已更新。", label:"编辑札记"};
    const read = (key) => { try { const value = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; } };
    const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
    const identity = (note) => `${note.time || ""}\u0000${note.text || ""}`;
    const originalRender = window.renderNotes, originalMerge = window.mergeInitialNotes;
    const originalState = window.state, originalLoad = window.loadState;
    const controls = document.createElement("div"), undo = document.createElement("button"), status = document.createElement("span");
    controls.className = "reading-note-management";
    undo.type = "button"; undo.textContent = words.undo; undo.dataset.noteUndo = "";
    status.setAttribute("role", "status");
    controls.append(undo, status); list.before(controls);
    const style = document.createElement("style");
    style.textContent = `.reading-note-actions,.reading-note-management{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:6px 0}.note-item[data-reading-note-id]{display:flex;flex-direction:column}.reading-note-actions{order:-1;position:sticky;top:0;background:var(--paper,#fff);z-index:1}.reading-note-actions button,.reading-note-management button{font-size:12px;padding:4px 8px}.reading-note-actions [data-note-delete]{color:#8f2922}.reading-note-edit{display:block;width:100%;min-height:100px;resize:vertical;box-sizing:border-box;padding:8px;font:inherit;line-height:1.5}.reading-note-management [role=status]{font-size:12px}.note-item>div:first-child{white-space:pre-wrap;overflow-wrap:anywhere}@media print{.reading-note-actions,.reading-note-management{display:none!important}}`;
    document.head.appendChild(style);
    function normalizeNotes() {
      const blocked = new Set(read(suppressedKey));
      const notes = read(notesKey).filter(note => !blocked.has(identity(note)));
      let changed = notes.length !== read(notesKey).length;
      const used = new Set();
      for (const note of notes) {
        if (!note.id || used.has(note.id)) { note.id = crypto.randomUUID(); changed = true; }
        used.add(note.id);
      }
      if (changed) write(notesKey, notes);
      return notes;
    }
    function persist(action) {
      if (typeof window.addLog === "function") window.addLog(action);
      if (typeof window.saveLocal === "function") window.saveLocal(true);
    }
    function button(text, action) {
      const node = document.createElement("button"); node.type = "button"; node.textContent = text;
      node.addEventListener("click", action); return node;
    }
    window.renderNotes = function () {
      const notes = normalizeNotes();
      originalRender.apply(this, arguments);
      undo.disabled = read(trashKey).length === 0;
      [...list.querySelectorAll(".note-item")].forEach((row, index) => {
        const note = notes[index]; if (!note) return;
        row.dataset.readingNoteId = note.id;
        const actions = document.createElement("div"); actions.className = "reading-note-actions";
        const edit = button(words.edit, () => {
          if (row.querySelector(".reading-note-edit")) return;
          const text = row.firstElementChild, area = document.createElement("textarea");
          area.className = "reading-note-edit"; area.setAttribute("aria-label", words.label); area.value = note.text || "";
          text.hidden = true; text.after(area); actions.replaceChildren();
          actions.append(button(words.save, () => {
            const current = normalizeNotes(), target = current.find(item => item.id === note.id);
            if (!target) { window.renderNotes(); return; }
            const value = area.value.trim();
            if (!value && !(target.mediaIds || []).length) { status.textContent = words.empty; area.focus(); return; }
            const blocked = new Set(read(suppressedKey)), previous = identity(target);
            target.text = value; target.editedAt = new Date().toISOString();
            if (identity(target) !== previous) blocked.add(previous);
            blocked.delete(identity(target));
            write(suppressedKey, [...blocked]); write(notesKey, current);
            window.renderNotes(); persist("编辑用户札记"); status.textContent = words.saved;
            list.querySelector(`[data-reading-note-id="${CSS.escape(note.id)}"] [data-note-edit]`)?.focus();
          }), button(words.cancel, () => { window.renderNotes(); list.querySelector(`[data-reading-note-id="${CSS.escape(note.id)}"] [data-note-edit]`)?.focus(); }));
          area.focus(); area.setSelectionRange(area.value.length, area.value.length);
        });
        edit.dataset.noteEdit = "";
        const remove = button(words.remove, () => {
          const current = normalizeNotes(), index = current.findIndex(item => item.id === note.id);
          if (index < 0) return;
          const [deleted] = current.splice(index, 1), trash = read(trashKey), blocked = new Set(read(suppressedKey));
          trash.push({note: deleted, index, deletedAt: new Date().toISOString()}); blocked.add(identity(deleted));
          // Keep source attachments in IndexedDB so undo can restore the complete note.
          write(trashKey, trash); write(suppressedKey, [...blocked]); write(notesKey, current);
          window.renderNotes(); persist("删除用户札记"); status.textContent = words.deleted; undo.focus();
        });
        remove.dataset.noteDelete = ""; actions.append(edit, remove); row.append(actions);
      });
    };
    if (typeof originalMerge === "function") window.mergeInitialNotes = function () { originalMerge.apply(this, arguments); normalizeNotes(); };
    if (typeof originalState === "function") window.state = function () {
      return {...originalState.apply(this, arguments), readingNoteTrash: read(trashKey), readingNoteSuppressed: read(suppressedKey)};
    };
    if (typeof originalLoad === "function") window.loadState = function (data) {
      if (Array.isArray(data?.notes)) {
        if (Array.isArray(data.readingNoteSuppressed)) write(suppressedKey, data.readingNoteSuppressed.filter(item => typeof item === "string"));
        else { const restored = new Set(data.notes.map(identity)); write(suppressedKey, read(suppressedKey).filter(key => !restored.has(key))); }
        if (Array.isArray(data.readingNoteTrash)) write(trashKey, data.readingNoteTrash.filter(item => item?.note && typeof item.note.time === "string"));
      }
      return originalLoad.apply(this, arguments);
    };
    undo.addEventListener("click", () => {
      const trash = read(trashKey), deleted = trash.pop(); if (!deleted?.note) return;
      const blocked = new Set(read(suppressedKey)); blocked.delete(identity(deleted.note));
      write(suppressedKey, [...blocked]);
      const notes = normalizeNotes();
      if (!notes.some(note => note.id === deleted.note.id)) notes.splice(Math.min(deleted.index, notes.length), 0, deleted.note);
      write(notesKey, notes); write(trashKey, trash);
      window.renderNotes(); persist("撤销删除用户札记"); status.textContent = words.restored;
      list.querySelector(`[data-reading-note-id="${CSS.escape(deleted.note.id)}"] [data-note-edit]`)?.focus();
    });
    window.renderNotes();
    // Keep the editor's complete saved snapshot consistent with the separate note list.
    if (typeof window.saveLocal === "function") window.saveLocal(true);
  }

  function installImmersiveMode() {
    let primaryPane = document.querySelector("[data-pane-primary]");
    let secondaryPane = document.querySelector("[data-pane-secondary]");
    if (!primaryPane || !secondaryPane) {
      const containers = [...document.querySelectorAll("#workspace,.workspace,.content-grid,.editor-shell,.reader-layout,.main-layout,.reading-layout,.split-layout,.layout,main")];
      const pair = containers.map(container => {
        const panes = [...container.children].filter(node => node.matches(".pane,.panel,.reader-pane,.reading-pane,.content-pane,.reference-pane,.preview-pane,.translation-pane"));
        return panes.length === 2 ? { container, panes } : null;
      }).find(Boolean);
      if (pair) {
        [primaryPane, secondaryPane] = pair.panes;
        primaryPane.dataset.panePrimary = "";
        secondaryPane.dataset.paneSecondary = "";
      }
    }
    if (!document.querySelector(".editor, .rich-editor, #editor[contenteditable]") && (!primaryPane || !secondaryPane)) return;
    const style = document.createElement("style");
    style.textContent = `.reading-immersive-trigger,.reading-pane-immersive-trigger{white-space:nowrap}.reading-immersive-exit{display:none;position:fixed;z-index:1000;top:12px;right:14px;min-height:36px;padding:7px 12px;border:1px solid #9aa0a6;border-radius:18px;background:#202124;color:#fff;box-shadow:0 3px 14px #0004;cursor:pointer}body.reading-immersive{padding-bottom:0!important;background:var(--reading-content-background,#fffdfa)!important}body.reading-immersive .reading-immersive-exit{display:block}body.reading-immersive header,body.reading-immersive .toolbar,body.reading-immersive .topbar,body.reading-immersive .masthead,body.reading-immersive jianshang-editor-header,body.reading-immersive .sidebar,body.reading-immersive .notes-dock,body.reading-immersive .export-dock,body.reading-immersive .mobile-pwa-bar,body.reading-immersive .mobile-pwa-toast{display:none!important}body.reading-immersive:not(.reading-immersive-secondary) [data-pane-secondary],body.reading-immersive.reading-immersive-secondary [data-pane-primary]{display:none!important}body.reading-immersive .workspace,body.reading-immersive #workspace,body.reading-immersive .main-content,body.reading-immersive .editor-shell,body.reading-immersive .content-grid,body.reading-immersive .layout{display:block!important;width:100%!important;max-width:none!important;height:auto!important;margin:0!important;padding:0!important}body.reading-immersive .paper,body.reading-immersive .editor-panel,body.reading-immersive [data-pane-primary],body.reading-immersive.reading-immersive-secondary [data-pane-secondary]{display:block!important;width:100%!important;max-width:none!important;min-height:100vh!important;height:100vh!important;margin:0!important;padding:clamp(18px,2.5vw,42px)!important;border:0!important;box-shadow:none!important}body.reading-immersive [data-pane-primary]:has(>iframe,>.epub-viewer),body.reading-immersive [data-pane-secondary]:has(>iframe,>.epub-viewer){padding:0!important}body.reading-immersive [data-pane-primary]>.pane-head,body.reading-immersive [data-pane-secondary]>.pane-head,body.reading-immersive [data-pane-primary]>header,body.reading-immersive [data-pane-secondary]>header{display:none!important}body.reading-immersive .editor,body.reading-immersive .rich-editor,body.reading-immersive #editor[contenteditable]{width:100%!important;max-width:none!important;min-height:100vh!important;margin:0!important;padding:0!important;border:0!important;box-shadow:none!important}body.reading-immersive [data-pane-primary] .pdf-frame,body.reading-immersive [data-pane-secondary] .pdf-frame,body.reading-immersive [data-pane-primary] object,body.reading-immersive [data-pane-secondary] object,body.reading-immersive [data-pane-primary]>iframe,body.reading-immersive [data-pane-secondary]>iframe,body.reading-immersive [data-pane-primary]>.epub-viewer,body.reading-immersive [data-pane-secondary]>.epub-viewer{width:100%!important;height:100%!important;min-height:100vh!important}`;
    document.head.appendChild(style);
    const toolbar = document.querySelector(".toolbar") || document.querySelector("jianshang-editor-header .view-tools") || document.querySelector(".actions");
    const enterButton = document.createElement("button");
    enterButton.type = "button"; enterButton.className = "reading-immersive-trigger";
    enterButton.textContent = englishInterface ? "Full screen" : russianInterface ? "Во весь экран" : "正文全屏";
    const exitButton = document.createElement("button");
    exitButton.type = "button"; exitButton.className = "reading-immersive-exit";
    exitButton.textContent = englishInterface ? "Exit full screen" : russianInterface ? "Выйти" : "退出全屏";
    toolbar?.appendChild(enterButton); document.body.appendChild(exitButton);
    const contextualHome = [...document.querySelectorAll("a[href]")].find(link => /返回首页|返回目录|书目|篇目/.test(link.textContent || ""));
    const directoryHref = window.ReadingWorkspace?.directoryHref || contextualHome?.href || new URL("index.html", workspaceRoot).href;
    const setImmersive = async (enabled, pane = "primary") => {
      document.body.classList.toggle("reading-immersive", enabled);
      document.body.classList.toggle("reading-immersive-secondary", enabled && pane === "secondary");
      const button = document.querySelector('[data-mobile-action="immersive"]');
      if (button) { button.classList.toggle("active", enabled); button.setAttribute("aria-pressed", String(enabled)); button.textContent = enabled ? "退出沉浸" : "沉浸"; }
      if (enabled && document.documentElement.requestFullscreen && !document.fullscreenElement) await document.documentElement.requestFullscreen().catch(() => {});
      if (!enabled && document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    };
    document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && document.body.classList.contains("reading-immersive")) setImmersive(false); });
    document.addEventListener("keydown", event => { if (event.key === "Escape" && document.body.classList.contains("reading-immersive")) setImmersive(false); });
    window.ReadingWorkspace ||= {};
    window.ReadingWorkspace.directoryHref = directoryHref;
    window.ReadingWorkspace.toggleImmersive = () => setImmersive(!document.body.classList.contains("reading-immersive"), "primary");
    enterButton.addEventListener("click", () => setImmersive(true, "primary"));
    exitButton.addEventListener("click", () => setImmersive(false));
    const paneLabels = englishInterface ? ["Text full screen", "PDF full screen"] : russianInterface ? ["Текст во весь экран", "PDF во весь экран"] : ["正文全屏", "参考页全屏"];
    [[primaryPane, "primary", paneLabels[0]], [secondaryPane, "secondary", paneLabels[1]]].forEach(([paneElement, pane, fallbackLabel]) => {
      const head = paneElement?.querySelector(":scope > .pane-head,:scope > header");
      if (!head || head.querySelector(".reading-pane-immersive-trigger")) return;
      const heading = head.querySelector("strong,h1,h2,h3")?.textContent?.replace(/\s+/g, " ").trim();
      const label = heading ? `${heading} ${englishInterface ? "full screen" : russianInterface ? "во весь экран" : "全屏"}` : fallbackLabel;
      const button = document.createElement("button");
      button.type = "button"; button.className = "reading-pane-immersive-trigger"; button.textContent = label;
      button.addEventListener("click", () => setImmersive(true, pane));
      head.appendChild(button);
    });
  }

  function installAnnotationSync() {
    const open = () => {
      if (typeof saveLocal === "function" && document.querySelector('#editor')) saveLocal(true);
      location.href = new URL("sync/index.html", workspaceRoot).href;
    };
    window.ReadingWorkspace ||= {};
    window.ReadingWorkspace.openSync = open;
    if (!document.querySelector('[data-cloud-sync]')) {
      const host = document.querySelector('.masthead-inner,.topbar,.toolbar') || document.querySelector('header');
      if (host) { const button=document.createElement('button');button.type='button';button.textContent='阅读数据随身包';button.dataset.cloudSync='';button.onclick=open;host.append(button); }
    }
  }

  function installContextNavigation() {
    const editor = document.querySelector(".editor, .rich-editor");
    if (!editor) return;
    const relativePath = decodeURIComponent(location.pathname).replace(decodeURIComponent(workspaceRoot.pathname), "").replace(/^\/+/, "");
    const collection = relativePath.split("/")[0];
    const menuHref = collection && !collection.endsWith(".html")
      ? new URL(`index.html#${encodeURIComponent(collection)}`, workspaceRoot).href
      : new URL("index.html", workspaceRoot).href;
    window.ReadingWorkspace ||= {};
    window.ReadingWorkspace.directoryHref = menuHref;
    const homeLink = [...document.querySelectorAll("a[href]")].find(link => /返回首页|返回目录|书目|篇目/.test(link.textContent || ""));
    if (!homeLink) return;
    const toolbar = homeLink.closest(".toolbar") || document.querySelector(".toolbar");
    const bookContentsLink = [...(toolbar?.querySelectorAll("a[href]") || [])].find(link =>
      link !== homeLink && /Reading Plan|Course|本书目录|阅读计划|完整目录/i.test(link.textContent || "")
    );
    window.ReadingWorkspace.bookDirectoryHref = bookContentsLink?.href || homeLink.href;
    homeLink.remove();
  }

  function installHomeMark() {
    const topbar = document.querySelector(".topbar");
    if (!topbar || topbar.querySelector(".workspace-home-mark")) return;
    if (!document.getElementById("workspaceHomeMarkStyle")) {
      const style = document.createElement("style");
      style.id = "workspaceHomeMarkStyle";
      style.textContent = `.topbar.has-home-mark::before{display:none!important}.workspace-home-mark{display:block!important;width:30px!important;height:30px!important;min-width:30px!important;flex:0 0 30px!important;border-radius:7px;background:linear-gradient(135deg,#34a853 0 52%,#0f9d58 52%);box-shadow:inset 0 0 0 1px #00000012;transition:box-shadow .15s ease,transform .15s ease}.workspace-home-mark:hover{box-shadow:inset 0 0 0 2px #ffffffaa,0 1px 4px #0003;transform:translateY(-1px)}.workspace-home-mark:focus-visible{outline:3px solid #a8c7fa;outline-offset:2px}@media print{.workspace-home-mark{display:none!important}}`;
      document.head.appendChild(style);
    }
    const english = document.documentElement.lang.toLowerCase().startsWith("en") || englishFirst;
    const home = document.createElement("a");
    home.className = "workspace-home-mark";
    home.href = new URL("index.html", workspaceRoot).href;
    home.setAttribute("aria-label", englishInterface ? "Reader home" : russianInterface ? "На главную страницу" : "返回阅读器首页");
    home.title = englishInterface ? "Reader home" : russianInterface ? "На главную страницу" : "返回阅读器首页";
    topbar.classList.add("has-home-mark");
    topbar.prepend(home);
  }

  function installExpandingReviewFields() {
    const selector = ".annotation-register .register-row textarea";
    const style = document.createElement("style");
    style.textContent = `${selector}{min-height:96px!important;overflow-y:hidden;resize:vertical}`;
    document.head.appendChild(style);
    const resize = (area) => {
      area.style.height = "auto";
      area.style.height = `${Math.max(area.scrollHeight + 2, 96)}px`;
    };
    const resizeWithin = (root) => {
      if (root.matches?.(selector)) resize(root);
      root.querySelectorAll?.(selector).forEach(resize);
    };
    document.addEventListener("input", (event) => {
      if (event.target.matches?.(selector)) resize(event.target);
    });
    new MutationObserver((changes) => {
      changes.forEach((change) => change.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) resizeWithin(node);
      }));
    }).observe(document.body, { childList: true, subtree: true });
    resizeWithin(document);
  }

  function installAllNotesView() {
    const footnotes = document.getElementById("footnotes");
    const registers = [
      ["行间注", document.getElementById("interlinearList")],
      ["按语", document.getElementById("commentList")],
      ["待核", document.getElementById("doubtList")],
    ];
    if (!footnotes && !registers.some(([, list]) => list)) return;
    if (!document.getElementById("allNotesStyle")) {
      const style = document.createElement("style");
      style.id = "allNotesStyle";
      style.textContent = `.all-notes-card h2{display:flex;gap:7px;align-items:center}.all-notes-card h2 small{color:var(--muted);font-size:11px}.all-notes-total,.all-notes-group h3 b{display:inline-grid;min-width:22px;height:22px;padding:0 5px;place-items:center;border-radius:12px;background:#e8f0fe;color:#174ea6;font:700 11px system-ui,sans-serif}.all-notes-return{margin:0 0 9px}.all-notes-groups{display:grid;gap:10px}.all-notes-group{padding-top:9px;border-top:1px solid var(--line)}.all-notes-group h3{display:flex;gap:6px;align-items:center;margin:0 0 7px;font:700 13px/1.4 system-ui,sans-serif}.all-notes-row{display:grid;grid-template-columns:minmax(60px,.5fr) minmax(120px,1fr);gap:6px;margin:6px 0;padding:7px;border:1px solid #d8e0e5;border-radius:6px;background:#fff}.all-notes-register-row{grid-template-columns:minmax(90px,.65fr) minmax(120px,1fr) auto}.all-notes-row textarea{width:100%;min-height:64px;padding:6px;border:1px solid var(--line);resize:vertical;font:12px/1.5 system-ui,sans-serif}.all-notes-source{min-width:0;padding:5px 7px;overflow-wrap:anywhere;text-align:left;font:12px/1.45 system-ui,sans-serif}.all-notes-actions{display:flex;flex-direction:column;gap:5px}.all-notes-empty{margin:0!important;padding:7px;color:var(--muted);background:var(--panel);font:12px system-ui,sans-serif}.study-panel #allNotesMount .all-notes-card{margin:0;box-shadow:none}@media(max-width:620px){.all-notes-row,.all-notes-register-row{grid-template-columns:1fr}.all-notes-actions{flex-direction:row}}`;
      document.head.append(style);
    }

    document.querySelectorAll(".study-panel .chinese-support-card details").forEach(details => details.open = true);
    let mount = document.getElementById("allNotesMount");
    if (!mount) {
      const sidebar = document.querySelector(".sidebar");
      if (!sidebar) return;
      mount = document.createElement("div");
      mount.id = "allNotesMount";
      sidebar.prepend(mount);
    }
    const card = document.createElement("section");
    card.className = "card all-notes-card";
    card.innerHTML = '<h2>全部注释 <small>All Notes</small> <b class="all-notes-total">0</b></h2><button type="button" class="all-notes-return" data-all-notes-return hidden>返回正文</button><div class="all-notes-groups"></div>';
    mount.replaceChildren(card);
    const groups = card.querySelector(".all-notes-groups");
    let rendering = false;

    function proxyTextarea(source) {
      const area = document.createElement("textarea");
      area.value = source.value;
      area.setAttribute("aria-label", source.getAttribute("aria-label") || "注释内容");
      area.addEventListener("input", () => {
        source.value = area.value;
        const event = new Event("input", { bubbles: true });
        event.allNotesProxy = true;
        source.dispatchEvent(event);
      });
      return area;
    }
    function actionButton(label, source, className = "") {
      const button = document.createElement("button");
      button.type = "button"; button.textContent = label; button.className = className;
      button.addEventListener("click", () => { source?.click(); queueMicrotask(render); });
      return button;
    }
    function section(title, rows) {
      const block = document.createElement("section");
      block.className = "all-notes-group";
      block.innerHTML = `<h3>${title} <b>${rows.length}</b></h3>`;
      if (!rows.length) block.insertAdjacentHTML("beforeend", '<p class="all-notes-empty">暂无</p>');
      rows.forEach(row => block.append(row));
      groups.append(block);
    }
    function render() {
      if (rendering) return;
      rendering = true; groups.innerHTML = ""; let total = 0;
      const footnoteRows = [...(document.getElementById("footnoteList")?.querySelectorAll(".footnote-item") || [])].map((sourceRow, index) => {
        const row = document.createElement("div"); row.className = "all-notes-row";
        const jump = actionButton(`${index + 1}.`, sourceRow.querySelector(".footnote-number"), "all-notes-source");
        const sourceArea = sourceRow.querySelector("textarea");
        row.append(jump, sourceArea ? proxyTextarea(sourceArea) : document.createTextNode(""));
        return row;
      });
      total += footnoteRows.length; section("脚注", footnoteRows);
      registers.forEach(([title, list]) => {
        const rows = [...(list?.querySelectorAll(".register-row") || [])].map(sourceRow => {
          const row = document.createElement("div"); row.className = "all-notes-row all-notes-register-row";
          const sourceButton = sourceRow.querySelector(".register-source");
          const jump = actionButton(sourceButton?.textContent.trim() || "定位正文", sourceButton, "all-notes-source");
          const sourceArea = sourceRow.querySelector("textarea");
          const actions = document.createElement("div"); actions.className = "all-notes-actions";
          sourceRow.querySelectorAll(".register-actions button").forEach(button => actions.append(actionButton(button.textContent, button, button.classList.contains("register-delete") ? "all-notes-delete" : "")));
          row.append(jump, sourceArea ? proxyTextarea(sourceArea) : document.createTextNode(""), actions);
          return row;
        });
        total += rows.length; section(title, rows);
      });
      card.querySelector(".all-notes-total").textContent = String(total);
      const returnButton = card.querySelector(".all-notes-return");
      returnButton.hidden = !document.querySelector(".study-pane");
      rendering = false;
    }
    let pending = false;
    const schedule = () => { if (!pending) { pending = true; requestAnimationFrame(() => { pending = false; render(); }); } };
    [document.getElementById("footnoteList"), ...registers.map(([, list]) => list)].filter(Boolean).forEach(list => {
      new MutationObserver(schedule).observe(list, { childList: true, subtree: true, attributes: true });
      list.addEventListener("input", event => { if (!event.allNotesProxy) schedule(); });
    });
    render();
  }

  function installGoogleVoicePriority() {
    const select = document.getElementById("voiceSelect");
    if (!select) return;
    let arranging = false;
    const arrange = () => {
      if (arranging) return;
      const options = [...select.options];
      if (options.length < 2) return;
      const first = options.shift();
      const google = options.filter(option => /^google\b/i.test(option.textContent.trim()));
      const others = options.filter(option => !/^google\b/i.test(option.textContent.trim()));
      const ordered = [first, ...google, ...others];
      if (ordered.every((option, index) => select.options[index] === option)) return;
      const selected = select.value;
      arranging = true;
      select.replaceChildren(...ordered);
      select.value = selected;
      arranging = false;
    };
    new MutationObserver(arrange).observe(select, { childList: true });
    arrange();
  }

  function installPaneBalancer() {
    if (document.body.classList.contains("news-editor-workspace")) return;
    if (document.querySelector(".pane-balance,.bilingual-layout-control,.workspace-pane-balance,.source-layout-control,#layoutButton,[data-pane-balancer]")) return;
    const containers = [...document.querySelectorAll(".workspace,.content-grid,.editor-shell,.reader-layout,.main-layout,.reading-layout,.split-layout,.layout,main")];
    const candidate = containers.map(container => {
      const allChildren = [...container.children].filter(node => !node.matches("script,style,template") && getComputedStyle(node).display !== "none");
      const splitter = allChildren.find(node => node.matches(".splitter,.resizer,[role=separator]"));
      const children = allChildren.filter(node => node !== splitter);
      let secondary = children.find(node => node.matches("aside,.sidebar,.study,.study-pane,.preview-pane,.translation-pane,.notes-dock,.reference-pane,.side-pane"));
      let primary = children.find(node => node !== secondary && node.matches("article,.paper,.editor-panel,.author-pane,.main-pane,.content-pane,.reading-pane,.pages,section"));
      const structural = container.matches(".workspace,.content-grid,.editor-shell,.reader-layout,.main-layout,.reading-layout,.split-layout,.layout") || ["grid", "flex"].includes(getComputedStyle(container).display);
      if ((!primary || !secondary) && structural && children.length === 2) [primary, secondary] = children;
      return primary && secondary && primary !== secondary ? { container, primary, secondary, splitter, secondaryFirst: allChildren.indexOf(secondary) < allChildren.indexOf(primary) } : null;
    }).find(Boolean);
    if (!candidate) return;
    const { container, primary, secondary, splitter, secondaryFirst } = candidate;
    const english = englishInterface || document.documentElement.lang.toLowerCase().startsWith("en");
    const labels = english
      ? { trigger: "Pane layout", primaryOnly: "Text only", primaryFirst: "Text first", balanced: "Balanced", secondaryFirst: "Pane first", secondaryOnly: "Pane only", primary: "Text", secondary: "Pane" }
      : russianInterface
        ? { trigger: "Панели", primaryOnly: "Только текст", primaryFirst: "Текст больше", balanced: "Поровну", secondaryFirst: "Панель больше", secondaryOnly: "Только панель", primary: "Текст", secondary: "Панель" }
      : { trigger: "分栏布局", primaryOnly: "仅正文", primaryFirst: "正文优先", balanced: "均衡", secondaryFirst: "窗格优先", secondaryOnly: "仅窗格", primary: "正文", secondary: "窗格" };
    if (secondary.matches(".preview-pane")) {
      Object.assign(labels, english
        ? { trigger: "Pane layout", primaryOnly: "Editor only", primaryFirst: "Editor first", secondaryFirst: "Preview first", secondaryOnly: "Preview only", primary: "Editor", secondary: "Preview" }
        : { trigger: "分栏布局", primaryOnly: "仅编辑区", primaryFirst: "编辑区优先", secondaryFirst: "预览优先", secondaryOnly: "仅预览", primary: "编辑区", secondary: "预览" });
    }
    const heading = secondary.querySelector("h1,h2,h3,.study-pane-title")?.textContent?.replace(/\s+/g, " ").trim();
    if (heading && heading.length <= 14) labels.secondary = heading.replace(/\s*\d+\s*$/, "") || labels.secondary;
    const style = document.createElement("style");
    style.textContent = `.workspace-pane-balance{position:relative;z-index:510;display:inline-flex}.workspace-pane-balance-trigger{white-space:nowrap}.workspace-pane-balance-popover{position:absolute;z-index:370;top:calc(100% + 6px);left:0;display:none;width:min(340px,calc(100vw - 24px));padding:12px;border:1px solid #c9d2df;border-radius:10px;background:#fff;color:#202124;box-shadow:0 10px 30px #0003}.workspace-pane-balance.open .workspace-pane-balance-popover{display:grid;gap:11px}.workspace-pane-presets{display:grid;grid-template-columns:repeat(5,1fr);gap:4px}.workspace-pane-presets button{min-width:0!important;padding:6px 3px!important;font-size:11px!important}.workspace-pane-presets button.active{background:#e6f4ea!important;color:#137333!important;font-weight:700}.workspace-pane-slider{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;color:#5f6368;font:12px/1.3 Arial,"PingFang SC",sans-serif}.workspace-pane-slider input{width:100%;min-width:80px}.workspace-pane-output{grid-column:1/-1;color:#202124;font-weight:700}.workspace-pane-layout.workspace-pane-primary-only>[data-pane-secondary],.workspace-pane-layout.workspace-pane-secondary-only>[data-pane-primary],.workspace-pane-layout.workspace-pane-primary-only>.splitter,.workspace-pane-layout.workspace-pane-secondary-only>.splitter{display:none!important}.workspace-pane-layout.workspace-pane-primary-only,.workspace-pane-layout.workspace-pane-secondary-only{grid-template-columns:1fr!important}@media(min-width:901px){.workspace-pane-layout:not(.workspace-pane-primary-only):not(.workspace-pane-secondary-only){grid-template-columns:minmax(0,var(--workspace-primary-share,75fr)) minmax(260px,var(--workspace-secondary-share,25fr))!important}.workspace-pane-layout.workspace-pane-secondary-first:not(.workspace-pane-primary-only):not(.workspace-pane-secondary-only){grid-template-columns:minmax(260px,var(--workspace-secondary-share,25fr)) minmax(0,var(--workspace-primary-share,75fr))!important}.workspace-pane-layout.workspace-pane-has-splitter:not(.workspace-pane-primary-only):not(.workspace-pane-secondary-only){grid-template-columns:minmax(0,var(--workspace-primary-share,75fr)) 8px minmax(260px,var(--workspace-secondary-share,25fr))!important}}@media(max-width:900px){.workspace-pane-presets{grid-template-columns:repeat(3,1fr)}.workspace-pane-slider{grid-template-columns:auto 1fr}.workspace-pane-slider>span:last-of-type,.workspace-pane-output{grid-column:1/-1}}@media print{.workspace-pane-balance{display:none!important}.workspace-pane-layout>[data-pane-primary]{display:block!important}.workspace-pane-layout>[data-pane-secondary]{display:none!important}}`;
    document.head.appendChild(style);
    container.classList.add("workspace-pane-layout");
    container.classList.toggle("workspace-pane-secondary-first", secondaryFirst);
    container.classList.toggle("workspace-pane-has-splitter", Boolean(splitter));
    primary.dataset.panePrimary = "";
    secondary.dataset.paneSecondary = "";
    const control = document.createElement("div");
    control.className = "workspace-pane-balance";
    control.innerHTML = `<button type="button" class="workspace-pane-balance-trigger" aria-expanded="false">${labels.trigger}</button><div class="workspace-pane-balance-popover"><div class="workspace-pane-presets"><button type="button" data-pane-share="0">${labels.primaryOnly}</button><button type="button" data-pane-share="25">${labels.primaryFirst}</button><button type="button" data-pane-share="50">${labels.balanced}</button><button type="button" data-pane-share="65">${labels.secondaryFirst}</button><button type="button" data-pane-share="100">${labels.secondaryOnly}</button></div><label class="workspace-pane-slider"><span>${labels.primary}</span><input type="range" min="0" max="100" step="1" value="25" aria-label="${english ? "Secondary pane share" : "右侧窗格所占比例"}"><span>${labels.secondary}</span><output class="workspace-pane-output"></output></label></div>`;
    const toolbar = document.querySelector(".toolbar,.actions,jianshang-editor-header .view-tools");
    const host = toolbar && getComputedStyle(toolbar).display !== "none" ? toolbar : document.querySelector(".topbar,header,.actions");
    if (!host) return;
    const anchor = host === toolbar ? (document.querySelector(".reading-environment") || host.lastElementChild) : host.lastElementChild;
    if (anchor) anchor.insertAdjacentElement("afterend", control); else host.appendChild(control);
    const trigger = control.querySelector(".workspace-pane-balance-trigger"), popover = control.querySelector(".workspace-pane-balance-popover"), slider = control.querySelector("input"), output = control.querySelector("output");
    const key = `reading-workspace-pane-balance:${location.pathname}`;
    const presetNames = { 0: labels.primaryOnly, 25: labels.primaryFirst, 50: labels.balanced, 65: labels.secondaryFirst, 100: labels.secondaryOnly };
    const applyShare = (raw, persist = true) => {
      const share = Math.max(0, Math.min(100, Number(raw) || 0));
      container.classList.toggle("workspace-pane-primary-only", share === 0);
      container.classList.toggle("workspace-pane-secondary-only", share === 100);
      container.style.setProperty("--workspace-primary-share", `${100 - share}fr`);
      container.style.setProperty("--workspace-secondary-share", `${share}fr`);
      slider.value = String(share);
      output.textContent = presetNames[share] || `${labels.primary} ${100 - share}% · ${labels.secondary} ${share}%`;
      control.querySelectorAll("[data-pane-share]").forEach(button => button.classList.toggle("active", Number(button.dataset.paneShare) === share));
      if (persist) localStorage.setItem(key, String(share));
    };
    applyShare(localStorage.getItem(key) ?? "25", false);
    trigger.addEventListener("click", event => { event.stopPropagation(); const open = control.classList.toggle("open"); trigger.setAttribute("aria-expanded", String(open)); if (open) requestAnimationFrame(() => { popover.style.left = "0px"; const rect = popover.getBoundingClientRect(), offset = Math.max(12 - rect.left, Math.min(0, innerWidth - 12 - rect.right)); popover.style.left = `${offset}px`; }); });
    control.querySelector(".workspace-pane-presets").addEventListener("click", event => { const button = event.target.closest("[data-pane-share]"); if (button) applyShare(button.dataset.paneShare); });
    slider.addEventListener("input", event => applyShare(event.target.value));
    document.addEventListener("click", event => { if (!control.contains(event.target)) { control.classList.remove("open"); trigger.setAttribute("aria-expanded", "false"); } });
    document.addEventListener("keydown", event => { if (event.key === "Escape") { control.classList.remove("open"); trigger.setAttribute("aria-expanded", "false"); } });
    window.ReadingWorkspace ||= {};
    window.ReadingWorkspace.setPaneShare = applyShare;
  }

  function installRussianInterfaceTranslation() {
    if (!russianInterface) return;
    const translations = {
      "View original source ↗": "Открыть источник ↗", "No changes": "Без изменений",
      "Contents": "Содержание", "Collapse toolbar": "Свернуть панель", "Expand toolbar": "Развернуть панель",
      "Show annotated text": "Показать примечания", "Show clean text": "Показать чистый текст",
      "View: Clean": "Режим: чистый текст", "View: Annotated": "Режим: примечания",
      "Undo": "Отменить", "Redo": "Повторить", "Search text": "Поиск по тексту",
      "Highlight and lines": "Выделение и линии", "Bold": "Полужирный", "Annotate": "Примечания",
      "Yellow": "Жёлтый", "Green": "Зелёный", "Blue": "Синий", "Pink": "Розовый", "Purple": "Фиолетовый",
      "Underline": "Подчёркивание", "Strikethrough": "Зачёркивание", "Pronunciation": "Произношение",
      "Interlinear note": "Межстрочное примечание", "Footnote": "Сноска", "Comment": "Комментарий",
      "Image": "Изображение", "Check": "Проверить", "Clear format": "Очистить формат",
      "Dictionary": "Словарь", "Russian poetry": "Русская поэзия", "Read aloud": "Читать вслух",
      "Pause": "Пауза", "Resume": "Продолжить", "Stop": "Стоп", "Default voice": "Голос по умолчанию",
      "Speed": "Скорость", "Save": "Сохранить", "Backup": "Резервная копия", "Log": "Журнал",
      "Import backup": "Импорт копии", "Hints: On": "Подсказки: вкл.", "Hints: Off": "Подсказки: выкл.",
      "Level": "Уровень", "Original text": "Исходный текст"
    };
    const attributes = { "View original source": "Открыть источник", "Search text": "Поиск по тексту", "Previous match": "Предыдущее совпадение", "Next match": "Следующее совпадение", "Return to contents": "Вернуться к содержанию", "Collapse the toolbar to enlarge the text area": "Свернуть панель и увеличить область текста", "Expand the editing toolbar": "Развернуть панель редактирования", "Reading voice": "Голос для чтения", "Minimum vocabulary hint level": "Минимальный уровень словарных подсказок" };
    let translating = false;
    const translate = () => {
      if (translating) return;
      translating = true;
      document.querySelectorAll(".topbar,.toolbar").forEach(root => {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const node = walker.currentNode, trimmed = node.nodeValue.trim();
          if (translations[trimmed]) node.nodeValue = node.nodeValue.replace(trimmed, translations[trimmed]);
        }
        root.querySelectorAll("[title],[aria-label],[placeholder]").forEach(node => ["title", "aria-label", "placeholder"].forEach(name => {
          const value = node.getAttribute(name); if (value && attributes[value]) node.setAttribute(name, attributes[value]);
        }));
      });
      translating = false;
    };
    translate();
    new MutationObserver(() => queueMicrotask(translate)).observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function installBasicEditorToolbar() {
    if (document.querySelector(".toolbar")) return;
    const editor = document.querySelector('[contenteditable="true"],textarea');
    if (!editor) return;
    const editable = editor.matches('[contenteditable="true"]');
    const chinese = !englishInterface && !russianInterface;
    const words = chinese
      ? { tools:"编辑工具栏", collapse:"收起工具栏", expand:"展开工具栏", undo:"撤销", redo:"重做", search:"搜索正文关键词", previous:"上一个", next:"下一个", highlight:"高亮", bold:"粗体", read:"朗读选中/全文", pause:"暂停", stop:"停止", speed:"语速", save:"保存到浏览器", text:"导出文本", backup:"备份 JSON" }
      : { tools:"Editor toolbar", collapse:"Collapse toolbar", expand:"Expand toolbar", undo:"Undo", redo:"Redo", search:"Search text", previous:"Previous", next:"Next", highlight:"Highlight", bold:"Bold", read:"Read aloud", pause:"Pause", stop:"Stop", speed:"Speed", save:"Save", text:"Export text", backup:"Backup JSON" };
    const toolbar = document.createElement("nav");
    toolbar.className = "toolbar unified-basic-toolbar";
    toolbar.setAttribute("aria-label", words.tools);
    toolbar.innerHTML = `<button type="button" data-basic="toggle">${words.collapse}</button><div class="group"><button type="button" data-basic="undo">${words.undo}</button><button type="button" data-basic="redo">${words.redo}</button></div><div class="group" role="search"><input type="search" data-basic="search" placeholder="${words.search}" aria-label="${words.search}"><button type="button" data-basic="previous" title="${words.previous}">↑</button><button type="button" data-basic="next" title="${words.next}">↓</button><span data-basic="search-status" aria-live="polite"></span></div><div class="group"><button type="button" data-basic="highlight" ${editable?"":"disabled"}>${words.highlight}</button><button type="button" data-basic="bold" ${editable?"":"disabled"}><b>B</b></button></div><div class="group"><button type="button" data-basic="read">${words.read}</button><button type="button" data-basic="pause">${words.pause}</button><button type="button" data-basic="stop">${words.stop}</button><label>${words.speed} <input type="range" data-basic="rate" min="0.5" max="1.5" step="0.1" value="0.8"><span data-basic="rate-value">0.8×</span></label></div><div class="group"><button type="button" data-basic="save">${words.save}</button><button type="button" data-basic="text">${words.text}</button><button type="button" data-basic="backup">${words.backup}</button></div>`;
    const header = document.querySelector(".topbar,header");
    (header || document.body).insertAdjacentElement(header ? "afterend" : "afterbegin", toolbar);
    const style = document.createElement("style");
    style.textContent = `.unified-basic-toolbar{position:sticky;top:0;z-index:500;display:flex;gap:7px;align-items:center;flex-wrap:wrap;padding:9px 14px;background:#eef4fd;border-bottom:1px solid #cdd8e8;box-shadow:0 2px 8px #00000012}.unified-basic-toolbar .group{display:flex;gap:5px;align-items:center;padding-right:8px;border-right:1px solid #c8d2df}.unified-basic-toolbar input[type=search]{width:min(260px,38vw);min-height:34px;padding:6px 10px;border:1px solid #b9c5d4;border-radius:5px}.unified-basic-toolbar label{display:flex;gap:5px;align-items:center;font-size:12px}.unified-basic-toolbar.collapsed>:not([data-basic=toggle]){display:none}.unified-basic-toolbar button,.unified-basic-toolbar input{font:inherit}@media(max-width:700px){.unified-basic-toolbar{position:relative}.unified-basic-toolbar .group{border-right:0}.unified-basic-toolbar input[type=search]{width:55vw}}@media print{.unified-basic-toolbar{display:none!important}}`;
    document.head.appendChild(style);
    const control = name => toolbar.querySelector(`[data-basic="${name}"]`), selectionText = () => getSelection()?.toString().trim() || (editor.value ?? editor.innerText);
    control("toggle").onclick = event => { const collapsed=toolbar.classList.toggle("collapsed");event.currentTarget.textContent=collapsed?words.expand:words.collapse;event.currentTarget.setAttribute("aria-expanded",String(!collapsed)); };
    for (const command of ["undo","redo"]) control(command).onclick = () => { editor.focus();document.execCommand(command); };
    for (const command of ["highlight","bold"]) control(command).onclick = () => { editor.focus();document.execCommand(command==="highlight"?"hiliteColor":"bold",false,command==="highlight"?"#fff1a8":null);editor.dispatchEvent(new InputEvent("input",{bubbles:true,inputType:`format${command}`})); };
    const search = control("search"), matches = () => { const q=search.value.trim();if(!q)return [];const text=editor.value??editor.innerText,result=[];let i=0;while((i=text.toLocaleLowerCase().indexOf(q.toLocaleLowerCase(),i))!==-1){result.push(i);i+=Math.max(q.length,1)}return result; }; let searchIndex=-1;
    const locate = delta => { const found=matches();if(!found.length){control("search-status").textContent="0";return}searchIndex=(searchIndex+delta+found.length)%found.length;const start=found[searchIndex];if(editor.setSelectionRange){editor.focus();editor.setSelectionRange(start,start+search.value.length)}else window.find(search.value,false,delta<0,true);control("search-status").textContent=`${searchIndex+1}/${found.length}`; };
    control("previous").onclick=()=>locate(-1);control("next").onclick=()=>locate(1);search.oninput=()=>{searchIndex=-1;control("search-status").textContent=search.value?String(matches().length):""};
    control("rate").oninput=event=>control("rate-value").textContent=`${Number(event.target.value).toFixed(1)}×`;
    control("read").onclick=()=>{speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(selectionText());utterance.lang=document.documentElement.lang||"zh-CN";utterance.rate=Number(control("rate").value);speechSynthesis.speak(utterance)};control("pause").onclick=()=>speechSynthesis.paused?speechSynthesis.resume():speechSynthesis.pause();control("stop").onclick=()=>speechSynthesis.cancel();
    const download=(name,text,type)=>{const link=document.createElement("a");link.href=URL.createObjectURL(new Blob([text],{type}));link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000)},identity=location.pathname.split("/").filter(Boolean).slice(-2,-1)[0]||"reading";
    control("save").onclick=()=>{const existing=document.querySelector('#save,#saveBtn,[data-action="save"]');if(existing&&!toolbar.contains(existing))existing.click();else{localStorage.setItem(`unified-editor:${location.pathname}`,editable?editor.innerHTML:editor.value);editor.dispatchEvent(new Event("change",{bubbles:true}))}};
    control("text").onclick=()=>download(`${identity}.txt`,editor.value??editor.innerText,"text/plain;charset=utf-8");control("backup").onclick=()=>download(`${identity}-backup.json`,JSON.stringify({url:location.href,html:editable?editor.innerHTML:null,text:editor.value??editor.innerText,savedAt:new Date().toISOString()},null,2),"application/json");
  }

  // Keep one strongly referenced utterance; ignore late events from canceled requests.
  // Speech-only substitutions: explicit ruby readings, never dictionary-wide replacements.
  // Common unambiguous homophones work around the browser voice's lack of phoneme controls.
  function pinyinSpeechText(text, pinyin) {
    const readings = {
      '楯': {dun4:'盾', shun3:'吮'}, '乘': {sheng4:'胜'}, '食': {si4:'四', yi4:'义'},
      '行': {hang2:'杭'}, '重': {chong2:'崇'},
      '长': {zhang3:'掌'}, '長': {zhang3:'掌'},
      '乐': {yue4:'月'}, '樂': {yue4:'月'},
      '好': {hao4:'浩'}, '恶': {wu4:'务'}, '惡': {wu4:'务'},
      '数': {shu3:'暑', shuo4:'朔'}, '數': {shu3:'暑', shuo4:'朔'},
      '为': {wei4:'卫'}, '為': {wei4:'卫'}, '爲': {wei4:'卫'},
      '少': {shao4:'绍'}, '将': {jiang4:'匠'}, '將': {jiang4:'匠'},
      '相': {xiang4:'巷'}, '王': {wang4:'望'}, '衣': {yi4:'义'},
      '冠': {guan4:'灌'}, '骑': {ji4:'计'}, '騎': {ji4:'计'},
      '说': {shui4:'税', yue4:'月'}, '說': {shui4:'税', yue4:'月'},
      '説': {shui4:'税', yue4:'月'}, '见': {xian4:'现'}, '見': {xian4:'现'},
      '属': {zhu3:'主'}, '屬': {zhu3:'主'}, '予': {yu3:'雨'},
      '度': {duo2:'夺'}, '量': {liang2:'粮'}, '任': {ren2:'仁'},
      '燕': {yan1:'烟'}, '单': {shan4:'善', chan2:'蝉'}, '單': {shan4:'善', chan2:'蝉'},
      '解': {xie4:'谢'}, '仇': {qiu2:'求'}, '曾': {zeng1:'增'},
      '差': {chai1:'拆', ci1:'疵'}, '参': {shen1:'身'}, '參': {shen1:'身'},
      '朝': {zhao1:'招'}, '调': {tiao2:'条'}, '調': {tiao2:'条'},
      '还': {huan2:'环'}, '還': {huan2:'环'}, '藏': {zang4:'葬'},
      '剡': {shan4:'善'}, '句': {gou1:'沟'}, '暴': {pu4:'瀑'}
    };
    const syllables = pinyin.trim().toLowerCase().replace(/u:/g, 'ü').split(/[\s’']+/);
    const characters = Array.from(text);
    if (characters.length !== syllables.length || !characters.every(c => /[\u3400-\u9fff]/.test(c))) return text;
    const key = syllable => {
      let tone = '', invalid = false;
      const value = syllable.normalize('NFD').replace(/[\u0300-\u036f]/g, mark => {
        if (mark === '\u0308') return 'v';
        const number = {'\u0304':'1','\u0301':'2','\u030c':'3','\u0300':'4'}[mark];
        if (!number || tone) invalid = true;
        tone = number || tone; return '';
      });
      if (invalid || (tone && /[1-5]$/.test(value))) return '';
      return tone ? value + tone : value;
    };
    return characters.map((character, index) => readings[character]?.[key(syllables[index])] || character).join('');
  }

  function createSpeechPlayback(synth, Utterance, notify, timers = {setTimeout: (fn, delay) => window.setTimeout(fn, delay), clearTimeout: id => window.clearTimeout(id)}) {
    let session = null;
    function chunks(text, limit) {
      const result = [];
      let rest = String(text).trim();
      while (rest) {
        const points = Array.from(rest), head = points.slice(0, limit).join('');
        let cut = head.length;
        if (points.length > limit) {
          const matches = [...head.matchAll(/[。！？；.!?;，,\s]/g)];
          const boundary = matches.at(-1);
          if (boundary && boundary.index > 0) cut = boundary.index + boundary[0].length;
        }
        result.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      return result;
    }
    function clearTimer(s) { if (s?.timer != null) timers.clearTimeout(s.timer); if (s) s.timer = null; }
    function stop(announce = true) {
      const previous = session;
      session = null;
      clearTimer(previous);
      synth.cancel();
      // cancel() does not reset the synthesis engine's paused state.
      synth.resume();
      if (announce) notify({state: 'stopped'});
    }
    function emit(s, state, extra = {}) { notify({state, voice: s.voice, fallback: s.fallback, ...extra}); }
    function fail(s, reason) {
      if (session !== s) return;
      clearTimer(s);
      s.attempt++;
      synth.cancel();
      synth.resume();
      if (s.voice && !s.fallback) {
        const language = s.voice.lang || s.lang;
        const available = synth.getVoices();
        s.voice = available.find(v => v.localService && v.lang === language) ||
          available.find(v => v.localService && v.lang.split('-')[0] === language.split('-')[0]) || null;
        s.fallback = true;
        s.reason = reason;
        emit(s, 'fallback', {reason});
        next(s);
      } else {
        session = null;
        emit(s, 'error', {reason});
      }
    }
    function next(s) {
      if (session !== s || s.paused) return;
      if (s.index >= s.parts.length) { session = null; emit(s, 'ended'); return; }
      const attempt = ++s.attempt;
      const utterance = new Utterance(s.parts[s.index]);
      s.utterance = utterance;
      utterance.lang = s.voice?.lang || s.lang;
      utterance.rate = s.rate;
      if (s.voice) utterance.voice = s.voice;
      const current = () => session === s && s.attempt === attempt;
      s.started = false;
      utterance.onstart = () => {
        if (!current()) return;
        clearTimer(s);
        s.started = true;
        emit(s, s.paused ? 'paused' : 'playing');
      };
      utterance.onend = () => {
        if (!current()) return;
        clearTimer(s);
        s.utterance = null;
        s.index++;
        next(s);
      };
      utterance.onerror = event => { if (current()) fail(s, event.error || 'synthesis-failed'); };
      s.timer = timers.setTimeout(() => { if (current()) fail(s, 'startup-timeout'); }, 6000);
      try { synth.speak(utterance); } catch (error) { fail(s, error.name || 'synthesis-failed'); }
    }
    return {
      start(text, {voice = null, lang = 'zh-CN', rate = 0.8} = {}) {
        stop(false);
        // Keep each request short, including at slower reading speeds.
        const parts = chunks(text, Math.max(20, Math.floor(50 * rate)));
        if (!parts.length) { notify({state: 'empty'}); return; }
        const s = {parts, index: 0, voice, lang, rate, attempt: 0, paused: false, fallback: false};
        session = s;
        emit(s, 'loading');
        next(s);
      },
      stop,
      togglePause() {
        const s = session;
        if (!s) return;
        s.paused = !s.paused;
        if (s.paused) { clearTimer(s); synth.pause(); emit(s, 'paused'); }
        else {
          synth.resume();
          emit(s, s.started ? 'playing' : 'loading');
          if (!s.utterance) next(s);
          else if (!s.started) s.timer = timers.setTimeout(() => fail(s, 'startup-timeout'), 6000);
        }
      }
    };
  }

  function installReliableSpeechReading() {
    if (!('speechSynthesis' in window)) return;
    const read = document.querySelector('#speakBtn,[data-basic="read"]') || [...document.querySelectorAll('button')].find(button => /朗读选中|Read aloud|Читать вслух/.test(button.textContent));
    const editor = document.querySelector('#editor[contenteditable="true"],.editor[contenteditable="true"],[contenteditable="true"],textarea');
    if (!read || !editor) return;
    const pause = document.querySelector('#pauseBtn,[data-basic="pause"]');
    const stop = document.querySelector('#stopBtn,[data-basic="stop"]');
    const select = document.getElementById('voiceSelect');
    // Speech status is separate from autosave status, which changes while reading.
    const status = document.createElement('span');
    status.dataset.speechStatus = 'true';
    status.setAttribute('role', 'status');
    status.style.cssText = 'font-size:12px;max-width:32em;white-space:normal';
    read.parentElement.append(status);
    const zh = !englishInterface && !russianInterface;
    const label = (cn, en, ru) => zh ? cn : russianInterface ? ru : en;
    let mode = '';
    const voicePreferenceKey = 'reading-workspace-voice-v1';
    let voicePreference = null;
    try { voicePreference = JSON.parse(localStorage.getItem(voicePreferenceKey)); } catch (_) {}
    const voiceForOption = option => speechSynthesis.getVoices().find(voice =>
      option && (option.value === voice.voiceURI || option.textContent === `${voice.name} — ${voice.lang}` || option.textContent === voice.name || option.textContent.startsWith(`${voice.name} (`)));
    const restoreVoice = () => {
      if (!select || !voicePreference) return;
      const option = [...select.options].find(option => {
        if (voicePreference.systemDefault) return option.value === '';
        const voice = voiceForOption(option);
        return option.value !== '' && (voice && (voice.voiceURI === voicePreference.uri || (voice.name === voicePreference.name && voice.lang === voicePreference.lang)) || option.textContent === voicePreference.label);
      });
      // Keep the saved choice if its voice has not loaded or is unavailable here.
      select.value = option ? option.value : '';
    };
    select?.addEventListener('change', () => {
      const option = select.selectedOptions[0], voice = voiceForOption(option);
      voicePreference = {systemDefault: select.value === '', uri: voice?.voiceURI, name: voice?.name, lang: voice?.lang, label: option?.textContent};
      try { localStorage.setItem(voicePreferenceKey, JSON.stringify(voicePreference)); } catch (_) {}
    });
    // Page-level loaders can replace the options after voices arrive asynchronously.
    if (select) new MutationObserver(restoreVoice).observe(select, {childList: true});
    speechSynthesis.addEventListener('voiceschanged', restoreVoice);
    window.addEventListener('storage', event => {
      if (event.key !== voicePreferenceKey) return;
      try { voicePreference = JSON.parse(event.newValue); } catch (_) { voicePreference = null; }
      restoreVoice();
    });
    restoreVoice();
    const playback = createSpeechPlayback(speechSynthesis, SpeechSynthesisUtterance, event => {
      const active = ['loading', 'playing', 'paused', 'fallback'].includes(event.state);
      if (pause) {
        pause.disabled = !active;
        pause.dataset.speechPaused = String(event.state === 'paused');
        pause.textContent = event.state === 'paused' ? label('继续', 'Continue', 'Продолжить') : label('暂停', 'Pause', 'Пауза');
      }
      if (stop) stop.disabled = !active;
      const fallback = event.fallback ? label('所选声音未响应，已改用 ', 'Selected voice unavailable; using ', 'Выбранный голос недоступен; используется ') + (event.voice?.name || label('系统默认声音', 'system default', 'системный голос')) + ' · ' : '';
      const messages = {
        loading: label('正在准备朗读…', 'Preparing speech…', 'Подготовка чтения…'),
        playing: mode,
        fallback: label('正在切换声音…', 'Switching voice…', 'Смена голоса…'),
        paused: label('已暂停', 'Paused', 'Пауза'),
        stopped: label('已停止朗读', 'Stopped', 'Чтение остановлено'),
        ended: label('朗读完成', 'Finished reading', 'Чтение завершено'),
        empty: label('没有可朗读的正文', 'No text to read', 'Нет текста для чтения'),
        error: label('朗读失败，请选择其他声音后重试', 'Speech failed; select another voice and retry', 'Ошибка чтения; выберите другой голос') + ` (${event.reason})`
      };
      status.textContent = fallback + messages[event.state];
    });
    const chosenVoice = () => {
      const option = select?.selectedOptions[0];
      return select?.value ? voiceForOption(option) : null;
    };
    const usePinyin = () => {
      const voice = chosenVoice();
      return /Chrome\//.test(navigator.userAgent) && !/Edg\/|OPR\//.test(navigator.userAgent) &&
        voice?.lang?.toLowerCase() === 'zh-cn' && /^Google\b/i.test(voice.name);
    };
    const speechRange = range => {
      const copy = editor.cloneNode(true);
      // Resolve range endpoints before replacing text; substitutions preserve UTF-16 length.
      const clonedPoint = node => {
        const path = [];
        while (node !== editor) { path.unshift([...node.parentNode.childNodes].indexOf(node)); node = node.parentNode; }
        return path.reduce((parent, index) => parent.childNodes[index], copy);
      };
      const startNode = range && clonedPoint(range.startContainer);
      const endNode = range && clonedPoint(range.endContainer);
      if (usePinyin()) copy.querySelectorAll('ruby').forEach(ruby => {
        const rt = ruby.querySelector('rt');
        if (!rt) return;
        const walker = document.createTreeWalker(ruby, NodeFilter.SHOW_TEXT);
        const nodes = []; let node;
        while ((node = walker.nextNode())) if (!node.parentElement.closest('rt,rp')) nodes.push(node);
        const original = nodes.map(node => node.data).join('');
        const spoken = pinyinSpeechText(original, rt.textContent);
        let offset = 0;
        for (const node of nodes) { const length = node.length; if (node.data !== spoken.slice(offset, offset + length)) node.replaceData(0, length, spoken.slice(offset, offset + length)); offset += length; }
      });
      let fragment = copy;
      if (range) {
        const selected = document.createRange();
        selected.setStart(startNode, range.startOffset); selected.setEnd(endNode, range.endOffset);
        fragment = selected.cloneContents();
      }
      return clean(fragment);
    };
    const clean = fragment => {
      fragment.querySelectorAll?.('rt,rp,.inline-gloss,.comment-block,.footnote-ref,.inline-media').forEach(node => node.remove());
      return (fragment.textContent || '').replace(/[■□▪▫◼◻⬛⬜]+/g, '').replace(/\s+/g, ' ').trim();
    };
    const start = (text, readingMode) => {
      mode = readingMode;
      const voices = speechSynthesis.getVoices();
      const option = select?.selectedOptions[0];
      const voice = select?.value ? voices.find(v => v.voiceURI === select.value || option?.textContent === `${v.name} — ${v.lang}` || option?.textContent === v.name || option?.textContent.startsWith(`${v.name} (`)) : null;
      playback.start(text, {voice, lang: document.documentElement.lang || 'zh-CN', rate: Number(document.querySelector('#rate,[data-basic="rate"]')?.value) || 0.8});
    };
    window.ReadingWorkspace ||= {};
    window.ReadingWorkspace.readAloud = start;
    window.ReadingWorkspace.cleanSpeechFragment = clean;
    window.ReadingWorkspace.speechRange = speechRange;
    read.addEventListener('mousedown', event => event.preventDefault());
    read.addEventListener('click', event => {
      event.preventDefault(); event.stopImmediatePropagation();
      const selection = getSelection();
      const selected = selection?.rangeCount && !selection.isCollapsed && editor.contains(selection.anchorNode) && editor.contains(selection.focusNode) ? speechRange(selection.getRangeAt(0)) : '';
      const text = editor.setSelectionRange ? (editor.value.slice(editor.selectionStart, editor.selectionEnd) || editor.value) : (selected || speechRange(null));
      start(text, selected ? label('正在朗读所选原文', 'Reading selection', 'Чтение выделенного текста') : label('正在朗读原文全文', 'Reading full text', 'Чтение всего текста'));
    }, true);
    for (const [control, action] of [[pause, () => playback.togglePause()], [stop, () => playback.stop()]]) {
      control?.addEventListener('click', event => { event.preventDefault(); event.stopImmediatePropagation(); action(); }, true);
    }
    window.addEventListener('pagehide', () => playback.stop(false));
  }

  function installReadFromCursor() {
    if (!("speechSynthesis" in window) || document.querySelector("[data-read-from-cursor]")) return;
    const editor = document.querySelector('#editor[contenteditable="true"],.editor[contenteditable="true"],[contenteditable="true"],textarea');
    if (!editor) return;
    const existingRead = document.querySelector('#speakBtn,[data-basic="read"]') || [...document.querySelectorAll("button")].find(button => /朗读选中|Read aloud|Читать вслух/.test(button.textContent));
    if (!existingRead) return;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.readFromCursor = "true";
    button.textContent = russianInterface ? "Читать от курсора" : englishInterface ? "Read from cursor" : "从光标朗读";
    button.title = russianInterface ? "Начать чтение с позиции текстового курсора" : englishInterface ? "Start reading at the text cursor" : "从正文中的文字光标位置开始朗读";
    existingRead.insertAdjacentElement("afterend", button);

    let savedRange = null;
    const rememberCaret = () => {
      if (editor.setSelectionRange) return;
      const selection = getSelection();
      if (!selection?.rangeCount || !editor.contains(selection.focusNode)) return;
      const range = document.createRange();
      try {
        range.setStart(selection.focusNode, selection.focusOffset);
        range.collapse(true);
        savedRange = range.cloneRange();
      } catch {}
    };
    document.addEventListener("selectionchange", rememberCaret);
    editor.addEventListener("pointerup", rememberCaret);
    editor.addEventListener("keyup", rememberCaret);
    button.addEventListener("mousedown", event => event.preventDefault());

    const textFromCaret = () => {
      if (editor.setSelectionRange) {
        const start = Number.isInteger(editor.selectionStart) ? editor.selectionStart : 0;
        return editor.value.slice(start).replace(/[■□▪▫◼◻⬛⬜]+/g, "").trim();
      }
      const range = savedRange || (() => {
        const first = document.createRange(); first.selectNodeContents(editor); first.collapse(true); return first;
      })();
      if (!editor.contains(range.startContainer)) return window.ReadingWorkspace.speechRange(null);
      const remainder = document.createRange();
      remainder.setStart(range.startContainer, range.startOffset);
      remainder.selectNodeContents(editor);
      remainder.setStart(range.startContainer, range.startOffset);
      return window.ReadingWorkspace.speechRange(remainder);
    };
    button.addEventListener("click", () => {
      const text = textFromCaret();
      if (!text) return;
      window.ReadingWorkspace.readAloud(text, !englishInterface && !russianInterface ? "正在从光标位置朗读" : russianInterface ? "Чтение от курсора" : "Reading from cursor");
    });
  }

  function installWorkspaceControls() { installBasicEditorToolbar(); installReliableSpeechReading(); installReadFromCursor(); installToolbarLayering(); installColoredUnderlines(); installDictionaryOccurrences(); installProjectDictionaryLinks(); installRussianInterfaceTranslation();  installSwitch(); installReadingThemeToggle(); installReadingEnvironment(); installPaneBalancer(); installFileMenu(); installInsertMenu(); installUserNotesAccess(); installUserNoteActions(); installExpandingReviewFields(); installAnnotationSync(); installAllNotesView(); installImmersiveMode(); installGoogleVoicePriority(); window.ReadingWorkspace ||= {}; window.ReadingWorkspace.interfaceLanguage = interfaceLanguage; }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", installWorkspaceControls);
  else installWorkspaceControls();
})();
