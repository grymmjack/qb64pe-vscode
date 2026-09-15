"use strict";
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as commonFunctions from "../commonFunctions";
import * as logFunctions from "../logFunctions";
import { TokenInfo } from "../TokenInfo";
import { QB64Symbol } from "../core/symbols";
import { WorkspaceSymbolIndex } from "./WorkspaceSymbolIndex";
import { memberContextAt, symbolsInScope } from "../core/queries";
import { kindLabel, signatureLabel, symbolMarkdown } from "../core/format";

export class CompletionItemProvider implements vscode.CompletionItemProvider {
  private outputChannel = logFunctions.getChannel(
    logFunctions.channelType.completion
  );
  private keywords: string[] = [];
  private keywordCompletions: vscode.CompletionItem[] = [];
  private functionCompletions: vscode.CompletionItem[] = [];
  private statementCompletions: vscode.CompletionItem[] = [];
  private readonly workspaceIndex: WorkspaceSymbolIndex;
  /** Items created from index symbols, for lazy documentation. */
  private readonly symbolOf = new WeakMap<vscode.CompletionItem, QB64Symbol>();

  constructor(workspaceIndex: WorkspaceSymbolIndex) {
    this.workspaceIndex = workspaceIndex;
    this.initializeKeywords();
    this.buildCompletionItems();
  }

