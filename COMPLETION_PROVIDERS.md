# QB64PE Completion Providers

This document describes the new completion providers added to the QB64PE VS Code extension.

## CompletionItemProvider

The `CompletionItemProvider` provides intelligent code completion for QB64PE keywords, functions, and user-defined elements.

### Features

- **Comprehensive Keyword Completion**: 500+ QB64PE keywords including all modern underscore-prefixed functions
- **Function Completion**: QB64PE built-in functions with return value indicators and parameter hints
- **Statement Completion**: Control flow and declaration statements
- **Modern QB64PE Support**: Complete coverage of graphics, sound, input, memory, and file I/O functions
- **Context-Aware Suggestions**: Local variables and user-defined subroutines/functions
- **Documentation Integration**: Hover documentation from help files with function descriptions and examples
- **Snippet Completion**: Common code patterns (FOR...NEXT, IF...THEN, etc.)
- **Wiki Integration**: Keywords extracted from the comprehensive QB64PE wiki repository

### Trigger Characters

The completion provider is triggered by:

- `.` (dot) - for member access
- `$` (dollar) - for string functions and metacommands
- `_` (underscore) - for QB64PE-specific functions

### Configuration

The completion provider respects these settings:

- `qb64pe.formatMode`: Controls how keywords are formatted in completions
  - "No Change": Uses original casing
  - "Lower Case": Converts to lowercase
  - "Upper Case": Converts to uppercase
  - "Mixed Case": Uses title case formatting
- `qb64pe.helpPath`: Path to help files for documentation

## InlineCompletionItemProvider

The `InlineCompletionItemProvider` provides intelligent multi-line code completions and common coding patterns.

### Features

- **Pattern-Based Completions**: Detects partial keywords and suggests complete structures
- **Modern QB64PE Templates**: Intelligent patterns for graphics, sound, input, and memory operations
- **Context-Aware Suggestions**: Analyzes surrounding code to suggest relevant completions
- **Game Development Patterns**: Complete game loop templates, input handling, graphics initialization
- **Loop Structure Completion**: Complete FOR...NEXT, DO...LOOP, WHILE...WEND structures
- **Conditional Completion**: Complete IF...THEN...ELSE structures
- **Function/Sub Templates**: Complete SUB and FUNCTION definitions with parameters
- **QB64PE-Specific Idioms**: Modern patterns using underscore-prefixed functions

### Supported Patterns

#### Control Structures

- `for` → `FOR i = 1 TO 10\n    \nNEXT i`
- `if` → `IF condition THEN\n    \nEND IF`
- `do` → `DO\n    \nLOOP`
- `while` → `WHILE condition\n    \nWEND`
- `select` → `SELECT CASE variable\n    CASE value1\n        \n    CASE ELSE\n        \nEND SELECT`

#### Procedure Definitions

- `sub` → `SUB SubName(parameters)\n    \nEND SUB`
- `function` → `FUNCTION FunctionName(parameters) AS DataType\n    \n    FunctionName = returnValue\nEND FUNCTION`

#### Common Operations

- `print` → `PRINT "Hello, World!"`
- `input` → `INPUT "prompt: "; variable`
- `open` → `OPEN "filename" FOR INPUT AS #1`
- `dim` → `DIM variable AS INTEGER`

#### Modern QB64PE Patterns

- `_display` → `_DISPLAY`
- `_limit` → `_LIMIT 60`
- `_loadimage` → `_LOADIMAGE("filename.png")`
- `_newimage` → `_NEWIMAGE(800, 600, 32)`
- `_printstring` → `_PRINTSTRING(x, y, "text")`
- `_putimage` → `_PUTIMAGE (x, y), sourceImage&, destImage&`
- `_mouseinput` → Complete mouse input handling loop
- `_keyhit` → `k& = _KEYHIT` with conditional check
- `_sndopen` → `_SNDOPEN("soundfile.wav")`
- `_memimage` → Memory allocation pattern with `_MEM`

#### Game Development Templates

- `gameloop` → Complete game loop with `_LIMIT`, `_DISPLAY`, and input handling
- `graphics` → Screen initialization for graphics mode with game loop structure

#### Programming Idioms

