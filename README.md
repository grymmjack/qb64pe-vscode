# QB64PE (Phoenix Edition) for Visual Studio Code

A VSCode extension that adds support for [QB64 PE](https://www.qb64phoenix.com).

> This fork was created with permission from LordDurus to enhance and extend the vscode extension to support QB64PE.

## Get it from open-vsx.org
> https://open-vsx.org/extension/grymmjack/qb64pe

## Features

* Utilize `F1` to *open help* via the QB64PE Wiki
* Ctrl+F1 to *open keyword list alphabetical*
* Shift+F1 to *open keyword list by usage*
* Go to Definition `F12`
* `F12` to *follow* (open) an Include file
* `F5` to Build & Run
* `ctrl+shift+b` to build the current file
* Syntax highlighting for QB64PE (up to the latest version)
* Code outline (`CTRL+F2`)
* Code folding
* Build Only
* Highlights TODOs in the comments
* Box around (_)rgb(32) commands the color of the command.
* `ctrl+alt+l` to run the lint - this is experimental.  Please report any issues.
* Snippets
  - ifelse
  - ifthen
  - sub
  - func
  - type
  - for

## Requirements

* [QB64 PE](https://www.qb64phoenix.com) installed.
* Latest *vsix* installed from [here](https://github.com/grymmjack/qb64pe-vscode/tree/main/releases).

## Get Started Writing QB64PE with VS Code

* [Wiki](https://qb64phoenix.com/qb64wiki)

## Found a Bug?

Please utilize the [Issues](https://github.com/grymmjack/qb64pe-vscode/issues) and file a new one.

## License

The VS Code for QB64PE extension is subject to these license terms. The source code to this extension is available on https://github.com/grymmjack/qb64pe-vscode and licensed under the [MIT license](https://github.com/grymmjack/qb64pe-vscode/blob/main/LICENSE).

## Acknowledgments

* This QB64PE (Phoenix Edition) version of the vscode extension is based on work completed by [Lord Durus](https://github.com/grymmjack/qb64pe-vscode/commits?author=LordDurus).
* Extensions Highlighting: based on: https://github.com/sorucoder/freebasic-vscode-extension
* Syntax coloring is based on: https://github.com/microsoft/vscode/blob/main/extensions/vb/syntaxes/asp-vb-net.tmlanguage.json
* OutLine based on: https://github.com/svaberg/SWMF-grammar
* The snippets came from https://github.com/microsoft/vscode/blob/main/extensions/vb/snippets/vb.code-snippets
   - They have been edited for QB64
* Followed for Decorations: https://vscode.rocks/decorations/
* The todo list icon came from: https://www.iconfinder.com/search?q=todo&price=free&style=outline&license=gte__1
* I just straight up stole the core of F5 anything and baked it in to get F5 working with out external extensions
  - https://github.com/discretegames/f5anything
* To get an absolute from a relative is used code based off of https://www.geeksforgeeks.org/convert-relative-path-url-to-absolute-path-url-using-javascript/
