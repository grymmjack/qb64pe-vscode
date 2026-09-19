"use strict";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import * as logFunctions from "./logFunctions";
import * as commonFunctions from "./commonFunctions";

export class TokenInfo {
  private static helpFileCache: Map<string, string> | null = null;
  private static helpFileCachePath: string = "";
  private outputChannel: any = null;
  private readonly lineOfCode: string = "";
  public readonly keyword: string = "";
  public keywordNoPrefix: string = "";
  public readonly token: string = "";
  public offlinehelp: string = "";
  public onlineHelp: string = ""; // Should be read only or have a private setter.
  public WordFormatted: string = ""; // Should be read only or have a private setter.
  public readonly isKeyword: boolean = true;

  constructor(token?: string, lineOfCode?: string, outputChannelToUse?: any) {
    if (!token || token.length < 1) {
      const editor = vscode.window.activeTextEditor;
      let word: string = "";
      word = editor ? editor.document.getText(editor.selection) : "";
      if (word.length > 0) {
        token = word.split(" ")[0];
      } else {
        token = commonFunctions.getQB64Word(editor);
      }
    }

    if (lineOfCode && lineOfCode.length > 0) {
      this.lineOfCode = lineOfCode;
    } else {
      if (vscode.window.activeTextEditor) {
        this.lineOfCode = vscode.window.activeTextEditor.document.lineAt(
          vscode.window.activeTextEditor.selection.active.line,
        ).text;
      }
    }

    if (outputChannelToUse) {
      this.outputChannel = outputChannelToUse;
    } else {
      this.outputChannel = logFunctions.getChannel(
        logFunctions.channelType.help,
      );
    }

    this.token = token;
    this.keyword = token;
    const config: vscode.WorkspaceConfiguration =
      vscode.workspace.getConfiguration("qb64pe");

    let helpPath: string = config.get("helpPath");

    // Keyword detection (and therefore keyword casing in the formatter) hinges
    // on finding a help file for the token. When qb64pe.helpPath is unset or
    // invalid, fall back to the extension's own bundled help/ directory — the
    // same snapshot HelpService uses — so casing works out of the box instead
    // of silently treating every token as a non-keyword. (__dirname is out/;
    // the bundled help/ sits next to it at the extension root.)
    if (!helpPath || !fs.existsSync(helpPath)) {
      const bundled = path.join(__dirname, "..", "help");
      if (fs.existsSync(bundled)) {
        helpPath = bundled;
      }
    }

    // Use case-insensitive lookup
    const helpFile = TokenInfo.findHelpFile(helpPath, this.keyword);
    if (helpFile) {
      this.isKeyword = true;
      this.setHelpToFile(helpFile, config);
      return;
    }

    // If not found with original keyword, try with underscore prefix
    this.keyword = `_${token}`;
    const helpFileWithPrefix = TokenInfo.findHelpFile(helpPath, this.keyword);
    if (helpFileWithPrefix) {
      this.isKeyword = true;
      this.setHelpToFile(helpFileWithPrefix, config);
      return;
    }

    // Not found - reset keyword and mark as not a keyword
    this.keyword = token;
    this.isKeyword = false;
    this.WordFormatted = token;
  }

  /**
   * Builds a case-insensitive cache of help files
   * @param helpPath The help directory path
   */
  private static buildHelpFileCache(helpPath: string): void {
    // Check if cache is already built for this path
    if (TokenInfo.helpFileCache && TokenInfo.helpFileCachePath === helpPath) {
      return;
    }

    TokenInfo.helpFileCache = new Map<string, string>();
    TokenInfo.helpFileCachePath = helpPath;

    try {
      if (fs.existsSync(helpPath)) {
        const files = fs.readdirSync(helpPath);
        for (const file of files) {
          if (file.endsWith(".md") || file.endsWith(".txt")) {
            const nameWithoutExt = file.replace(/\.(md|txt)$/, "");
            // Store with lowercase key for case-insensitive lookup
            TokenInfo.helpFileCache.set(nameWithoutExt.toLowerCase(), file);
          }
        }
      }
    } catch (error) {
      console.error("Error building help file cache:", error);
    }
  }

