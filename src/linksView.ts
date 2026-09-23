"use strict";
import * as vscode from "vscode";

/**
 * The QB64PE activity-bar panel — a single webview so the logo sits flush at the
 * top with no collapsible header (a container with one view hides the per-view
 * title bar). Layout: logo + quick-action menu (top) · links (Community +
 * Reference) · Articles &
 * Tutorials (own scroller) · a footer checkbox mirroring
 * qb64pe.links.openInSimpleBrowser. The Reference header carries a wiki search
 * box; results open wherever the links do.
 *
 * To add/rename/reorder entries, edit the data below — that's the whole model.
 */

const WIKI = "https://qb64phoenix.com/qb64wiki/";
/** Wiki page URL from its title (MediaWiki: spaces -> underscores). */
const wiki = (title: string): string => `${WIKI}index.php/${title.replace(/ /g, "_")}`;
/** Wiki page URL from an exact page slug (as it appears in the wiki's href). */
const page = (slug: string): string => `${WIKI}index.php/${slug}`;
/** Wiki search URL. `go=Go` jumps straight to an exact title match (e.g. `_PUTIMAGE`),
 *  otherwise MediaWiki shows the full-text results page. */
export const wikiSearchUrl = (query: string): string =>
  `${WIKI}index.php?search=${encodeURIComponent(query.trim())}&title=Special:Search&go=Go`;

interface LinkDef {
  label: string;
  url: string;
  /** Font Awesome 4.7 icon name (without the `fa-` prefix). */
  icon?: string;
  tooltip?: string;
  /** Indented bullet under the entry before it (e.g. a section of that page). */
  sub?: boolean;
}

interface ActionDef {
  label: string;
  command: string;
  /** Font Awesome 4.7 icon name (without the `fa-` prefix). */
  icon: string;
  /** Acts on the current QB64PE editor: focus it first (the panel has focus). */
  editor?: boolean;
}

/** Quick-action menu beside the logo; "---" draws a separator. */
export const QUICK_ACTIONS: (ActionDef | "---")[] = [
  { label: "Settings", command: "qb64pe.openSettings", icon: "cog" },
  "---",
  { label: "Run", command: "qb64pe.runWithoutDebugging", icon: "play", editor: true },
  { label: "Debug", command: "qb64pe.startDebugging", icon: "bug", editor: true },
  { label: "Compile Log", command: "extension.openCompileLog", icon: "file-text-o" },
  { label: "Lint", command: "extension.runLint", icon: "check-square-o", editor: true },
  "---",
  { label: "ASCII Chart", command: "extension.showAsciiChart", icon: "table" },
  { label: "Open QB64PE IDE", command: "extension.openCurrentFileInQB64PE", icon: "external-link", editor: true },
  { label: "Format Source", command: "editor.action.formatDocument", icon: "indent", editor: true },
  { label: "Align Source", command: "qb64pe.alignSource", icon: "align-justify", editor: true },
];

interface LinkSection {
  label: string;
  /** Side-by-side columns, shown above `links` with a divider between. */
  columns?: LinkDef[][];
  links: LinkDef[];
  /** Show the wiki search box in this section's header. */
  search?: boolean;
  /** Collapsible (twirl-down) section: "open" or "closed" until the user toggles it. */
  collapsible?: "open" | "closed";
}

/** Keyword Reference - By usage, one entry per section of that page (its anchors). */
const USAGE_TOPICS = [
    "Arrays and Data Storage",
    "Colors and Transparency",
    "Console Window",
    "Conditional Operations",
    "Definitions and Variable Types",
    "External Disk and API calls",
    "Error Trapping, Logging & Debugging",
    "Event Trapping",
    "File Input and Output",
    "Checksums and Hashes",
    "Compression and Encoding",
    "Fonts",
    "Game Controller Input (Joystick)",
    "Graphic Commands",
    "Graphics and Imaging:",
    "Keyboard Input",
    "Libraries",
    "Logical Bitwise Operations",
    "Mathematical Functions and Operations",
    "Memory Handling and Clipboard",
    "Mouse Input",
    "Numerical Manipulation and Conversion",
    "Port Input and Output (COM and LPT)",
    "Print formatting",
    "Printer Output (LPT and USB)",
    "Program Flow and Loops",
    "Sounds and Music",
    "String Text Manipulation and Conversion",
    "Sub procedures and Functions",
    "TCP/IP Networking HTTP(S) and Email",
    "Text on Screen",
    "Time, Date and Timing",
    "Window and Desktop",
    "QB64 Programming Symbols",
    "QB64 Programming References",
];