  private initializeKeywords() {
    // Extract keywords from syntax highlighting - these are the QB64PE keywords
    this.keywords = [
      // Core QB64PE statements and functions with comprehensive underscore functions
      "ABS",
      "ABSOLUTE",
      "ACCEPTFILEDROP",
      "ACCESS",
      "ACOS",
      "ACOSH",
      "ADLER32",
      "ALIAS",
      "ALL",
      "ALLOWFULLSCREEN",
      "ALPHA",
      "ALPHA32",
      "AND",
      "ANDALSO",
      "ANY",
      "APPEND",
      "AS",
      "ASC",
      "ASIN",
      "ASINH",
      "ASSERT",
      "ATAN2",
      "ATANH",
      "ATN",
      "AUTODISPLAY",
      "AXIS",

      // Background and Color Functions
      "BACKGROUNDCOLOR",
      "BASE",
      "BEEP",
      "BIN$",
      "BINARY",
      "BIT",
      "BLEND",
      "BLINK",
      "BLOAD",
      "BLUE",
      "BLUE32",
      "BSAVE",
      "BUTTON",
      "BUTTONCHANGE",
      "BYTE",
      "BYVAL",
      "CALL",

      // Input and System Functions
      "CAPSLOCK",
      "CASE",
      "CDBL",
      "CEIL",
      "CHAIN",
      "CHDIR",
      "CHR$",
      "CINP",
      "CINT",
      "CIRCLE",
      "CLEAR",
      "CLEARCOLOR",
      "CLIP",
      "CLIPBOARD$",
      "CLIPBOARDIMAGE",
      "CLNG",
      "CLOSE",
      "CLS",
      "COLOR",
      "COLORCHOOSERDIALOG",
      "COM",
      "COMMAND$",
      "COMMANDCOUNT",
      "COMMON",
      "CONNECTED",
      "CONNECTIONADDRESS",
      "CONNECTIONADDRESS$",
      "CONSOLE",
      "CONSOLECURSOR",
      "CONSOLEFONT",
      "CONSOLEINPUT",
      "CONSOLETITLE",
      "CONST",
      "CONTINUE",
      "CONTROLCHR",
      "COPYIMAGE",
      "COPYPALETTE",

      // Math and Trigonometric Functions
      "COS",
      "COSH",
      "COT",
      "COTH",
      "CRC32",
      "CSC",
      "CSCH",
      "CSNG",
      "CSRLIN",
      "CUSTOMTYPE",
      "CV",
      "CVD",
      "CVDMBF",
      "CVI",
      "CVL",
      "CVS",
      "CVSMBF",
      "CWD$",
      "D2G",
      "D2R",
      "DATA",
      "DATE$",
      "DECLARE",
      "DEF",
      "DEFAULTCOLOR",
      "DEFDBL",
      "DEFINE",
      "DEFINT",
      "DEFLATE$",
      "DEFLNG",
      "DEFSNG",
      "DEFSTR",

      // Display and Graphics Functions
      "DELAY",
      "DEPTHBUFFER",
      "DESKTOPHEIGHT",
      "DESKTOPWIDTH",
      "DEST",
      "DEVICE$",
      "DEVICEINPUT",
      "DEVICES",
      "DIM",
      "DIR$",
      "DIREXISTS",
      "DISPLAY",
      "DISPLAYORDER",
      "DO",
      "DONTBLEND",
      "DONTWAIT",
      "DOUBLE",
      "DRAW",
      "DROPPEDFILE",
      "DROPPEDFILE$",
      "DYNAMIC",
      "ECHO",
      "ELSE",
      "ELSEIF",
      "EMBEDDED$",
      "END",
      "ENVIRON",
      "ENVIRON$",
      "ENVIRONCOUNT",
      "EOF",
      "EQV",
      "ERASE",
      "ERDEV",
      "ERDEV$",
      "ERL",
      "ERR",
      "ERROR",
      "ERRORLINE",
      "ERRORMESSAGE$",
      "EVERYCASE",
      "EXIT",
      "EXP",
      "EXPLICIT",
      "EXPLICITARRAY",

      // File I/O Functions
      "FIELD",
      "FILEATTR",
      "FILEEXISTS",
      "FILES",
      "FILES$",
      "FILLBACKGROUND",
      "FINISHDROP",
      "FIX",
      "FLOAT",
      "FOR",

      // Font and Text Functions
      "FPS",
      "FRE",
      "FREE",
      "FREEFILE",
      "FREEFONT",
      "FREEIMAGE",
      "FREETIMER",
      "FULLPATH$",
      "FULLSCREEN",
      "FUNCTION",

      // Graphics and Image Functions
      "G2D",
      "G2R",
      "GET",
      "GOSUB",
      "GOTO",
      "GREEN",
      "GREEN32",
      "HARDWARE",
      "HARDWARE1",
      "HEIGHT",
      "HEX$",
      "HIDE",
      "HYPOT",
      "ICON",
      "IF",
      "IMP",
      "INCLERRORFILE$",
      "INCLERRORLINE",
      "INFLATE$",
      "INKEY$",
      "INP",
      "INPUT",
      "INPUT$",
      "INPUTBOX$",
      "INSTR",
      "INSTRREV",
      "INT",
      "INTEGER",
      "INTEGER64",
      "INTERRUPT",
      "INTERRUPTX",
      "IOCTL",
      "IOCTL$",
      "IS",
      "KEEPBACKGROUND",

      // Keyboard and Input Functions
      "KEY",
      "KEYCLEAR",
      "KEYDOWN",
      "KEYHIT",
      "KILL",
      "LASTAXIS",
      "LASTBUTTON",
      "LASTWHEEL",
      "LBOUND",
      "LCASE$",
      "LEFT$",
      "LEN",
      "LET",
      "LIBRARY",
      "LIMIT",
      "LINE",
      "LIST",
      "LOADFONT",
      "LOADIMAGE",
      "LOC",
      "LOCATE",
      "LOCK",
      "LOF",
      "LOG",
      "LONG",
      "LOOP",
      "LPOS",
      "LPRINT",
      "LSET",
      "LTRIM$",

      // Advanced Graphics Functions
      "MAPTRIANGLE",
      "MAPUNICODE",
      "MD5$",
      "MEM",
      "MEMCOPY",
      "MEMELEMENT",
      "MEMEXISTS",
      "MEMFILL",
      "MEMFREE",
      "MEMGET",
      "MEMIMAGE",
      "MEMNEW",
      "MEMPUT",
      "MEMSOUND",
      "MESSAGEBOX",
      "MID$",
      "MIDDLE",
      "MK$",
      "MKD$",
      "MKDIR",
      "MKDMBF$",
      "MKI$",
      "MKL$",
      "MKS$",
      "MKSMBF$",
      "MOD",

      // Mouse Functions
      "MOUSEBUTTON",
      "MOUSEHIDE",
      "MOUSEINPUT",
      "MOUSEMOVE",
      "MOUSEMOVEMENTX",
      "MOUSEMOVEMENTY",
      "MOUSEPIPEOPEN",
      "MOUSESHOW",
      "MOUSEWHEEL",
      "MOUSEX",
      "MOUSEY",

      // Network and System Functions
      "NAME",
      "NEGATE",
      "NEWIMAGE",
      "NEXT",
      "NONE",
      "NOT",
      "NOTIFYPOPUP",
      "NUMLOCK",
      "OCT$",
      "OFF",
      "OFFSET",
      "ON",
      "ONLY",
      "ONLYBACKGROUND",
      "ONTOP",
      "OPEN",
      "OPENCLIENT",
      "OPENCONNECTION",
      "OPENFILEDIALOG$",
      "OPENHOST",
      "OPTION",
      "OR",
      "ORELSE",
      "OS$",
      "OUT",
      "OUTPUT",

      // Drawing and Palette Functions
      "PAINT",
      "PALETTE",
      "PALETTECOLOR",
      "PCOPY",
      "PEEK",
      "PEN",
      "PI",
      "PIXELSIZE",
      "PLAY",
      "PMAP",
      "POINT",
      "POKE",
      "POS",
      "PRESERVE",
      "PRESET",
      "PRINT",
      "PRINTIMAGE",
      "PRINTMODE",
      "PRINTSTRING",
      "PRINTWIDTH",
      "PSET",
      "PUT",
      "PUTIMAGE",

      // Conversion and Math Functions
      "R2D",
      "R2G",
      "RANDOM",
      "RANDOMIZE",
      "READ",
      "READBIT",
      "READFILE$",
      "RED",
      "RED32",
      "REDIM",
      "RESET",
      "RESETBIT",
      "RESIZE",
      "RESIZEHEIGHT",
      "RESIZEWIDTH",
      "RESTORE",
      "RESUME",
      "RETURN",
      "RGB",
      "RGB32",
      "RGBA",
      "RGBA32",
      "RIGHT$",
      "RMDIR",
      "RND",
      "ROL",
      "ROR",
      "ROUND",
      "RSET",
      "RTRIM$",
      "RUN",

      // File Dialog and Save Functions
      "SADD",
      "SAVEFILEDIALOG$",
      "SAVEIMAGE",
      "SCALEDHEIGHT",
      "SCALEDWIDTH",
      "SCREEN",
      "SCREENCLICK",
      "SCREENEXISTS",
      "SCREENHIDE",
      "SCREENICON",
      "SCREENIMAGE",
      "SCREENMOVE",
      "SCREENPRINT",
      "SCREENSHOW",
      "SCREENX",
      "SCREENY",
      "SCROLLLOCK",
      "SEAMLESS",
      "SEC",
      "SECH",
      "SEEK",
      "SEG",
      "SELECT",
      "SELECTFOLDERDIALOG$",
      "SETALPHA",
      "SETBIT",
      "SETMEM",
      "SGN",
      "SHARED",
      "SHELL",
      "SHELLHIDE",
      "SHL",
      "SHR",
      "SIGNAL",
      "SIN",
      "SINGLE",
      "SINH",
      "SLEEP",
      "SMOOTH",
      "SMOOTHSHRUNK",
      "SMOOTHSTRETCHED",

      // Sound Functions
      "SNDBAL",
      "SNDCLOSE",
      "SNDCOPY",
      "SNDGETPOS",
      "SNDLEN",
      "SNDLIMIT",
      "SNDLOOP",
      "SNDNEW",
      "SNDOPEN",
      "SNDOPENRAW",
      "SNDPAUSE",
      "SNDPAUSED",
      "SNDPLAY",
      "SNDPLAYCOPY",
      "SNDPLAYFILE",
      "SNDPLAYING",
      "SNDRATE",
      "SNDRAW",
      "SNDRAWDONE",
      "SNDRAWLEN",
      "SNDSETPOS",
      "SNDSTOP",
      "SNDVOL",
      "SOFTWARE",
      "SOUND",
      "SOURCE",
      "SPACE$",
      "SPC",
      "SQR",
      "SQUAREPIXELS",
      "STARTDIR$",
      "STATIC",
      "STATUSCODE",
      "STEP",
      "STICK",
      "STOP",
      "STR$",
      "STRCMP",
      "STRETCH",
      "STRICMP",
      "STRIG",
      "STRING",
      "STRING$",
      "SUB",
      "SWAP",
      "SYSTEM",

      // Text and String Functions
      "TAB",
      "TAN",
      "TANH",
      "THEN",
      "TIME$",
      "TIMER",
      "TITLE",
      "TITLE$",
      "TO",
      "TOGGLE",
      "TOGGLEBIT",
      "TOTALDROPPEDFILES",
      "TRIM$",
      "TROFF",
      "TRON",
      "TYPE",
      "UBOUND",
      "UCASE$",
      "UCHARPOS",
      "UEVENT",
      "UFONTHEIGHT",
      "ULINESPACING",
      "UNLOCK",
      "UNSIGNED",
      "UNTIL",
      "UPRINTSTRING",
      "UPRINTWIDTH",
      "USING",
      "VAL",
      "VARPTR",
      "VARPTR$",
      "VARSEG",
      "VIEW",
      "WAIT",
      "WEND",
      "WHEEL",
      "WHILE",
      "WIDTH",
      "WINDOW",
      "WINDOWHANDLE",
      "WINDOWHASFOCUS",
      "WRITE",
      "WRITEFILE",
      "XOR",

      // Underscore-prefixed QB64PE functions from wiki repository
      "_ACCEPTFILEDROP",
      "_ADLER32",
      "_ALLOWFULLSCREEN",
      "_ALPHA",
      "_ALPHA32",
      "_ANDALSO",
      "_ANTICLOCKWISE",
      "_ASSERT",
      "_AUTODISPLAY",
      "_AXIS",
      "_BACKGROUNDCOLOR",
      "_BEHIND",
      "_BIN$",
      "_BIT",
      "_BLEND",
      "_BLINK",
      "_BLUE",
      "_BLUE32",
      "_BUTTON",
      "_BUTTONCHANGE",
      "_BYTE",
      "_CAPSLOCK",
      "_CEIL",
      "_CLEARCOLOR",
      "_CLIP",
      "_CLIPBOARD$",
      "_CLIPBOARDIMAGE",
      "_CLOCKWISE",
      "_COLORCHOOSERDIALOG$",
      "_COMMANDCOUNT",
      "_CONNECTED",
      "_CONNECTIONADDRESS",
      "_CONNECTIONADDRESS$",
      "_CONSOLE",
      "_CONSOLECURSOR",
      "_CONSOLEFONT",
      "_CONSOLEINPUT",
      "_CONSOLETITLE",
      "_CONTINUE",
      "_CONTROLCHR",
      "_COPYIMAGE",
      "_COPYPALETTE",
      "_CRC32",
      "_CWD$",
      "_CV",
      "_D2G",
      "_D2R",
      "_DEFAULTCOLOR",
      "_DEFLATE$",
      "_DELAY",
      "_DEPTHBUFFER",
      "_DESKTOPHEIGHT",
      "_DESKTOPWIDTH",
      "_DEST",
      "_DEVICE$",
      "_DEVICEINPUT",
      "_DEVICES",
      "_DIR$",
      "_DIREXISTS",
      "_DISPLAY",
      "_DISPLAYORDER",
      "_DONTBLEND",
      "_DONTWAIT",
      "_DROPPEDFILE",
      "_DROPPEDFILE$",
      "_ECHO",
      "_EMBEDDED$",
      "_ENVIRON$",
      "_ENVIRONCOUNT",
      "_ERRORLINE",
      "_ERRORMESSAGE$",
      "_EXPLICIT",
      "_EXPLICITARRAY",
      "_FILEEXISTS",
      "_FILES$",
      "_FILLBACKGROUND",
      "_FINISHDROP",
      "_FONT",
      "_FONTHEIGHT",
      "_FONTWIDTH",
      "_FPS",
      "_FREE",
      "_FREEFILE",
      "_FREEFONT",
      "_FREEIMAGE",
      "_FREETIMER",
      "_FULLPATH$",
      "_FULLSCREEN",
      "_G2D",
      "_G2R",
      "_GREEN",
      "_GREEN32",
      "_HARDWARE",
      "_HARDWARE1",
      "_HEIGHT",
      "_HIDE",
      "_HYPOT",
      "_ICON",
      "_INCLERRORFILE$",
      "_INCLERRORLINE",
      "_INFLATE$",
      "_INPUTBOX$",
      "_INSTRREV",
      "_INTEGER64",
      "_KEEPBACKGROUND",
      "_KEYCLEAR",
      "_KEYDOWN",
      "_KEYHIT",
      "_LASTAXIS",
      "_LASTBUTTON",
      "_LASTWHEEL",
      "_LIMIT",
      "_LOADFONT",
      "_LOADIMAGE",
      "_MAPUNICODE",
      "_MD5$",
      "_MEM",
      "_MEMCOPY",
      "_MEMELEMENT",
      "_MEMEXISTS",
      "_MEMFILL",
      "_MEMFREE",
      "_MEMGET",
      "_MEMIMAGE",
      "_MEMNEW",
      "_MEMPUT",
      "_MEMSOUND",
      "_MESSAGEBOX",
      "_MIDDLE",
      "_MOUSEBUTTON",
      "_MOUSEHIDE",
      "_MOUSEINPUT",
      "_MOUSEMOVE",
      "_MOUSEMOVEMENTX",
      "_MOUSEMOVEMENTY",
      "_MOUSEPIPEOPEN",
      "_MOUSESHOW",
      "_MOUSEWHEEL",
      "_MOUSEX",
      "_MOUSEY",
      "_NEGATE",
      "_NEWIMAGE",
      "_NONE",
      "_NOTIFYPOPUP",
      "_NUMLOCK",
      "_OFFSET",
      "_ONLY",
      "_ONLYBACKGROUND",
      "_ONTOP",
      "_OPENCLIENT",
      "_OPENCONNECTION",
      "_OPENFILEDIALOG$",
      "_OPENHOST",
      "_ORELSE",
      "_OS$",
      "_PALETTECOLOR",
      "_PI",
      "_PIXELSIZE",
      "_PRINTIMAGE",
      "_PRINTMODE",
      "_PRINTSTRING",
      "_PRINTWIDTH",
      "_PUTIMAGE",
      "_R2D",
      "_R2G",
      "_READBIT",
      "_READFILE$",
      "_RED",
      "_RED32",
      "_RESETBIT",
      "_RESIZE",
      "_RESIZEHEIGHT",
      "_RESIZEWIDTH",
      "_RGB",
      "_RGB32",
      "_RGBA",
      "_RGBA32",
      "_ROL",
      "_ROR",
      "_ROUND",
      "_SAVEFILEDIALOG$",
      "_SAVEIMAGE",
      "_SCALEDHEIGHT",
      "_SCALEDWIDTH",
      "_SCREEN",
      "_SCREENCLICK",
      "_SCREENEXISTS",
      "_SCREENHIDE",
      "_SCREENICON",
      "_SCREENIMAGE",
      "_SCREENMOVE",
      "_SCREENPRINT",
      "_SCREENSHOW",
      "_SCREENX",
      "_SCREENY",
      "_SCROLLLOCK",
      "_SEC",
      "_SECH",
      "_SELECTFOLDERDIALOG$",
      "_SETALPHA",
      "_SETBIT",
      "_SETMEM",
      "_SHELLHIDE",
      "_SHL",
      "_SHR",
      "_SIGNAL",
      "_SINH",
      "_SMOOTH",
      "_SMOOTHSHRUNK",
      "_SMOOTHSTRETCHED",
      "_SNDBAL",
      "_SNDCLOSE",
      "_SNDCOPY",
      "_SNDGETPOS",
      "_SNDLEN",
      "_SNDLIMIT",
      "_SNDLOOP",
      "_SNDNEW",
      "_SNDOPEN",
      "_SNDOPENRAW",
      "_SNDPAUSE",
      "_SNDPAUSED",
      "_SNDPLAY",
      "_SNDPLAYCOPY",
      "_SNDPLAYFILE",
      "_SNDPLAYING",
      "_SNDRATE",
      "_SNDRAW",
      "_SNDRAWDONE",
      "_SNDRAWLEN",
      "_SNDSETPOS",
      "_SNDSTOP",
      "_SNDVOL",
      "_SOFTWARE",
      "_SOURCE",
      "_SQUAREPIXELS",
      "_STARTDIR$",
      "_STATUSCODE",
      "_STRCMP",
      "_STRETCH",
      "_STRICMP",
      "_TITLE",
      "_TITLE$",
      "_TOGGLE",
      "_TOGGLEBIT",
      "_TOTALDROPPEDFILES",
      "_TRIM$",
      "_UCASE$",
      "_UCHARPOS",
      "_UEVENT",
      "_UFONTHEIGHT",
      "_ULINESPACING",
      "_UNSIGNED",
      "_UPRINTSTRING",
      "_UPRINTWIDTH",
      "_WHEEL",
      "_WIDTH",
      "_WINDOWHANDLE",
      "_WINDOWHASFOCUS",
      "_WRITEFILE",

      // Metacommands
      "$ASSERTS",
      "$CHECKING",
      "$COLOR",
      "$CONSOLE",
      "$DEBUG",
      "$DYNAMIC",
      "$ELSE",
      "$ELSEIF",
      "$EMBED",
      "$END",
      "$ERROR",
      "$EXEICON",
      "$IF",
      "$INCLUDE",
      "$INCLUDEONCE",
      "$LET",
      "$MIDISOUNDFONT",
      "$NOPREFIX",
      "$RESIZE",
      "$SCREENHIDE",
      "$SCREENSHOW",
      "$STATIC",
      "$UNSTABLE",
      "$VERSIONINFO",
      "$VIRTUALKEYBOARD",
    ];
  }

