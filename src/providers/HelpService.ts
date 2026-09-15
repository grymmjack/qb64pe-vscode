"use strict";
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import * as logFunctions from "../logFunctions";
import {
  displayTitle,
  wikitextToMarkdown,
} from "../core/wikitext";
import {
  helpKeys,
  keywordFromHelpFileName,
  lookupVariants,
} from "../core/helpFiles";

export interface HoverHelp {
  markdown: string;
  /** Base for relative links/images in the markdown. */
  baseUri: vscode.Uri;
}

/**
 * Keyword hover/F1 help. Prefers live conversion of the user's *installed*
 * QB64PE wiki source (`<installPath>/internal/help/*.txt`), converted on
 * demand and cached (in memory + on disk, keyed by the source file's mtime so
 * it only re-converts when QB64PE itself updates). Falls back to the bundled
 * `help/*.md` snapshot (via TokenInfo) when no install help is available.
 */
export class HelpService {
  private index: Map<string, string> | null = null; // lookup key -> abs .txt path
  private indexedDir: string | null = null;
  private bundledIndex: Map<string, string> | null = null; // UPPER filename -> abs .md path
  private readonly memCache = new Map<string, { mtimeMs: number; markdown: string }>();
  private style: string | null = null;
  private readonly cacheDir: string;
  private readonly outputChannel = logFunctions.getChannel(
    logFunctions.channelType.help
  );