- `main` → Complete main program loop with \_LIMIT and exit condition
- `graphics` → Screen initialization for graphics mode
- `file read` → Complete file reading pattern with error checking
- `file write` → Complete file writing pattern
- `error` → Error handling pattern with ON ERROR

### Context Analysis

The provider analyzes the current code context to provide relevant suggestions:

- **Loop Context**: Suggests `EXIT FOR`, `CONTINUE FOR` when inside loops
- **Procedure Context**: Suggests `EXIT SUB`, `EXIT FUNCTION` when inside procedures
- **Variable Context**: Suggests assignments for declared variables
- **Indentation Awareness**: Maintains proper code indentation

### Usage

1. Start typing a keyword (e.g., "\_display", "\_mouseinput", "gameloop")
2. The inline completion will show a ghost text preview
3. Press Tab or Enter to accept the completion
4. Use Tab to navigate through placeholder variables in the completion

**Examples:**

```qbasic
' Type "_display" and get:
_DISPLAY

' Type "_mouseinput" and get:
DO WHILE _MOUSEINPUT
    IF _MOUSEBUTTON(1) THEN
        x = _MOUSEX
        y = _MOUSEY
    END IF
LOOP

' Type "gameloop" and get:
DO
    _LIMIT 60

    ' Game logic here

    _DISPLAY
LOOP UNTIL _KEYHIT = 27 ' ESC to exit
```

## Implementation Details

### File Structure

- `src/providers/CompletionItemProvider.ts` - Main completion provider (1,244 lines)
- `src/providers/InlineCompletionItemProvider.ts` - Inline completion provider (496 lines)
- Extensions to `src/logFunctions.ts` - Added logging channels for completion providers

### Integration

Both providers are registered in `src/extension.ts` during extension activation:

```typescript
context.subscriptions.push(
  vscode.languages.registerCompletionItemProvider(
    documentSelector,
    new CompletionItemProvider(),
    ".",
    "$",
    "_"
  )
);

context.subscriptions.push(
  vscode.languages.registerInlineCompletionItemProvider(
    documentSelector,
    new InlineCompletionItemProvider()
  )
);
```

### Dependencies

The completion providers use:

- Existing `TokenInfo` class for keyword information and help file access
- `commonFunctions` for document selectors and word detection
- `logFunctions` for debugging and diagnostic output
- Help files in the extension for documentation
- Comprehensive keyword database extracted from QB64PE wiki repository
- Modern QB64PE function patterns for graphics, sound, input, and memory operations

## Future Enhancements

Potential improvements for the completion providers:

1. **Advanced Semantic Analysis**: Parse QB64PE code to provide more accurate context-aware completions
2. **Library Support**: Include completions for popular QB64PE libraries and includes
3. **Project-Wide Analysis**: Suggest variables and functions from other files in the workspace
4. **Enhanced Parameter Hints**: Show detailed function parameter information and examples during typing
5. **Smart Indentation**: Better automatic indentation handling for complex structures
6. **Performance Optimization**: Cache parsing results and optimize for large codebases
7. **Custom User Snippets**: Allow users to define their own completion patterns and templates
8. **IntelliSense Integration**: Deeper integration with VS Code's IntelliSense features
9. **Code Generation**: Generate boilerplate code for common QB64PE programming patterns
10. **Real-time Syntax Validation**: Provide completion suggestions that help prevent syntax errors

## Troubleshooting

### Completions Not Appearing

1. Check that the file has the correct language ID (QB64PE)
2. Verify the `qb64pe.helpPath` setting points to the help files
3. Check the Output panel (QB64PE: Completion) for error messages

### Inline Completions Not Working

1. Ensure VS Code version supports inline completions (1.68+)
2. Check that inline suggestions are enabled in VS Code settings
3. Look for errors in the Output panel (QB64PE: Inline Completion)

### Performance Issues

1. Large files may cause slower completion response
2. Check the Output panels for any error messages
3. Consider reducing the number of cached completions

## Contributing

To contribute to the completion providers:

1. Fork the repository
2. Create feature branches for new completion patterns
3. Add comprehensive tests for new functionality
4. Update documentation for new features
5. Submit pull requests with detailed descriptions

The completion providers are designed to be extensible - new patterns and completion types can be easily added to the existing framework.