  private buildCompletionItems() {
    const config = vscode.workspace.getConfiguration("qb64pe");

    for (const keyword of this.keywords) {
      const item = new vscode.CompletionItem(
        keyword,
        vscode.CompletionItemKind.Keyword
      );
      item.sortText = "5_" + keyword; // after user symbols (0_..2_)

      // Set the formatted version based on user preferences
      const tokenInfo = new TokenInfo(keyword, "", this.outputChannel);
      if (tokenInfo.isKeyword) {
        item.insertText = tokenInfo.WordFormatted;
      } else {
        item.insertText = this.formatKeyword(keyword, config);
      }

      // Documentation comes from the help files lazily, in resolveCompletionItem.

      // Categorize based on keyword type
      if (this.isFunctionKeyword(keyword)) {
        item.kind = vscode.CompletionItemKind.Function;
        this.functionCompletions.push(item);
      } else if (this.isStatementKeyword(keyword)) {
        item.kind = vscode.CompletionItemKind.Keyword;
        this.statementCompletions.push(item);
      } else {
        this.keywordCompletions.push(item);
      }
    }

    // Add common snippets as completion items
    this.addSnippetCompletions();
  }

  private formatKeyword(
    keyword: string,
    config: vscode.WorkspaceConfiguration
  ): string {
    switch (config.get("formatMode")) {
      case "Lower Case":
        return keyword.toLowerCase();
      case "Upper Case":
        return keyword.toUpperCase();
      case "Mixed Case":
        if (keyword.startsWith("$")) {
          return keyword;
        } else if (keyword.startsWith("_")) {
          return (
            keyword.substring(0, 2).toUpperCase() +
            keyword.substring(2).toLowerCase()
          );
        } else {
          return (
            keyword.substring(0, 1).toUpperCase() +
            keyword.substring(1).toLowerCase()
          );
        }
      case "No Change":
      default:
        return keyword;
    }
  }