  /**
   * Finds a help file using case-insensitive lookup
   * @param helpPath The help directory path
   * @param keyword The keyword to search for
   * @returns The full path to the help file if found, null otherwise
   */
  private static findHelpFile(
    helpPath: string,
    keyword: string,
  ): string | null {
    const path = require("path");

    // Build cache if needed
    TokenInfo.buildHelpFileCache(helpPath);

    if (!TokenInfo.helpFileCache) {
      return null;
    }

    // Try various keyword variations
    const variations = [
      keyword,
      keyword.replace(/~?(?:%%|&&|##|[%&!#`])$/, ""), // without a numeric type sigil (count% -> count)
      keyword.substring(1), // without leading underscore
      `${keyword}$`,
      `$${keyword}`,
      `$$${keyword}`,
      `_${keyword}`,
      `_${keyword}$`,
    ];

    for (const variation of variations) {
      const actualFile = TokenInfo.helpFileCache.get(variation.toLowerCase());
      if (actualFile) {
        return path.join(helpPath, actualFile).replaceAll("\\", "/");
      }
    }

    return null;
  }

  /**
   * Sets the properties to a help file.
   * @param helpfile
   */
  private setHelpToFile(
    helpfile: string,
    config: vscode.WorkspaceConfiguration,
  ) {
    this.offlinehelp = helpfile;
    this.onlineHelp = `https://qb64phoenix.com/qb64wiki/index.php?search=${encodeURIComponent(this.keyword)}`;
    this.keywordNoPrefix = this.keyword.startsWith("_")
      ? this.keyword.substring(1)
      : this.keyword;
    this.WordFormatted = this.getWordFormatted(config);
  }

  /**
   * Gets the hovertext to show
   * @returns
   */
  public getHoverText(): string {
    const config: vscode.WorkspaceConfiguration =
      vscode.workspace.getConfiguration("qb64pe");
    let helpPath: string = config.get("helpPath");
    let retvalue = "";
    if (this.isKeyword) {
      if (this.offlinehelp.length > 0) {
        retvalue = fs.readFileSync(this.offlinehelp).toString();
        retvalue = retvalue.replaceAll(
          /\[([\w|\$]*)\]\((([\.|\/|\w|\$])*)\)/gim,
          "[$1](file:" +
            helpPath.replaceAll("\\", "/") +
            "/" +
            this.keywordNoPrefix +
            ".md)",
        );
        //retvalue = retvalue.replaceAll(/\[([\w|\$]*)\]\(([\w|\$]*)\)/igm, '[$1](file:' + helpPath.replaceAll('\\', '/') + '/$1.md)');
      } else {
        retvalue = "Press F1 for help";
      }
    }
    return retvalue;
  }

  /**
   * Opens the help.  Either online or offline
   */
  public showHelp() {
    try {
      const config = vscode.workspace.getConfiguration("qb64pe");
      if (this.offlinehelp.length > 0) {
        if (config.get("isOpenHelpInEditModeEnabled")) {
          logFunctions.writeLine(
            `Open ${this.offlinehelp} in edit mode`,
            this.outputChannel,
          );
          vscode.workspace
            .openTextDocument(this.offlinehelp)
            .then((d) => vscode.window.showTextDocument(d));
        } else {
          logFunctions.writeLine(
            `Open ${this.offlinehelp} in view mode`,
            this.outputChannel,
          );
          vscode.commands.executeCommand(
            "markdown.showPreview",
            vscode.Uri.file(this.offlinehelp),
          );
        }
      } else if (config.get("isOpenOnLineHelpEnabled")) {
        logFunctions.writeLine(
          `Open URL: ${this.onlineHelp} `,
          this.outputChannel,
        );
        vscode.commands.executeCommand(
          "vscode.open",
          vscode.Uri.parse(this.onlineHelp),
        );
      }
    } catch (error) {
      logFunctions.writeLine(`ERROR in showHelp: ${error}`, this.outputChannel);
      vscode.window.showErrorMessage(`"ERROR: ${error}`);
    }
  }

  /**
   * Takes a keyword and makes it match the markdown file.
   */
  private helpify(): string {
    let word = this.keyword.trim().toLowerCase();

    logFunctions.writeLine(`Helpify Before: ${word}`, this.outputChannel);

    if (word == "end") {
      word = "End";
    } else if (
      word == "companyname" ||
      word == "fileversion#" ||
      word == "productversion" ||
      word == "legalcopyright"
    ) {
      word = "$VERSIONINFO";
    } else if (word == "if" || word == "then") {
      word = "IF...THEN";
    } else if (
      this.lineOfCode.trim().toLowerCase().startsWith("for ") ||
      word == "next"
    ) {
      word = "FOR...NEXT";
    } else if (word == "for") {
      word = "FOR-(file-statement)";
    } else if (word == "sub") {
      word = "Sub-(explanatory)";
    } else if (word == "function") {
      word = "Function";
    } else if (word == "select" || word == "case") {
      word = "SELECT-CASE";
    } else if (word == "do" || word == "loop") {
      word = "DO...LOOP";
    } else if (word == "declare" || word == "dynamic" || word == "library") {
      word = "DECLARE-LIBRARY";
    } else if (word == "def" || word == "seg") {
      word = "DEF-SEG";
    }
    logFunctions.writeLine(`After Before: ${word}`, this.outputChannel);
    return word;
  }

  /**
   * Gets the the formatted version of the token
   * @param config WorkspaceConfiguration used to check the user selected formatting settings
   * @returns
   */
  private getWordFormatted(config: vscode.WorkspaceConfiguration) {
    if (!this.isKeyword) {
      return this.token;
    }

    // logFunctions.writeLine(`getWordFormatted: started: "${this.token}" | ${config.get("isFormatMetaCommandsMixedCaseEnabled")}`, this.outputChannel);

    const lowerToken = this.token.toLowerCase();

    if (
      config.get("isFormatMetaCommandsMixedCaseEnabled") &&
      (this.token.startsWith("$") ||
        this.token.startsWith("'$") ||
        lowerToken == "companyname" ||
        lowerToken == "fileversion#" ||
        lowerToken == "productversion" ||
        lowerToken == "legalcopyright")
    ) {
      return this.token
        .replace(/\$CHECKING/i, "$Checking")
        .replace(/CompanyName/i, "CompanyName")
        .replace(/\$CONSOLE/i, "$Console")
        .replace(/\$DYNAMIC/i, "$Dynamic")
        .replace(/\$EXEICON/i, "$ExeIcon")
        .replace(/FileVersion#/i, "FileVersion#")
        .replace(/FILEFLAGSMASK/i, "FileFlagMask")
        .replace(/FILETYPE/i, "FileType")
        .replace(/FILESUBTYPE  /i, "FileSubType")
        .replace(/INCLUDE/i, "Include")
        .replace(/LegalCopyright/i, "LegalCopyright")
        .replace(/ProductVersion/i, "ProductVersion")
        .replace(/\$SCREENHIDE/i, "$ScreenHide")
        .replace(/\$SCREENSHOW/i, "$ScreenShow")
        .replace(/\$STATIC/i, "$Static")
        .replace(/\$VERSIONINFO/i, "$VersionInfo")
        .replace(/\$VIRTUALKEYBOARD/i, "$VirtualKeyboard");
    }

    switch (config.get("formatMode")) {
      case "Lower Case":
        return this.token.toLowerCase();

      case "Upper Case":
        return this.token.toUpperCase();

      case "Mixed Case":
        if (this.token.startsWith("_")) {
          return (
            this.token.substring(0, 2).toUpperCase() +
            this.token.substring(2).toLowerCase()
          );
        } else {
          return (
            this.token.substring(0, 1).toUpperCase() +
            this.token.substring(1).toLowerCase()
          );
        }

      case "No Change":
      default:
        return this.token;
    }
  }
}
