# QB64PE (Phoenix Edition) for Visual Studio Code

A VSCode extension that adds support for [QB64 PE](https://www.qb64phoenix.com).

> This fork was created with permission from LordDurus to enhance and extend the vscode extension to support QB64PE.

## Get it from open-vsx.org
> https://open-vsx.org/extension/grymmjack/qb64pe

## Features

- **Language intelligence** powered by a workspace-wide symbol index that follows `$INCLUDE` chains and understands QB64PE scope (locals, parameters, `SHARED`, module level, TYPE members):
  - Go to Definition (`F12`) — including TYPE fields (`p.pos.x`), labels, `DECLARE LIBRARY` routines, and `'$INCLUDE:'…'` / `$EXEICON:'…'` files
  - Find All References / Peek References across every file of the program (never matches inside comments or strings)
  - Rename Symbol (`F2`) across the program, keeping your type sigils honest
  - Highlight occurrences of the symbol under the cursor (reads vs writes)
  - Outline & breadcrumbs with real hierarchy: routines → parameters and locals, TYPEs → fields, includes, labels
  - Go to Symbol in Workspace (`Ctrl+T`)
  - Block-aware code folding (SUB/FUNCTION, TYPE, IF, SELECT, DO, FOR, WHILE, `$IF`, comment blocks)
  - Semantic highlighting of user-defined routines, types, variables, parameters, fields and labels
- **Intelligent Code Completion**: 500+ QB64PE keywords (all modern underscore-prefixed functions) plus everything you defined that is in scope — ranked first — and **member completion** (`variable.` lists the fields of its TYPE)
- **Hover & signature help** for your own SUBs/FUNCTIONs (declaration, doc comments, parameters, return type, TYPE members) and for built-in keywords via the offline wiki
- **Inline Code Templates**: multi-line completions for game loops, graphics setup, input handling, and more
- `F1` to _open help_ via the QB64PE Wiki; `Ctrl+F1` keyword list alphabetical; `Shift+F1` keyword list by usage
- `F5` to Build & Run, `ctrl+shift+b` to build the current file
- Syntax highlighting for QB64PE (up to the latest version)
- Highlights TODOs in the comments (own view in the Explorer)
- Box around (\_)rgb(32) commands the color of the command
- `ctrl+alt+l` to run the lint (compiler diagnostics) — experimental, please report issues
- Enhanced snippets for modern QB64PE development

### Documenting your own code

Comment lines directly above a `SUB`, `FUNCTION`, `TYPE` or `CONST` become its hover/completion documentation, and `' @param name description` lines document parameters:

```QB64PE
' Moves the player and returns the new x position.
' @param p the player record
' @param dx horizontal delta
FUNCTION MovePlayer% (p AS Player, dx AS INTEGER)
```

## Requirements

- [QB64 PE](https://www.qb64phoenix.com) installed.
- Latest _vsix_ installed from [here](https://github.com/grymmjack/qb64pe-vscode/tree/main/releases).

## Get Started Writing QB64PE with VS Code

- [Wiki](https://qb64phoenix.com/qb64wiki)

## Found a Bug?

Please utilize the [Issues](https://github.com/grymmjack/qb64pe-vscode/issues) and file a new one.

## License

The VS Code for QB64PE extension is subject to these license terms. The source code to this extension is available on https://github.com/grymmjack/qb64pe-vscode and licensed under the [MIT license](https://github.com/grymmjack/qb64pe-vscode/blob/main/LICENSE).

## Acknowledgments

- This QB64PE (Phoenix Edition) version of the vscode extension is based on work completed by [Lord Durus](https://github.com/grymmjack/qb64pe-vscode/commits?author=LordDurus).
- Extensions Highlighting: based on: https://github.com/sorucoder/freebasic-vscode-extension
- Syntax coloring is based on: https://github.com/microsoft/vscode/blob/main/extensions/vb/syntaxes/asp-vb-net.tmlanguage.json
- OutLine based on: https://github.com/svaberg/SWMF-grammar
- The snippets came from https://github.com/microsoft/vscode/blob/main/extensions/vb/snippets/vb.code-snippets
  - They have been edited for QB64
- Followed for Decorations: https://vscode.rocks/decorations/
- The todo list icon came from: https://www.iconfinder.com/search?q=todo&price=free&style=outline&license=gte__1
- I just straight up stole the core of F5 anything and baked it in to get F5 working with out external extensions
  - https://github.com/discretegames/f5anything
- To get an absolute from a relative is used code based off of https://www.geeksforgeeks.org/convert-relative-path-url-to-absolute-path-url-using-javascript/