  private getKeywordDocumentation(
    keyword: string
  ): vscode.MarkdownString | undefined {
    try {
      const config = vscode.workspace.getConfiguration("qb64pe");
      const helpPath: string = config.get("helpPath") || "";

      if (!helpPath) return undefined;

      // Try various filename variations to find help file
      const possibleFiles = [
        `${keyword}.md`,
        `${keyword.toUpperCase()}.md`,
        `${keyword.toLowerCase()}.md`,
        `${keyword.toUpperCase()}$.md`,
        `_${keyword.toUpperCase()}.md`,
        `$${keyword.toUpperCase()}.md`,
      ];

      for (const fileName of possibleFiles) {
        const helpFile = path.join(helpPath, fileName);
        if (fs.existsSync(helpFile)) {
          try {
            const content = fs.readFileSync(helpFile, "utf8");
            // Extract first few lines for documentation preview
            const lines = content.split("\n").slice(0, 10);
            const preview = lines.join("\n");

            const markdown = new vscode.MarkdownString(preview);
            markdown.isTrusted = true;
            return markdown;
          } catch (error) {
            logFunctions.writeLine(
              `Error reading help file ${helpFile}: ${error}`,
              this.outputChannel
            );
          }
        }
      }
    } catch (error) {
      logFunctions.writeLine(
        `Error getting documentation for ${keyword}: ${error}`,
        this.outputChannel
      );
    }

    return undefined;
  }