export const LINK_SECTIONS: LinkSection[] = [
  {
    label: "Community",
    columns: [
      [
        { label: "Homepage", url: "https://www.qb64phoenix.com", icon: "home" },
        { label: "Forums", url: "https://qb64phoenix.com/forum/index.php", icon: "comments" },
        { label: "Wiki", url: WIKI, icon: "book" },
      ],
      [
        { label: "Discord", url: "https://discord.gg/D2M7hepTSx", icon: "gamepad" },
        { label: "Reddit", url: "https://www.reddit.com/r/QB64pe/", icon: "reddit" },
        { label: "Patreon", url: "https://www.patreon.com/user?u=86544769", icon: "handshake-o" },
      ],
    ],
    links: [
      { label: "GitHub (QB64PE)", url: "https://github.com/QB64-Phoenix-Edition/QB64pe", icon: "github" },
      { label: "This Extension on Open VSX", url: "https://open-vsx.org/extension/grymmjack/qb64pe", icon: "puzzle-piece" },
    ],
  },
  {
    label: "Reference",
    search: true,
    collapsible: "open",
    links: [
      { label: "Wiki Main Page", url: WIKI, icon: "book" },
      { label: "Keyword Reference — Metacommands", url: wiki("Metacommand"), icon: "terminal" },
      { label: "Keyword Reference — Alphabetical", url: wiki("Keyword Reference - Alphabetical"), icon: "list" },
      { label: "Keyword Reference — By Usage", url: wiki("Keyword Reference - By usage"), icon: "list-ol" },
      { label: "Quick Reference — Tables", url: wiki("Quick Reference - Tables"), icon: "table" },
      { label: "QB64 Variable Types", url: wiki("Quick Reference - Tables#QB64 Variable Types"), sub: true },
      { label: "OpenGL Types", url: wiki("Quick Reference - Tables#OpenGL Types"), sub: true },
      { label: "Relational Operations", url: wiki("Quick Reference - Tables#Relational Operations"), sub: true },
      { label: "Logical Operations", url: wiki("Quick Reference - Tables#Logical Operations"), sub: true },
      { label: "QB64 Programming References", url: wiki("Quick Reference - Tables#QB64 Programming References"), sub: true },
    ],
  },
  {
    label: "Keywords",
    collapsible: "closed",
    links: USAGE_TOPICS.map((topic) => ({
      label: topic.replace(/:$/, ""),
      url: wiki(`Keyword Reference - By usage#${topic}`),
      icon: "tag",
    })),
  },
];

