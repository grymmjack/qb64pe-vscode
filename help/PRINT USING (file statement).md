<style type="text/css">
body {
    background: #00a !important;
    color: #ccc !important;
}
li {
    list-style-type: square !important;
    color: #ccc !important;
}
li::marker {
    color: #77f !important;
}    
hr {
    border-color: #55f !important;
    border-width: 2px !important;
}
h2 {
    color: #fff !important;
    border: 0 !important;
}
h3 {
    color: #cfc !important;
    border: 0 !important;
}
h4 {
    color: #ccc !important;
    border: 0 !important;
}
h5 {
    margin: 0 0 1em 0  !important;
    color: #88f !important;
    border: 0 !important;
}
code {
    background: #000 !important;
    margin: 0 !important;
    padding: 8px !important;
    border-radius: 8px !important; 
    border: 1px solid #567 !important;
}
pre > code {
    background: transparent !important;
    margin: 0 !important;
    padding: 0 !important;
    border-radius: inherit !important; 
    border: 0 !important;
}
blockquote {
    border: 0 !important;
    background: transparent !important;
    margin: 0 !important;
    padding: 0 1em !important;
}
pre {
    border-radius: 8px !important; 
    border: 1px solid #567 !important;
    margin: 0 !important;
    box-shadow: 0px 5px 0px rgba(0, 0, 0, 0.25) !important;
}
a:link, a:visited, a:hover, a:active {
    color: #ff0 !important;
}

</style>

## [PRINT_USING_(file_statement)](PRINT_USING_(file_statement).md) [📖](https://qb64phoenix.com/qb64wiki/index.php/PRINT USING (file statement))
---
<blockquote>

### The PRINT #, USING statement is used to PRINT formatted text data to a file.

</blockquote>

#### SYNTAX

<blockquote>

`PRINT filenumber%, [ text$ {;|,}] USING template$ ; variable [; ...][{;|,}]`

</blockquote>

#### PARAMETERS

<blockquote>

*  [INTEGER](INTEGER.md)  filenumber refers to the file number OPENed previously followed by a comma .
*  Literal or variable [STRING](STRING.md)  text$ can be placed between [PRINT](PRINT.md)  and [USING](USING.md)  or it can be included in the template .
*  A semicolon or comma may follow the text to stop or tab the [PRINT](PRINT.md)  cursor before the template [PRINT](PRINT.md)  .
*  The literal or variable [STRING](STRING.md)  template should use the template symbols to display each variable type in the list following it.
*  The list of data variables used in the template are separated by semicolons after the template string value.
*  In QB64 ONE semicolon or comma may follow the variable list to stop the print cursor for pending prints. QB only allowed a semicolon.

</blockquote>

#### EXAMPLES

<blockquote>

```vb
Table 5: The formatting symbols used by the [L]PRINT USING[#] commands.
┌───────┬────────────────────────────────────────────────────────────────┐
│   &   │ Prints an entire string value. STRING length should be limited │
│       │ as template width will vary.                                   │
├───────┼────────────────────────────────────────────────────────────────┤
│ \   \ │ Denotes the start and end point of a fixed string area with    │
│       │ spaces between(LEN = spaces + 2).                              │
├───────┼────────────────────────────────────────────────────────────────┤
│   !   │ Prints only the leading character of a string value.           │
├───────┼────────────────────────────────────────────────────────────────┤
│   #   │ Denotes a numerical digit. An appropriate number of digits     │
│       │ should be used for values received.                            │
├───────┼────────────────────────────────────────────────────────────────┤
│ ^^^^  │ After # digits prints numerical value in exponential E+xx      │
│       │ format. Use ^^^^^ for E+xxx values. (1)                        │
├───────┼────────────────────────────────────────────────────────────────┤
│   .   │ Period sets a number's decimal point position. Digits following│
│       │ determine rounded value accuracy.                              │
├───────┼────────────────────────────────────────────────────────────────┤
│  ,.   │ Comma to left of decimal point, prints a comma every 3 used #  │
│       │ digit places left of the decimal point.                        │
├───────┼────────────────────────────────────────────────────────────────┤
│   +   │ Plus sign denotes the position of the number's sign. + or -    │
│       │ will be displayed.                                             │
├───────┼────────────────────────────────────────────────────────────────┤
│   -   │ Minus sign (dash) placed after the number, displays only a     │
│       │ negative value's sign.                                         │
├───────┼────────────────────────────────────────────────────────────────┤
│  $$   │ Prints a dollar sign immediately before the highest non-zero # │
│       │ digit position of the numerical value.                         │
├───────┼────────────────────────────────────────────────────────────────┤
│  **   │ Prints an asterisk in any leading empty spaces of a numerical  │
│       │ value. Adds 2 extra digit positions.                           │
├───────┼────────────────────────────────────────────────────────────────┤
│  **$  │ Combines ** and $$. Negative values will display minus sign to │
│       │ left of $.                                                     │
├───────┼────────────────────────────────────────────────────────────────┤
│   _   │ Underscore preceding a format symbol prints those symbols as   │
│       │ literal string characters.                                     │
└───────┴────────────────────────────────────────────────────────────────┘
Note: Any string character not listed above will be printed as a
literal text character.

(1) Any # decimal point position may be specified. The exponent is
adjusted with significant digits left-justified.
```
  
<br>
</blockquote>

#### SEE ALSO

<blockquote>

*  [PRINT](PRINT.md) [USING](USING.md)  , [PRINT](PRINT.md)  #
*  [LPRINT](LPRINT.md) [USING](USING.md) 

</blockquote>
