# QB64PE (Phoenix Edition) for Visual Studio Code

A VSCode extension that adds support for [QB64 PE](https://www.qb64phoenix.com).

> This fork was created with permission from LordDurus to enhance and extend the vscode extension to support QB64PE.

## Get it from open-vsx.org
> https://open-vsx.org/extension/grymmjack/qb64pe

## Features

- **Intelligent Code Completion**: Comprehensive autocomplete with 500+ QB64PE keywords including all modern underscore-prefixed functions
- **Inline Code Templates**: Smart multi-line completions for game loops, graphics setup, input handling, and more
- **Modern QB64PE Support**: Full support for graphics (`_NEWIMAGE`, `_DISPLAY`), sound (`_SNDOPEN`), input (`_MOUSEINPUT`), and memory functions
- Utilize `F1` to _open help_ via the QB64PE Wiki
- Ctrl+F1 to _open keyword list alphabetical_
- Shift+F1 to _open keyword list by usage_
- Go to Definition `F12`
- `F12` to _follow_ (open) an Include file
- `F5` to Build & Run
- `ctrl+shift+b` to build the current file
- Syntax highlighting for QB64PE (up to the latest version)
- Code outline (`CTRL+F2`)
- Code folding
- Build Only
- Highlights TODOs in the comments
- Box around (\_)rgb(32) commands the color of the command.
- `ctrl+alt+l` to run the lint - this is experimental. Please report any issues.
- Enhanced Snippets for modern QB64PE development

## Code Completion Features

The QB64PE extension now includes powerful completion providers that enhance your development experience:

### CompletionItemProvider

- **500+ Keywords**: Complete database of QB64PE keywords including all modern functions
- **Context-Aware Suggestions**: Intelligent filtering based on current code context
- **Modern Function Support**: Full support for underscore-prefixed functions:
  - Graphics: `_NEWIMAGE`, `_DISPLAY`, `_PUTIMAGE`, `_LOADIMAGE`
  - Sound: `_SNDOPEN`, `_SNDPLAY`, `_SNDVOL`, `_SNDLEN`
  - Input: `_MOUSEINPUT`, `_MOUSEX`, `_MOUSEY`, `_KEYHIT`
  - Memory: `_MEM`, `_MEMGET`, `_MEMPUT`, `_MEMFREE`
- **Detailed Documentation**: Hover information and usage examples for each keyword
- **Smart Filtering**: Automatic filtering based on function categories and context

### InlineCompletionItemProvider

- **Multi-line Templates**: Complete code patterns for common QB64PE tasks
- **Game Development Patterns**: Ready-to-use templates for:
  - Game loops with input handling
  - Graphics initialization sequences
  - Sound system setup
  - Sprite and animation frameworks
- **Modern QB64PE Patterns**: Templates using current best practices and modern functions
- **Context-Sensitive**: Suggests appropriate patterns based on current code structure

### Usage

Simply start typing any QB64PE keyword or pattern, and the completion providers will offer intelligent suggestions. Use `Ctrl+Space` to manually trigger completions, or let the automatic triggers help you as you type.

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