/** Articles & Tutorials (their own scroller). */
export const ARTICLES: LinkDef[] = [
  { label: "Terry Ritchie's QB64 Game Programming", url: "https://www.qb64tutorial.com/", icon: "graduation-cap" },
  { label: "School Freeware series on QB64 (YouTube)", url: "https://www.youtube.com/watch?v=hE-Voij5k5Q&list=PLF6199808BD4901E1", icon: "youtube-play" },
  { label: "Arrays", url: page("Arrays") },
  { label: "ASCII Character Codes", url: page("ASCII") },
  { label: "Binary Numbers", url: page("Binary") },
  { label: "Bitwise Operations", url: page("Bitwise_Operators") },
  { label: "Boolean Operations", url: page("Boolean") },
  { label: "Built-in Logging Support", url: page("Logging") },
  { label: "Console Window", url: page("Console_Window") },
  { label: "Constants (Defined by the Compiler)", url: page("Constants") },
  { label: "Controller Devices (Keyboard, Mouse, Joystick, Gamepad)", url: page("Controller_Devices") },
  { label: "Converting Bytes to Bits", url: page("Converting_Bytes_to_Bits") },
  { label: "Downloading Files (TCP/IP)", url: page("Downloading_Files") },
  { label: "Environment (Windows Registry)", url: page("Windows_Environment") },
  { label: "Hardware images", url: page("Hardware_images") },
  { label: "Image file procedures", url: page("Images") },
  { label: "Keyboard Scan Codes", url: page("Keyboard_scancodes") },
  { label: "Libraries (C++, Windows, DLL)", url: page("Libraries") },
  { label: "Mathematical Operations", url: page("Mathematical_Operations") },
  { label: "PDS(7.1) Procedures", url: page("PDS(7.1)_Procedures") },
  { label: "Port Access Libraries", url: page("Port_Access_Libraries") },
  { label: "Relational Operations", url: page("Relational_Operations") },
  { label: "Line numbers", url: page("Line_numbers") },
  { label: "Removing line numbers", url: page("Line_number") },
  { label: "Resource Table extraction (Icon Extraction)", url: page("Resource_Table_extraction#Extract_Icon") },
  { label: "Screen Memory", url: page("Screen_Memory") },
  { label: "Text, Fonts and Unicode Using Graphics", url: page("Text_Using_Graphics") },
  { label: "Variable Types", url: page("Variable_Types") },
];

const SIMPLE_BROWSER_KEY = "links.openInSimpleBrowser";
/** globalState key for the panel's pane layout (open/closed + sizes). */
const LAYOUT_KEY = "qb64pe.panel.layout";

interface PanelLayout {
  /** Pane heights in px (flex-grow weights), keyed by pane id. */
  sizes: Record<string, number>;
  /** `open:<pane id>` -> expanded? */
  [open: `open:${string}`]: boolean;
}

/**
 * Keeps only well-formed layout entries. The layout round-trips through the
 * webview and is embedded back into its script, so nothing else gets through.
 */
export function sanitizeLayout(value: unknown): PanelLayout {
  const out: PanelLayout = { sizes: {} };
  if (!value || typeof value !== "object") return out;
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    if (/^open:[a-z0-9-]{1,64}$/.test(key) && typeof v === "boolean") {
      out[key as `open:${string}`] = v;
    }
  }
  const sizes = (value as { sizes?: unknown }).sizes;
  if (sizes && typeof sizes === "object") {
    for (const [key, v] of Object.entries(sizes as Record<string, unknown>)) {
      if (/^[a-z0-9-]{1,64}$/.test(key) && typeof v === "number" && Number.isFinite(v) && v > 0 && v < 100000) {
        out.sizes[key] = v;
      }
    }
  }
  return out;
}

/**
 * Opens a URL in VS Code's internal Simple Browser when the panel's "View Links
 * in Internal Browser" box (qb64pe.links.openInSimpleBrowser) is checked,
 * otherwise in the user's browser.
 */
export function openLink(url: string): void {
  const inSimpleBrowser = vscode.workspace
    .getConfiguration("qb64pe")
    .get<boolean>(SIMPLE_BROWSER_KEY, false);
  if (inSimpleBrowser) {
    vscode.commands.executeCommand("simpleBrowser.show", url);
  } else {
    vscode.env.openExternal(vscode.Uri.parse(url));
  }
}

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

class MainViewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;

  private readonly extensionUri: vscode.Uri;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.extensionUri = context.extensionUri;
  }

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    // Allow both images/ (logo) and media/ (bundled Font Awesome css + fonts).
    view.webview.options = { enableScripts: true, localResourceRoots: [this.extensionUri] };
    view.webview.html = this.html(view.webview);
    view.webview.onDidReceiveMessage((msg) => {
      if (msg?.type === "open" && typeof msg.url === "string") {
        this.open(msg.url);
      } else if (msg?.type === "layout") {
        this.context.globalState.update(LAYOUT_KEY, sanitizeLayout(msg.layout));
      } else if (msg?.type === "command" && typeof msg.command === "string") {
        this.run(msg.command);
      } else if (msg?.type === "search" && typeof msg.query === "string" && msg.query.trim()) {
        this.open(wikiSearchUrl(msg.query));
      } else if (msg?.type === "setSimpleBrowser") {
        vscode.workspace
          .getConfiguration("qb64pe")
          .update(SIMPLE_BROWSER_KEY, !!msg.value, vscode.ConfigurationTarget.Global);
      }
    });
    const sub = vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration(`qb64pe.${SIMPLE_BROWSER_KEY}`)) this.postState();
    });
    view.onDidDispose(() => sub.dispose());
    this.postState();
  }

  private open(url: string): void {
    openLink(url);
  }

  /** Runs a quick action (only the ones the menu lists). */
  private async run(command: string): Promise<void> {
    const action = QUICK_ACTIONS.find((a): a is ActionDef => a !== "---" && a.command === command);
    if (!action) return;
    if (action.editor) {
      // Clicking the panel moves focus to it; editor commands need the editor.
      const editor = qb64Editor();
      if (!editor) {
        vscode.window.showInformationMessage(`${action.label}: open a QB64PE source file first.`);
        return;
      }
      await vscode.window.showTextDocument(editor.document, editor.viewColumn);
    }
    await vscode.commands.executeCommand(action.command);
  }

  private postState(): void {
    const value = vscode.workspace.getConfiguration("qb64pe").get<boolean>(SIMPLE_BROWSER_KEY, false);
    this.view?.webview.postMessage({ type: "state", value });
  }

  private row(l: LinkDef): string {
    const icon = l.icon ?? (l.sub ? "circle" : "file-text-o");
    return `<a class="row${l.sub ? " sub" : ""}" href="#" data-url="${esc(l.url)}" title="${esc(l.tooltip ?? l.url)}"><i class="fa fa-${esc(icon)} fa-fw" aria-hidden="true"></i><span class="lbl">${esc(l.label)}</span></a>`;
  }

  private html(webview: vscode.Webview): string {
    const logo = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, "images", "qb64pe.svg"));
    const faCss = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "media", "fontawesome", "css", "font-awesome.min.css")
    );
    const layoutJson = JSON.stringify(sanitizeLayout(this.context.globalState.get(LAYOUT_KEY)));
    const nonce = Array.from({ length: 16 }, () => Math.floor(Math.random() * 36).toString(36)).join("");
    const search = `<form class="search" id="search"><input type="search" id="q" placeholder="Search wiki..." aria-label="Search the QB64PE wiki" spellcheck="false"><button type="submit" title="Search the QB64PE wiki">SEARCH</button></form>`;
    const rows = (links: LinkDef[]) => links.map((l) => this.row(l)).join("");
    const bodyOf = (s: LinkSection) =>
      (s.columns
        ? `<div class="cols">${s.columns.map((c) => `<div class="col">${rows(c)}</div>`).join("")}</div><div class="sep"></div>`
        : "") + rows(s.links);
    // Fixed sections (Community) stay put; collapsible ones become resizable panes.
    const fixed = LINK_SECTIONS.filter((s) => !s.collapsible)
      .map((s) => `<div class="section-title"><span>${esc(s.label)}</span></div>${bodyOf(s)}`)
      .join("");
    const panes = [
      ...LINK_SECTIONS.filter((s) => s.collapsible)
        .map((s) => pane(s.label, s.collapsible!, bodyOf(s), s.search ? search : "")),
      pane("Articles & Tutorials", "open", rows(ARTICLES)),
    ].join("");
    const quick = QUICK_ACTIONS.map((a) =>
      a === "---"
        ? `<div class="sep"></div>`
        : `<a class="row" href="#" data-command="${esc(a.command)}" title="${esc(a.label)}"><i class="fa fa-${esc(a.icon)} fa-fw" aria-hidden="true"></i><span class="lbl">${esc(a.label)}</span></a>`
    ).join("");

    return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; font-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