  private isFunctionKeyword(keyword: string): boolean {
    // These keywords are functions that return values
    const functions = [
      "ABS",
      "ASC",
      "ACOS",
      "ACOSH",
      "ASIN",
      "ASINH",
      "ATAN2",
      "ATANH",
      "ATN",
      "CHR$",
      "COS",
      "COSH",
      "SIN",
      "SINH",
      "TAN",
      "TANH",
      "SQR",
      "INT",
      "FIX",
      "RND",
      "VAL",
      "STR$",
      "LEFT$",
      "RIGHT$",
      "MID$",
      "LEN",
      "INSTR",
      "UCASE$",
      "LCASE$",
      "TRIM$",
      "LTRIM$",
      "RTRIM$",
      "SPACE$",
      "STRING$",
      "HEX$",
      "OCT$",
      "BIN$",
      "RGB",
      "RGB32",
      "RED",
      "GREEN",
      "BLUE",
      "ALPHA",
      "POINT",
      "PEEK",
      "INP",
      "LOC",
      "LOF",
      "EOF",
      "INKEY$",
      "INPUT$",
      "TIMER",
      "DATE$",
      "TIME$",
      "SCREEN",
      "CSRLIN",
      "POS",
      "LPOS",
      "FREEFILE",
      "ERR",
      "ERL",
      "ENVIRON$",
      "COMMAND$",
      "DIR$",
      "CURDIR$",
      "CWD$",
      "VARPTR",
      "VARSEG",
      "FRE",
    ];
    return functions.includes(keyword.toUpperCase());
  }

