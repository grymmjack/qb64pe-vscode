"use strict";
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as commonFunctions from "../commonFunctions";
import * as logFunctions from "../logFunctions";
import { TokenInfo } from "../TokenInfo";

export class InlineCompletionItemProvider
  implements vscode.InlineCompletionItemProvider
{
  private outputChannel = logFunctions.getChannel(
    logFunctions.channelType.inlineCompletion
  );
  private codePatterns: Map<string, string[]> = new Map();

  constructor() {
    this.initializeCodePatterns();
  }

  private initializeCodePatterns() {
    // Define common QB64PE code patterns for intelligent completion
    this.codePatterns.set("for", [
      "FOR i = 1 TO 10\n    \nNEXT i",
      "FOR ${1:i} = ${2:1} TO ${3:10} STEP ${4:1}\n    $0\nNEXT ${1:i}",
      "FOR ${1:i} = ${2:10} TO ${3:1} STEP -1\n    $0\nNEXT ${1:i}",
    ]);

    this.codePatterns.set("if", [
      "IF ${1:condition} THEN\n    $0\nEND IF",
      "IF ${1:condition} THEN\n    $2\nELSE\n    $3\nEND IF",
      "IF ${1:condition} THEN ${2:statement}",
    ]);

    this.codePatterns.set("do", [
      "DO\n    $0\nLOOP",
      "DO WHILE ${1:condition}\n    $0\nLOOP",
      "DO\n    $0\nLOOP WHILE ${1:condition}",
      "DO UNTIL ${1:condition}\n    $0\nLOOP",
    ]);

    this.codePatterns.set("while", ["WHILE ${1:condition}\n    $0\nWEND"]);

    this.codePatterns.set("select", [
      "SELECT CASE ${1:variable}\n    CASE ${2:value1}\n        $3\n    CASE ${4:value2}\n        $5\n    CASE ELSE\n        $0\nEND SELECT",
    ]);

    this.codePatterns.set("sub", [
      "SUB ${1:SubName}(${2:parameters})\n    $0\nEND SUB",
    ]);

    this.codePatterns.set("function", [
      "FUNCTION ${1:FunctionName}(${2:parameters}) AS ${3:INTEGER}\n    $0\n    ${1:FunctionName} = ${4:returnValue}\nEND FUNCTION",
    ]);

    this.codePatterns.set("type", [
      "TYPE ${1:TypeName}\n    ${2:member1} AS ${3:INTEGER}\n    ${4:member2} AS ${5:STRING}\nEND TYPE",
    ]);

    this.codePatterns.set("dim", [
      "DIM ${1:variable} AS ${2:INTEGER}",
      "DIM ${1:array}(${2:1} TO ${3:10}) AS ${4:INTEGER}",
      "DIM SHARED ${1:variable} AS ${2:INTEGER}",
    ]);

    this.codePatterns.set("print", [
      'PRINT "${1:Hello, World!}"',
      "PRINT ${1:variable}",
      'PRINT "${1:text}"; ${2:variable}',
      'PRINT USING "${1:format}"; ${2:variable}',
    ]);

    this.codePatterns.set("input", [
      'INPUT "${1:prompt}: "; ${2:variable}',
      "INPUT ${1:variable}",
      'LINE INPUT "${1:prompt}: "; ${2:variable}',
    ]);

    this.codePatterns.set("open", [
      'OPEN "${1:filename}" FOR ${2:INPUT} AS #${3:1}',
      'OPEN "${1:filename}" FOR ${2:OUTPUT} AS #${3:1}',
      'OPEN "${1:filename}" FOR ${2:APPEND} AS #${3:1}',
      'OPEN "${1:filename}" FOR ${2:BINARY} AS #${3:1}',
    ]);

    this.codePatterns.set("screen", [
      "SCREEN ${1:0}",
      "SCREEN ${1:12}",
      "_NEWIMAGE(${1:800}, ${2:600}, ${3:32})",
    ]);

    this.codePatterns.set("color", [
      "COLOR ${1:15}, ${2:0}",
      "_RGB(${1:255}, ${2:255}, ${3:255})",
      "_RGB32(${1:255}, ${2:255}, ${3:255})",
      "_RGBA(${1:255}, ${2:255}, ${3:255}, ${4:255})",
      "_RGBA32(${1:255}, ${2:255}, ${3:255}, ${4:255})",
    ]);

    // New QB64PE-specific patterns with underscore functions
    this.codePatterns.set("_display", [
      "_DISPLAY",
      "_AUTODISPLAY ${1:_ON}",
      "_LIMIT ${1:60}\n_DISPLAY",
    ]);

    this.codePatterns.set("_limit", ["_LIMIT ${1:60}", "_LIMIT ${1:30}"]);

    this.codePatterns.set("_loadimage", [
      '_LOADIMAGE("${1:filename.png}")',
      '_LOADIMAGE("${1:filename.png}", ${2:32})',
    ]);

    this.codePatterns.set("_newimage", [
      "_NEWIMAGE(${1:800}, ${2:600}, ${3:32})",
      "_NEWIMAGE(${1:320}, ${2:240}, ${3:256})",
    ]);

    this.codePatterns.set("_printstring", [
      '_PRINTSTRING(${1:x}, ${2:y}, "${3:text}")',
      "_PRINTSTRING(${1:x}, ${2:y}, ${3:text$})",
    ]);

    this.codePatterns.set("_putimage", [
      "_PUTIMAGE (${1:x}, ${2:y}), ${3:sourceImage&}, ${4:destImage&}",
      "_PUTIMAGE (${1:x1}, ${2:y1})-(${3:x2}, ${4:y2}), ${5:sourceImage&}",
    ]);

    this.codePatterns.set("_font", [
      "_FONT ${1:fontHandle&}",
      '_LOADFONT("${1:fontfile.ttf}", ${2:16})',
    ]);

    this.codePatterns.set("_mouseinput", [
      "DO WHILE _MOUSEINPUT\n    IF _MOUSEBUTTON(1) THEN\n        x = _MOUSEX\n        y = _MOUSEY\n    END IF\nLOOP",
    ]);

    this.codePatterns.set("_keyhit", [
      "k& = _KEYHIT\nIF k& <> 0 THEN\n    PRINT k&\nEND IF",
    ]);

    this.codePatterns.set("_sndopen", [
      '_SNDOPEN("${1:soundfile.wav}")',
      '_SNDOPEN("${1:soundfile.mp3}")',
    ]);

    this.codePatterns.set("_memimage", [
      "DIM m AS _MEM\nm = _MEMIMAGE(${1:imageHandle&})",
      "_MEMGET m, m.OFFSET + ${1:offset}, ${2:variable}",
    ]);

    this.codePatterns.set("_clipboard", [
      '_CLIPBOARD$ = "${1:text}"',
      "text$ = _CLIPBOARD$",
    ]);

    this.codePatterns.set("_screenimage", [
      "img& = _SCREENIMAGE",
      "_SCREENIMAGE(${1:x1}, ${2:y1}, ${3:x2}, ${4:y2})",
    ]);

    this.codePatterns.set("gameloop", [
      "DO\n    _LIMIT ${1:60}\n    \n    ' Game logic here\n    \n    _DISPLAY\nLOOP UNTIL _KEYHIT = 27 ' ESC to exit",
    ]);

    this.codePatterns.set("graphics", [
      'SCREEN _NEWIMAGE(${1:800}, ${2:600}, ${3:32})\n_TITLE "${4:My Program}"\n\nDO\n    _LIMIT ${5:60}\n    \n    CLS\n    \n    \' Graphics code here\n    \n    _DISPLAY\nLOOP UNTIL _KEYHIT = 27',
    ]);
  }

  async provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken
  ): Promise<
    vscode.InlineCompletionItem[] | vscode.InlineCompletionList | null
  > {
    try {
      // Get current line and context
      const line = document.lineAt(position);
      const lineText = line.text.substring(0, position.character);
      const trimmedLine = lineText.trim().toLowerCase();

      logFunctions.writeLine(
        `Inline completion requested for: "${trimmedLine}"`,
        this.outputChannel
      );

      // Don't provide completions inside comments or strings
      if (this.isInCommentOrString(document, position)) {
        return null;
      }

      const completions: vscode.InlineCompletionItem[] = [];

      // Pattern-based completions
      const patternCompletions = this.getPatternCompletions(
        trimmedLine,
        position
      );
      completions.push(...patternCompletions);

      // Context-aware completions
      const contextCompletions = await this.getContextAwareCompletions(
        document,
        position,
        trimmedLine
      );
      completions.push(...contextCompletions);

      // Common QB64PE idioms
      const idiomCompletions = this.getIdiomCompletions(trimmedLine, position);
      completions.push(...idiomCompletions);

      return completions.length > 0 ? completions : null;
    } catch (error) {
      logFunctions.writeLine(
        `Error in provideInlineCompletionItems: ${error}`,
        this.outputChannel
      );
      return null;
    }
  }

  private isInCommentOrString(
    document: vscode.TextDocument,
    position: vscode.Position
  ): boolean {
    const line = document.lineAt(position).text;
    const beforeCursor = line.substring(0, position.character);

    // Check if we're in a comment
    const commentIndex = beforeCursor.search(/[']/);
    if (commentIndex !== -1 && commentIndex < position.character) {
      return true;
    }

    // Check if we're in a string
    const quotes = beforeCursor.match(/"/g);
    if (quotes && quotes.length % 2 === 1) {
      return true;
    }

    return false;
  }

  private getPatternCompletions(
    trimmedLine: string,
    position: vscode.Position
  ): vscode.InlineCompletionItem[] {
    const completions: vscode.InlineCompletionItem[] = [];

    // Check if the current line matches any pattern
    for (const [pattern, templates] of this.codePatterns) {
      if (trimmedLine.startsWith(pattern)) {
        for (const template of templates) {
          const completion = new vscode.InlineCompletionItem(
            template,
            new vscode.Range(position, position)
          );
          completions.push(completion);
        }
        break; // Only suggest for the first matching pattern
      }
    }

    return completions;
  }

  private async getContextAwareCompletions(
    document: vscode.TextDocument,
    position: vscode.Position,
    trimmedLine: string
  ): Promise<vscode.InlineCompletionItem[]> {
    const completions: vscode.InlineCompletionItem[] = [];

    try {
      // Analyze surrounding context
      const context = this.analyzeContext(document, position);

      // Suggest complementary statements
      if (context.isInLoop && trimmedLine === "") {
        completions.push(
          new vscode.InlineCompletionItem(
            "EXIT FOR",
            new vscode.Range(position, position)
          )
        );

        completions.push(
          new vscode.InlineCompletionItem(
            "CONTINUE FOR",
            new vscode.Range(position, position)
          )
        );
      }

      if (context.isInSub && trimmedLine === "") {
        completions.push(
          new vscode.InlineCompletionItem(
            "EXIT SUB",
            new vscode.Range(position, position)
          )
        );
      }

      if (context.isInFunction && trimmedLine === "") {
        completions.push(
          new vscode.InlineCompletionItem(
            "EXIT FUNCTION",
            new vscode.Range(position, position)
          )
        );
      }

      // Variable assignments based on declarations
      if (context.variables.length > 0 && trimmedLine === "") {
        for (const variable of context.variables.slice(0, 5)) {
          // Limit to 5 suggestions
          completions.push(
            new vscode.InlineCompletionItem(
              `${variable.name} = `,
              new vscode.Range(position, position)
            )
          );
        }
      }
    } catch (error) {
      logFunctions.writeLine(
        `Error in getContextAwareCompletions: ${error}`,
        this.outputChannel
      );
    }

    return completions;
  }

  private getIdiomCompletions(
    trimmedLine: string,
    position: vscode.Position
  ): vscode.InlineCompletionItem[] {
    const completions: vscode.InlineCompletionItem[] = [];

    // Common QB64PE idioms and patterns
    const idioms = [
      {
        trigger: "cls",
        completion: 'CLS\nPRINT "${1:Program Title}"\nPRINT',
      },
      {
        trigger: "main",
        completion:
          "DO\n    ${1:' Main program loop}\n    _LIMIT 60\nLOOP UNTIL _KEYDOWN(27) ' ESC to exit",
      },
      {
        trigger: "graphics",
        completion:
          'SCREEN _NEWIMAGE(${1:800}, ${2:600}, 32)\n_TITLE "${3:My Program}"',
      },
      {
        trigger: "file read",
        completion:
          'IF _FILEEXISTS("${1:filename.txt}") THEN\n    OPEN "${1:filename.txt}" FOR INPUT AS #1\n    DO UNTIL EOF(1)\n        LINE INPUT #1, ${2:line$}\n        ${3:\' Process line}\n    LOOP\n    CLOSE #1\nELSE\n    PRINT "File not found"\nEND IF',
      },
      {
        trigger: "file write",
        completion:
          'OPEN "${1:output.txt}" FOR OUTPUT AS #1\nPRINT #1, "${2:data}"\nCLOSE #1',
      },
      {
        trigger: "error",
        completion:
          'ON ERROR GOTO ${1:ErrorHandler}\n${2:\' Your code here}\nEXIT\n\n${1:ErrorHandler}:\nPRINT "Error:"; ERR; "at line"; ERL\nRESUME NEXT',
      },
    ];

    for (const idiom of idioms) {
      if (
        trimmedLine.includes(idiom.trigger) ||
        trimmedLine.startsWith(idiom.trigger.split(" ")[0])
      ) {
        completions.push(
          new vscode.InlineCompletionItem(
            idiom.completion,
            new vscode.Range(position, position)
          )
        );
      }
    }

    return completions;
  }

  private analyzeContext(
    document: vscode.TextDocument,
    position: vscode.Position
  ): {
    isInLoop: boolean;
    isInSub: boolean;
    isInFunction: boolean;
    isInType: boolean;
    variables: Array<{ name: string; type: string }>;
    currentIndentation: string;
  } {
    const context = {
      isInLoop: false,
      isInSub: false,
      isInFunction: false,
      isInType: false,
      variables: [] as Array<{ name: string; type: string }>,
      currentIndentation: "",
    };

    try {
      const text = document.getText();
      const lines = text.split("\n");
      const currentLine = position.line;

      // Analyze preceding lines for context
      for (let i = currentLine - 1; i >= 0; i--) {
        const line = lines[i].trim().toLowerCase();

        // Check for loop constructs
        if (line.startsWith("for ") && !context.isInLoop) {
          context.isInLoop = true;
        }
        if (line === "next" || line.startsWith("next ")) {
          context.isInLoop = false;
        }

        if (line.startsWith("do") && !context.isInLoop) {
          context.isInLoop = true;
        }
        if (line === "loop" || line.startsWith("loop ")) {
          context.isInLoop = false;
        }

        if (line.startsWith("while ") && !context.isInLoop) {
          context.isInLoop = true;
        }
        if (line === "wend") {
          context.isInLoop = false;
        }

        // Check for sub/function context
        if (line.startsWith("sub ")) {
          context.isInSub = true;
          break;
        }
        if (line.startsWith("function ")) {
          context.isInFunction = true;
          break;
        }
        if (line.startsWith("type ")) {
          context.isInType = true;
          break;
        }

        if (
          line === "end sub" ||
          line === "end function" ||
          line === "end type"
        ) {
          break;
        }

        // Collect variable declarations
        const dimMatch = line.match(
          /^dim\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+as\s+([a-zA-Z_][a-zA-Z0-9_]*)/
        );
        if (dimMatch) {
          context.variables.push({
            name: dimMatch[1],
            type: dimMatch[2],
          });
        }
      }

      // Get current indentation
      const currentLineText = lines[currentLine];
      const indentMatch = currentLineText.match(/^(\s*)/);
      if (indentMatch) {
        context.currentIndentation = indentMatch[1];
      }
    } catch (error) {
      logFunctions.writeLine(
        `Error analyzing context: ${error}`,
        this.outputChannel
      );
    }

    return context;
  }
}