<link rel="stylesheet" href="${faCss}">
<style>
  html, body { margin: 0; padding: 0; height: 100%; background: transparent;
    color: var(--vscode-foreground); font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); }
  /* Logo, quick menu and Community are fixed; the panes below share the rest. */
  body { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
  /* Logo | quick menu, split 50/50 like the Community columns so they line up. */
  .top { flex: 0 0 auto; display: flex; flex-wrap: wrap; align-items: center; padding: 16px 0 4px; }
  .logo { flex: 1 1 50%; min-width: 130px; box-sizing: border-box; padding: 0 12px; }
  .logo img { display: block; width: 100%; max-width: 200px; height: auto; }
  .quick { flex: 1 1 50%; min-width: 130px; }
  .quick a.row { padding: 3px 12px; }
  .cols { display: flex; flex-wrap: wrap; }
  .col { flex: 1 1 50%; min-width: 130px; }
  .sep { margin: 4px 12px; border-top: 1px solid var(--vscode-sideBarSectionHeader-border, rgba(128,128,128,.25)); }
  .community { flex: 0 0 auto; padding-bottom: 8px; }
  /* Panes: like VS Code's side-bar views. Each open pane gets a share of the
     height (flex-grow = its size in px, set by the script) and scrolls inside;
     a collapsed pane is just its header. Drag a pane's top edge to resize. */
  .panes { flex: 1 1 0; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
  .pane { position: relative; flex: 0 0 auto; display: flex; flex-direction: column; min-height: 0;
    border-top: 1px solid var(--vscode-sideBarSectionHeader-border, rgba(128,128,128,.25)); }
  .pane:not(.collapsed) { flex: 1 1 0px; min-height: 80px; }
  .pane > .group-head { flex: 0 0 auto; margin: 0; padding: 8px 12px 6px; }
  .pane > .group-body { flex: 1 1 0; min-height: 0; overflow-y: auto; padding-bottom: 4px; }
  .sash { position: absolute; left: 0; right: 0; top: -3px; height: 5px; z-index: 2; cursor: ns-resize; touch-action: none; }
  .sash.off { display: none; }
  .sash:hover, .sash.active { background: var(--vscode-sash-hoverBorder, var(--vscode-focusBorder)); }
  .footer { flex: 0 0 auto; border-top: 1px solid var(--vscode-sideBarSectionHeader-border, rgba(128,128,128,.25)); }
  /* Headings: a full-width dark band. The text is dimmed via color (not opacity,
     which would also fade the band and the Reference search box). */
  .section-title { font-weight: 700; text-transform: uppercase; font-size: 13px; letter-spacing: .04em;
    color: color-mix(in srgb, var(--vscode-foreground) 75%, transparent);
    background: rgba(0, 0, 0, .5); padding: 8px 12px 6px; margin: 12px 0 6px; }
  .community > .section-title:first-child { margin-top: 0; }
  /* Collapsible groups: only the caret + heading toggle, so a search box in the
     header stays usable (and visible) while the group is collapsed. */
  .group-head { display: flex; align-items: center; gap: 8px; }
  button.twirl-btn { display: flex; align-items: center; gap: 2px; padding: 0; margin-left: -4px; border: 0;
    background: none; color: inherit; font: inherit; letter-spacing: inherit; text-transform: inherit; cursor: pointer; }
  button.twirl-btn:focus-visible { outline: 1px solid var(--vscode-focusBorder); }
  .twirl { transition: transform .1s; transform: rotate(90deg); }
  .group.collapsed .twirl { transform: none; }
  .group.collapsed > .group-body { display: none; }
  .section-title.with-search { display: flex; align-items: center; gap: 8px; padding-top: 6px; }
  .section-title.with-search > span, .section-title.with-search > .twirl-btn { flex: 0 0 auto; }
  form.search { flex: 1 1 auto; display: flex; gap: 4px; min-width: 0; margin: 0;
    text-transform: none; letter-spacing: normal; font-weight: normal; font-size: var(--vscode-font-size); }
  form.search input { flex: 1 1 auto; min-width: 0; padding: 5px 8px; font: inherit;
    color: var(--vscode-input-foreground); background: var(--vscode-input-background);
    border: 1px solid var(--vscode-input-border, transparent); border-radius: 2px; outline: none; }
  form.search input:focus { border-color: var(--vscode-focusBorder); }
  form.search input::placeholder { color: var(--vscode-input-placeholderForeground); }
  form.search button { flex: 0 0 auto; padding: 5px 12px; font: inherit; font-weight: 600; letter-spacing: .04em; cursor: pointer;
    color: var(--vscode-button-foreground); background: var(--vscode-button-background);
    border: 1px solid var(--vscode-button-border, transparent); border-radius: 2px; }
  form.search button:hover { background: var(--vscode-button-hoverBackground); }
  a.row { display: flex; align-items: center; gap: 8px; padding: 4px 12px; color: var(--vscode-foreground);
    text-decoration: none; cursor: pointer; }
  a.row:hover { background: var(--vscode-list-hoverBackground); }
  a.row .fa { flex: 0 0 auto; opacity: .85; }
  a.row.sub { padding-left: 20px; }
  a.row.sub .fa { font-size: .5em; opacity: .7; }
  .lbl { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  label.check { display: flex; align-items: center; gap: 8px; padding: 8px 12px; cursor: pointer; user-select: none; }
  label.check input { margin: 0; cursor: pointer; }
</style></head>
<body>
  <div class="top">
    <div class="logo"><img src="${logo}" alt="QB64PE"></div>
    <nav class="quick">${quick}</nav>
  </div>
  <div class="community">${fixed}</div>
  <div class="panes">${panes}</div>
  <div class="footer">
    <label class="check"><input type="checkbox" id="cb"> View Links in Internal Browser</label>
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    for (const a of document.querySelectorAll("a.row")) {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        if (a.dataset.command) vscode.postMessage({ type: "command", command: a.dataset.command });
        else vscode.postMessage({ type: "open", url: a.dataset.url });
      });
    }
    // Panes: open/closed state and sizes (px, used as flex-grow weights) persist.
    // Seeded from the layout the extension saved (survives restarts and the view
    // being closed); the webview's own state wins while it is alive.
    const state = Object.assign({ sizes: {} }, ${layoutJson}, vscode.getState() || {});
    const save = () => {
      vscode.setState(state);
      vscode.postMessage({ type: "layout", layout: state });
    };
    const panes = [...document.querySelectorAll(".pane")];
    const container = document.querySelector(".panes");
    const isOpen = (p) => !p.classList.contains("collapsed");
    const MIN = 80;
    const natural = (p) => p.querySelector(".group-head").offsetHeight + p.querySelector(".group-body").scrollHeight + 1;
    function layout() {
      const open = panes.filter(isOpen);
      const avail = container.clientHeight - panes.filter((p) => !isOpen(p)).reduce((h, p) => h + p.offsetHeight, 0);
      let used = 0;
      open.forEach((p, n) => {
        const g = p.dataset.group;
        // First time a pane opens: its natural height (capped to half the space);
        // the last open pane takes whatever is left. Not while the view is hidden.
        if (!(g in state.sizes) && container.clientHeight > 100) {
          state.sizes[g] = n === open.length - 1 && used < avail
            ? Math.max(MIN, avail - used)
            : Math.max(MIN, Math.min(natural(p), avail / 2));
        }
        const size = state.sizes[g] ?? natural(p);
        used += size;
        p.style.flexGrow = String(size);
      });
      panes.forEach((p, i) => {
        const sash = p.querySelector(".sash");
        const above = panes.slice(0, i).some(isOpen);
        sash.classList.toggle("off", i === 0 || !above || !panes.slice(i).some(isOpen));
      });
    }
    panes.forEach((p, i) => {
      const key = "open:" + p.dataset.group;
      const btn = p.querySelector(".twirl-btn");
      const apply = (open) => { p.classList.toggle("collapsed", !open); btn.setAttribute("aria-expanded", String(open)); };
      apply(key in state ? !!state[key] : p.dataset.default === "open");
      btn.addEventListener("click", () => {
        const open = !isOpen(p);
        apply(open);
        state[key] = open;
        layout();
        save();
      });
      // Drag the top edge: trade height between the nearest open panes above/below.
      const sash = p.querySelector(".sash");
      sash.addEventListener("pointerdown", (e) => {
        const a = panes.slice(0, i).filter(isOpen).pop();
        const b = panes.slice(i).find(isOpen);
        if (!a || !b) return;
        e.preventDefault();
        for (const o of panes.filter(isOpen)) {
          state.sizes[o.dataset.group] = o.getBoundingClientRect().height;
          o.style.flexGrow = String(state.sizes[o.dataset.group]);
        }
        const a0 = state.sizes[a.dataset.group], b0 = state.sizes[b.dataset.group], y0 = e.clientY;
        try { sash.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
        sash.classList.add("active");
        const move = (ev) => {
          const ha = Math.min(Math.max(a0 + ev.clientY - y0, MIN), a0 + b0 - MIN);
          state.sizes[a.dataset.group] = ha;
          state.sizes[b.dataset.group] = a0 + b0 - ha;
          a.style.flexGrow = String(ha);
          b.style.flexGrow = String(a0 + b0 - ha);
        };
        const up = () => {
          sash.classList.remove("active");
          sash.removeEventListener("pointermove", move);
          sash.removeEventListener("pointerup", up);
          sash.removeEventListener("pointercancel", up);
          save();
        };
        sash.addEventListener("pointermove", move);
        sash.addEventListener("pointerup", up);
        sash.addEventListener("pointercancel", up);
      });
    });
    layout();
    window.addEventListener("resize", layout);
    const q = document.getElementById("q");
    document.getElementById("search").addEventListener("submit", (e) => {
      e.preventDefault();
      if (q.value.trim()) vscode.postMessage({ type: "search", query: q.value });
      else q.focus();
    });
    const cb = document.getElementById("cb");
    cb.addEventListener("change", () => vscode.postMessage({ type: "setSimpleBrowser", value: cb.checked }));
    window.addEventListener("message", (e) => { if (e.data?.type === "state") cb.checked = !!e.data.value; });
  </script>
</body></html>`;
  }
}

/**
 * A collapsible, resizable pane: a header whose caret + label toggle the body,
 * plus any `extra` header content (the search box) that stays visible when
 * collapsed, and a sash on its top edge for resizing.
 */
function pane(label: string, initial: "open" | "closed", body: string, extra = ""): string {
  const id = esc(label.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
  const head = `<div class="section-title group-head${extra ? " with-search" : ""}"><button type="button" class="twirl-btn" aria-expanded="${initial === "open"}"><i class="fa fa-caret-right fa-fw twirl" aria-hidden="true"></i>${esc(label)}</button>${extra}</div>`;
  return `<section class="pane group${initial === "closed" ? " collapsed" : ""}" data-group="${id}" data-default="${initial}"><div class="sash" aria-hidden="true"></div>${head}<div class="group-body">${body}</div></section>`;
}

/** The QB64PE editor a quick action should act on: the active one, else a visible one. */
function qb64Editor(): vscode.TextEditor | undefined {
  const isQB64 = (e?: vscode.TextEditor) =>
    !!e && (e.document.languageId === "QB64PE" || /\.(bas|bi|bm|inc)$/i.test(e.document.fileName));
  const active = vscode.window.activeTextEditor;
  return isQB64(active) ? active : vscode.window.visibleTextEditors.find(isQB64);
}

/** Registers the QB64PE panel webview. */
export function registerLinksView(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("qb64pe.main", new MainViewProvider(context))
  );
}