  private isStatementKeyword(keyword: string): boolean {
    // These are statement keywords
    const statements = [
      "PRINT",
      "INPUT",
      "DIM",
      "FOR",
      "NEXT",
      "IF",
      "THEN",
      "ELSE",
      "ELSEIF",
      "END",
      "SUB",
      "FUNCTION",
      "CALL",
      "GOSUB",
      "GOTO",
      "RETURN",
      "DO",
      "LOOP",
      "WHILE",
      "WEND",
      "SELECT",
      "CASE",
      "EXIT",
      "STOP",
      "RUN",
      "CHAIN",
      "SYSTEM",
      "CLS",
      "LOCATE",
      "COLOR",
      "PSET",
      "LINE",
      "CIRCLE",
      "PAINT",
      "GET",
      "PUT",
      "LOAD",
      "SAVE",
      "OPEN",
      "CLOSE",
      "READ",
      "WRITE",
      "DATA",
      "RESTORE",
      "ON",
      "RESUME",
      "ERROR",
      "DEF",
      "DECLARE",
      "SHARED",
      "STATIC",
      "CONST",
      "TYPE",
      "REDIM",
    ];
    return statements.includes(keyword.toUpperCase());
  }

  private addSnippetCompletions() {
    // Add common code snippets as completion items
    const snippets = [
      {
        label: "FOR...NEXT",
        insertText: new vscode.SnippetString(
          "FOR ${1:i} = ${2:1} TO ${3:10}\n\t$0\nNEXT ${1:i}"
        ),
        documentation: "FOR...NEXT loop structure",
      },
      {
        label: "IF...THEN...ELSE",
        insertText: new vscode.SnippetString(
          "IF ${1:condition} THEN\n\t$2\nELSE\n\t$3\nEND IF"
        ),
        documentation: "IF...THEN...ELSE conditional structure",
      },
      {
        label: "DO...LOOP",
        insertText: new vscode.SnippetString("DO\n\t$0\nLOOP"),
        documentation: "DO...LOOP structure",
      },
      {
        label: "WHILE...WEND",
        insertText: new vscode.SnippetString(
          "WHILE ${1:condition}\n\t$0\nWEND"
        ),
        documentation: "WHILE...WEND loop structure",
      },
      {
        label: "SELECT CASE",
        insertText: new vscode.SnippetString(
          "SELECT CASE ${1:variable}\n\tCASE ${2:value1}\n\t\t$3\n\tCASE ${4:value2}\n\t\t$5\n\tCASE ELSE\n\t\t$0\nEND SELECT"
        ),
        documentation: "SELECT CASE structure",
      },
      {
        label: "SUB",
        insertText: new vscode.SnippetString(
          "SUB ${1:SubName}(${2:parameters})\n\t$0\nEND SUB"
        ),
        documentation: "SUB procedure",
      },
      {
        label: "FUNCTION",
        insertText: new vscode.SnippetString(
          "FUNCTION ${1:FunctionName}(${2:parameters}) AS ${3:DataType}\n\t$0\n\t${1:FunctionName} = ${4:returnValue}\nEND FUNCTION"
        ),
        documentation: "FUNCTION procedure",
      },
    ];

    for (const snippet of snippets) {
      const item = new vscode.CompletionItem(
        snippet.label,
        vscode.CompletionItemKind.Snippet
      );
      item.sortText = "6_" + snippet.label; // below keywords
      item.insertText = snippet.insertText;
      item.documentation = new vscode.MarkdownString(snippet.documentation);
      this.keywordCompletions.push(item);
    }
  }

  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): Promise<vscode.CompletionItem[] | vscode.CompletionList> {
    try {
      this.workspaceIndex.ensureDocument(document);
      const key = this.workspaceIndex.keyOf(document);

      // `owner.` / `owner.pre|` completes with the owner's TYPE fields only.
      const member = memberContextAt(this.workspaceIndex.index, key, position);
      if (member) {
        const prefix = member.prefix.toLowerCase();
        return member.members
          .filter((f) => f.name.toLowerCase().startsWith(prefix))
          .map((f, i) => {
            const item = this.createCompletionFromSymbol(f, document)!;
            item.sortText = String(i).padStart(3, "0"); // declaration order
            return item;
          });
      }

      // User symbols first so they win over same-named built-ins when
      // de-duplicating. The list is complete (isIncomplete = false): VS Code
      // filters and fuzzy-matches client-side as the user keeps typing.
      const completions = this.removeDuplicateCompletions([
        ...this.getUserDefinedCompletions(document, position),
        ...this.keywordCompletions,
        ...this.functionCompletions,
        ...this.statementCompletions,
      ]);
      logFunctions.writeLine(
        `Returning ${completions.length} completions`,
        this.outputChannel
      );
      return new vscode.CompletionList(completions, false);
    } catch (error) {
      logFunctions.writeLine(
        `Error in provideCompletionItems: ${error}`,
        this.outputChannel
      );
      return [];
    }
  }

  resolveCompletionItem(
    item: vscode.CompletionItem,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.CompletionItem> {
    const symbol = this.symbolOf.get(item);
    if (symbol) {
      item.documentation = new vscode.MarkdownString(symbolMarkdown(symbol));
      return item;
    }
    // Add additional details when the item is selected
    if (
      item.kind === vscode.CompletionItemKind.Keyword ||
      item.kind === vscode.CompletionItemKind.Function
    ) {
      const keyword = item.label.toString();
      if (!item.documentation) {
        item.documentation = this.getKeywordDocumentation(keyword);
      }
    }

    return item;
  }

  private getUserDefinedCompletions(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] {
    const completions: vscode.CompletionItem[] = [];
    try {
      // Everything visible here (already de-duplicated by name, nearest scope
      // first): params/locals of the enclosing routine, then this file, its
      // includes and the rest of the compilation unit.
      for (const symbol of symbolsInScope(
        this.workspaceIndex.index,
        this.workspaceIndex.keyOf(document),
        position.line
      )) {
        const completion = this.createCompletionFromSymbol(symbol, document);
        if (completion) completions.push(completion);
      }
    } catch (error) {
      logFunctions.writeLine(
        `Error getting user-defined completions: ${error}`,
        this.outputChannel
      );
    }
    return completions;
  }

  private createCompletionFromSymbol(
    symbol: QB64Symbol,
    document: vscode.TextDocument
  ): vscode.CompletionItem | null {
    const completion = new vscode.CompletionItem(symbol.name);

    switch (symbol.type) {
      case "SUB":
        completion.kind = vscode.CompletionItemKind.Method;
        completion.detail = signatureLabel(symbol);
        completion.insertText = this.createSubSnippet(symbol);
        break;

      case "FUNCTION":
        completion.kind = vscode.CompletionItemKind.Function;
        completion.detail = signatureLabel(symbol);
        completion.insertText = this.createFunctionSnippet(symbol);
        break;

      case "VARIABLE":
        completion.kind = vscode.CompletionItemKind.Variable;
        completion.detail = `${symbol.dataType || "SINGLE"} (${kindLabel(symbol)}${
          symbol.isArray ? ", array" : ""
        })`;
        break;

      case "TYPE":
        completion.kind = vscode.CompletionItemKind.Struct;
        completion.detail = "User-defined type";
        break;

      case "CONST":
        completion.kind = vscode.CompletionItemKind.Constant;
        completion.detail = symbol.value
          ? `CONST ${symbol.name} = ${symbol.value}`
          : "User-defined constant";
        break;

      case "FIELD":
        completion.kind = vscode.CompletionItemKind.Field;
        completion.detail = `${symbol.dataType ?? ""}${symbol.isArray ? "()" : ""} (field of ${symbol.parent})`.trim();
        break;

      default:
        return null;
    }
    this.symbolOf.set(completion, symbol); // documentation is rendered lazily

    // Add scope indicator for sorting
    if (symbol.scope === "LOCAL") {
      completion.sortText = "0_" + symbol.name; // Higher priority
    } else if (symbol.scope === "MODULE") {
      completion.sortText = "1_" + symbol.name;
    } else {
      completion.sortText = "2_" + symbol.name; // Lower priority
    }

    return completion;
  }

  private formatSubSignature(symbol: QB64Symbol): string {
    const params =
      symbol.parameters
        ?.map((p) => `${p.name}${p.type ? ` AS ${p.type}` : ""}`)
        .join(", ") || "";

    return `SUB ${symbol.name}(${params})`;
  }

  private formatFunctionSignature(symbol: QB64Symbol): string {
    const params =
      symbol.parameters
        ?.map((p) => `${p.name}${p.type ? ` AS ${p.type}` : ""}`)
        .join(", ") || "";

    return `FUNCTION ${symbol.name}(${params})${
      symbol.dataType ? ` AS ${symbol.dataType}` : ""
    }`;
  }

  private createSubSnippet(symbol: QB64Symbol): vscode.SnippetString {
    if (!symbol.parameters || symbol.parameters.length === 0) {
      return new vscode.SnippetString(`${symbol.name}`);
    }

    const params = symbol.parameters
      .map((p, i) => `\${${i + 1}:${p.name}}`)
      .join(", ");
    return new vscode.SnippetString(`${symbol.name}(${params})`);
  }

  private createFunctionSnippet(symbol: QB64Symbol): vscode.SnippetString {
    if (!symbol.parameters || symbol.parameters.length === 0) {
      return new vscode.SnippetString(`${symbol.name}`);
    }

    const params = symbol.parameters
      .map((p, i) => `\${${i + 1}:${p.name}}`)
      .join(", ");
    return new vscode.SnippetString(`${symbol.name}(${params})`);
  }

  private removeDuplicateCompletions(
    completions: vscode.CompletionItem[]
  ): vscode.CompletionItem[] {
    const seen = new Set<string>();
    return completions.filter((item) => {
      const key = item.label.toString().toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }


}
