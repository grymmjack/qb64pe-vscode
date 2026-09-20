"use strict";
import * as vscode from "vscode";

/**
 * The QB64PE activity-bar panel — a single webview so the logo sits flush at the
 * top with no collapsible header (a container with one view hides the per-view
 * title bar). Layout: logo (top) · links (Community + Reference) · Articles &
 * Tutorials (own scroller) · a footer checkbox mirroring
 * qb64pe.links.openInSimpleBrowser.
 *
 * To add/rename/reorder entries, edit the data below — that's the whole model.
 */

const WIKI = "https://qb64phoenix.com/qb64wiki/";
/** Wiki page URL from its title (MediaWiki: spaces -> underscores). */
const wiki = (title: string): string => `${WIKI}index.php/${title.replace(/ /g, "_")}`;
/** Wiki page URL from an exact page slug (as it appears in the wiki's href). */
const page = (slug: string): string => `${WIKI}index.php/${slug}`;

interface LinkDef {
  label: string;
  url: string;
  /** Codicon-ish id, mapped to an emoji for the webview. */
  icon?: string;
  tooltip?: string;
}

interface LinkSection {
  label: string;
  links: LinkDef[];
}

export const LINK_SECTIONS: LinkSection[] = [
  {
    label: "Community",
    links: [
      { label: "Homepage", url: "https://qb64phoenix.com", icon: "home" },
      { label: "Forums", url: "https://qb64phoenix.com/forum/index.php", icon: "comments" },
      { label: "Wiki", url: WIKI, icon: "book" },
      { label: "Discord", url: "https://discord.gg/D2M7hepTSx", icon: "gamepad" },
      { label: "Reddit", url: "https://www.reddit.com/r/QB64pe/", icon: "reddit" },
      { label: "Patreon", url: "https://www.patreon.com/user?u=86544769", icon: "handshake-o" },
      { label: "GitHub (QB64PE)", url: "https://github.com/QB64-Phoenix-Edition/QB64pe", icon: "github" },
      { label: "This Extension on Open VSX", url: "https://open-vsx.org/extension/grymmjack/qb64pe", icon: "puzzle-piece" },
    ],
  },
  {
    label: "Reference",
    links: [
      { label: "Wiki Main Page", url: WIKI, icon: "book" },
      { label: "Keyword Reference — Metacommands", url: wiki("Metacommand"), icon: "terminal" },
      { label: "Keyword Reference — Alphabetical", url: wiki("Keyword Reference - Alphabetical"), icon: "list" },
      { label: "Keyword Reference — By Usage", url: wiki("Keyword Reference - By usage"), icon: "list-ol" },
      { label: "Quick Reference — Tables", url: wiki("Quick Reference - Tables"), icon: "table" },
    ],
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

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

class MainViewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;

  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    // Allow both images/ (logo) and media/ (bundled Font Awesome css + fonts).
    view.webview.options = { enableScripts: true, localResourceRoots: [this.extensionUri] };
    view.webview.html = this.html(view.webview);
    view.webview.onDidReceiveMessage((msg) => {
      if (msg?.type === "open" && typeof msg.url === "string") {
        this.open(msg.url);
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
    const inSimpleBrowser = vscode.workspace
      .getConfiguration("qb64pe")
      .get<boolean>(SIMPLE_BROWSER_KEY, false);
    if (inSimpleBrowser) {
      vscode.commands.executeCommand("simpleBrowser.show", url);
    } else {
      vscode.env.openExternal(vscode.Uri.parse(url));
    }
  }

  private postState(): void {
    const value = vscode.workspace.getConfiguration("qb64pe").get<boolean>(SIMPLE_BROWSER_KEY, false);
    this.view?.webview.postMessage({ type: "state", value });
  }

  private row(l: LinkDef): string {
    const icon = l.icon ?? "file-text-o";
    return `<a class="row" href="#" data-url="${esc(l.url)}" title="${esc(l.tooltip ?? l.url)}"><i class="fa fa-${esc(icon)} fa-fw" aria-hidden="true"></i><span class="lbl">${esc(l.label)}</span></a>`;
  }

  private html(webview: vscode.Webview): string {
    const logo = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, "images", "qb64pe.svg"));
    const faCss = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "media", "fontawesome", "css", "font-awesome.min.css")
    );
    const nonce = Array.from({ length: 16 }, () => Math.floor(Math.random() * 36).toString(36)).join("");
    const sections = LINK_SECTIONS.map(
      (s) => `<div class="section-title">${esc(s.label)}</div>${s.links.map((l) => this.row(l)).join("")}`
    ).join("");
    const articles = ARTICLES.map((a) => this.row(a)).join("");

    return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; font-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
<link rel="stylesheet" href="${faCss}">
<style>
  html, body { margin: 0; padding: 0; height: 100%; background: transparent;
    color: var(--vscode-foreground); font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); }
  body { display: flex; flex-direction: column; height: 100vh; }
  .logo { flex: 0 0 auto; display: flex; justify-content: center; padding: 16px; }
  .logo img { max-width: 100%; height: auto; max-height: 120px; }
  .links { flex: 0 0 auto; }
  .articles-title { flex: 0 0 auto; }
  .articles { flex: 1 1 auto; overflow-y: auto; border-top: 1px solid var(--vscode-sideBarSectionHeader-border, rgba(128,128,128,.25)); }
  .footer { flex: 0 0 auto; border-top: 1px solid var(--vscode-sideBarSectionHeader-border, rgba(128,128,128,.25)); }
  .section-title { font-weight: 700; text-transform: uppercase; font-size: 11px; letter-spacing: .04em;
    opacity: .75; padding: 10px 12px 4px; }
  a.row { display: flex; align-items: center; gap: 8px; padding: 4px 12px; color: var(--vscode-foreground);
    text-decoration: none; cursor: pointer; }
  a.row:hover { background: var(--vscode-list-hoverBackground); }
  a.row .fa { flex: 0 0 auto; opacity: .85; }
  .lbl { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  label.check { display: flex; align-items: center; gap: 8px; padding: 8px 12px; cursor: pointer; user-select: none; }
  label.check input { margin: 0; cursor: pointer; }
</style></head>
<body>
  <div class="logo"><img src="${logo}" alt="QB64PE"></div>
  <div class="links">${sections}</div>
  <div class="articles-title section-title">Articles &amp; Tutorials</div>
  <div class="articles">${articles}</div>
  <div class="footer">
    <label class="check"><input type="checkbox" id="cb"> View Links in Internal Browser</label>
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    for (const a of document.querySelectorAll("a.row")) {
      a.addEventListener("click", (e) => { e.preventDefault(); vscode.postMessage({ type: "open", url: a.dataset.url }); });
    }
    const cb = document.getElementById("cb");
    cb.addEventListener("change", () => vscode.postMessage({ type: "setSimpleBrowser", value: cb.checked }));
    window.addEventListener("message", (e) => { if (e.data?.type === "state") cb.checked = !!e.data.value; });
  </script>
</body></html>`;
  }
}

/** Registers the QB64PE panel webview. */
export function registerLinksView(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("qb64pe.main", new MainViewProvider(context.extensionUri))
  );
}