  constructor(private readonly context: vscode.ExtensionContext) {
    this.cacheDir = path.join(context.globalStorageUri.fsPath, "help-cache");
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (
          e.affectsConfiguration("qb64pe.installPath") ||
          e.affectsConfiguration("qb64pe.helpPath") ||
          e.affectsConfiguration("qb64pe.isLiveHelpEnabled")
        ) {
          this.index = null;
          this.indexedDir = null;
          this.memCache.clear();
        }
      })
    );
  }

  /** Hover markdown for a keyword, live if possible, else bundled, else null. */
  getHoverHelp(token: string, lineOfCode?: string): HoverHelp | null {
    const live = this.getLiveMarkdown(token);
    if (live) return live;

    return this.getBundledMarkdown(token);
  }

  /**
   * The bundled help/*.md snapshot, read from the extension's own directory so
   * it works regardless of the qb64pe.helpPath setting. These files already
   * carry the style header.
   */
  private getBundledMarkdown(token: string): HoverHelp | null {
    const dir = path.join(this.context.extensionPath, "help");
    const index = this.ensureBundledIndex(dir);
    for (const variant of lookupVariants(token)) {
      const file = index.get(variant) ?? index.get(variant + "$");
      if (file) {
        try {
          return {
            markdown: fs.readFileSync(file, "utf8"),
            baseUri: vscode.Uri.file(dir + path.sep),
          };
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  private ensureBundledIndex(dir: string): Map<string, string> {
    if (this.bundledIndex) return this.bundledIndex;
    const index = new Map<string, string>();
    try {
      for (const name of fs.readdirSync(dir)) {
        if (!name.toLowerCase().endsWith(".md")) continue;
        index.set(name.slice(0, -3).toUpperCase(), path.join(dir, name));
      }
    } catch (error) {
      logFunctions.writeLine(
        `Failed to index bundled help ${dir}: ${error}`,
        this.outputChannel
      );
    }
    this.bundledIndex = index;
    return index;
  }

  private getLiveMarkdown(token: string): HoverHelp | null {
    if (!this.isLiveEnabled()) return null;
    const dir = this.helpDir();
    if (!dir) return null;
    const index = this.ensureIndex(dir);
    for (const variant of lookupVariants(token)) {
      const file = index.get(variant);
      if (file) {
        try {
          return {
            markdown: this.convertCached(file),
            baseUri: vscode.Uri.file(dir + path.sep),
          };
        } catch (error) {
          logFunctions.writeLine(
            `Live help conversion failed for ${file}: ${error}`,
            this.outputChannel
          );
          return null;
        }
      }
    }
    return null;
  }

  private isLiveEnabled(): boolean {
    return vscode.workspace
      .getConfiguration("qb64pe")
      .get<boolean>("isLiveHelpEnabled", true);
  }

  /** The QB64PE install's MediaWiki help directory, or null. */
  private helpDir(): string | null {
    const config = vscode.workspace.getConfiguration("qb64pe");
    const candidates: string[] = [];
    const installPath = config.get<string>("installPath", "");
    if (installPath) candidates.push(path.join(installPath, "internal", "help"));
    const helpPath = config.get<string>("helpPath", "");
    if (helpPath) candidates.push(helpPath);
    for (const dir of candidates) {
      try {
        if (fs.existsSync(dir) && fs.readdirSync(dir).some((f) => f.endsWith(".txt"))) {
          return dir;
        }
      } catch {
        // ignore unreadable candidate
      }
    }
    return null;
  }

  private ensureIndex(dir: string): Map<string, string> {
    if (this.index && this.indexedDir === dir) return this.index;
    const index = new Map<string, string>();
    try {
      for (const name of fs.readdirSync(dir)) {
        if (!name.toLowerCase().endsWith(".txt")) continue;
        const keyword = keywordFromHelpFileName(name);
        if (!keyword) continue;
        const full = path.join(dir, name);
        for (const key of helpKeys(keyword)) {
          if (!index.has(key)) index.set(key, full);
        }
      }
    } catch (error) {
      logFunctions.writeLine(
        `Failed to index help dir ${dir}: ${error}`,
        this.outputChannel
      );
    }
    logFunctions.writeLine(
      `Indexed ${index.size} help keys from ${dir}`,
      this.outputChannel
    );
    this.index = index;
    this.indexedDir = dir;
    return index;
  }

  private convertCached(file: string): string {
    const mtimeMs = fs.statSync(file).mtimeMs;
    const mem = this.memCache.get(file);
    if (mem && mem.mtimeMs === mtimeMs) return mem.markdown;

    const diskPath = this.cachePath(file, mtimeMs);
    let markdown: string | null = this.readDisk(diskPath);
    if (markdown === null) {
      const wikitext = fs.readFileSync(file, "utf8");
      const title =
        displayTitle(wikitext) ??
        keywordFromHelpFileName(path.basename(file)) ??
        path.basename(file, ".txt");
      markdown = this.styleHeader() + wikitextToMarkdown(wikitext, { title });
      this.writeDisk(diskPath, markdown);
    }
    this.memCache.set(file, { mtimeMs, markdown });
    return markdown;
  }

  private cachePath(file: string, mtimeMs: number): string {
    const hash = crypto
      .createHash("sha1")
      .update(file + "\0" + Math.round(mtimeMs))
      .digest("hex");
    return path.join(this.cacheDir, hash + ".md");
  }

  private readDisk(diskPath: string): string | null {
    try {
      return fs.readFileSync(diskPath, "utf8");
    } catch {
      return null;
    }
  }

  private writeDisk(diskPath: string, markdown: string): void {
    try {
      fs.mkdirSync(this.cacheDir, { recursive: true });
      fs.writeFileSync(diskPath, markdown, "utf8");
    } catch (error) {
      logFunctions.writeLine(
        `Could not write help cache ${diskPath}: ${error}`,
        this.outputChannel
      );
    }
  }

  /** The shared `<style>` block, read once from the bundled asset. */
  private styleHeader(): string {
    if (this.style !== null) return this.style;
    let css = "";
    try {
      css = fs.readFileSync(
        path.join(this.context.extensionPath, "media", "hover.css"),
        "utf8"
      );
    } catch {
      css = "";
    }
    this.style = css ? `<style type="text/css">\n${css}\n</style>\n\n` : "";
    return this.style;
  }
}
