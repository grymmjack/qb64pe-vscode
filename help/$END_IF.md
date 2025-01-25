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
    margin: 0 0 0.5em 0  !important;
    color: #88f !important;
    border: 0 !important;
    font-style: italic !important;
    font-weight: normal !important;
}
code {
    background: #000 !important;
    margin: 0 !important;
    padding: 8px !important;
    border-radius: 4px !important; 
    border: 1px solid #333 !important;
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
    border-radius: 4px !important;
    background: #000 !important;
    border: 1px solid #333 !important;
    margin: 0 !important;
}
a:link, a:visited, a:hover, a:active {
    color: #ff0 !important;
}
br + pre {
    border-radius: 0 !important;
    border-style: inset !important;
    border-width: 5px !important;
    border-color: #999 !important;
    background-color: #000 !important;
    box-shadow: 0px 10px 3px rgba(0, 0, 0, 0.25) !important;
    margin-top: -1em !important;
}
br + pre::before {
    content: "OUTPUT \A" !important;
    color: #555 !important;
    border-bottom: 1px solid #333;
    font-size: x-small;
    display: block !important;
    padding: 0 3px !important;
    margin: -1em -1em 1em -1em !important;
    -webkit-user-select: none; /* Safari */
    -ms-user-select: none; /* IE 10 and IE 11 */
    user-select: none; /* Standard syntax */    
}
br ~ h5 {
    margin-top: 2em !important;
}
.explanation {
    color: #995 !important;
    /* background-color: rgba(150, 150, 100) !important; */
    border-radius: 10em !important;
    border: 2px #441 dashed !important;
    padding: 8px 32px !important;
    margin-bottom: 4em !important;
    font-size: x-small !important;
}
</style>


## [\$IF](\$IF.md) [📖](https://qb64phoenix.com/qb64wiki/index.php/%24IF)
---
<blockquote>

### $IF is an precompiler metacommand , which determines which sections of code inside its blocks are included into the final code for compliing.

</blockquote>

#### SYNTAX

<blockquote>

`$IF variable [op value] THEN`

</blockquote>

#### PARAMETERS

<blockquote>


* The variable is the name of any preset (see below) or self-defined (see [\$LET](\$LET.md) ) precompiler variable.
* The optional right part must begin with any relational operator followed by the value to compare the variable with, using the given operator.
* The equal (=) operator also allows to check for the special values DEFINED and UNDEFINED .
* Multiple relational compares may be combined using the [AND](AND.md) , [OR](OR.md) , XOR operators as needed.
* Note that the other logic operators are not supported by the precompiler.
</blockquote>

#### DESCRIPTION

<blockquote>


* [\$IF](\$IF.md) is the start of a precompiler code block which includes or excludes sections of code from being compiled.
* There is no single line [\$IF](\$IF.md) statement, it must be used in a valid $IF...THEN...$END [IF](IF.md) block to work properly.
* Like all other metacommands, you can not use more than one metacommand per line. The use of a colon (:) to separate multiple statements in a single line is not allowed.
* Variable names must follow QB64's variable naming conventions. They will be capitalized automatically.
* Values may contain any number of periods to separate numbers or words in a string, e.g. in version numbers such as 3.14.1 or strings like MARY.HAD.A.LITTLE.LAMB etc..
* Note that strings may not contain spaces and must be given without leading/trailing quotes.
* The precompiler comes with some preset values which can be used to help determine which code blocks to include/exclude.  These are:
* WIN or WINDOWS is true(-1) if the user is running QB64 in a Windows environment, it is false(0) otherwise.
* LINUX is true(-1) if the user is running QB64 in a Linux environment, it is false(0) otherwise.
* MAC or MACOSX is true(-1) if the user is running QB64 in a macOS environment, it is false(0) otherwise.
* 32BIT is true(-1) if the user is running a 32-bit version of QB64., it is false(0) otherwise.
* 64BIT is true(-1) if the user is running a 64-bit version of QB64., it is false(0) otherwise.
* VERSION , which is set to the version of the QB64 compiler.
* Some new presets have been introduced with QB64-PE v4.0.0, these are:
* _QB64PE_ is always true(-1) , it indicates the use of the QB64 Phoenix Edition compiler at least v4.0.0
* _ASSERTS_ is one(1) if [\$ASSERTS](\$ASSERTS.md) or $ASSERTS:CONSOLE is used, it is zero(0) otherwise.
* _CONSOLE_ is one(1) if a console is active either by using [\$CONSOLE](\$CONSOLE.md) directly or implied by $ASSERTS:CONSOLE , it is two(2) if $CONSOLE:ONLY is set, it is zero(0) if no console is available (both console variants may appear multiple times in a program, the last found one determines the final state).
* _DEBUG_ is one(1) if [\$DEBUG](\$DEBUG.md) is used, it is zero(0) otherwise.
* _EXPLICIT_ is one(1) if the program uses OPTION _EXPLICIT , it is zero(0) otherwise (note OE also implies OPTION _EXPLICITARRAY ).
* _EXPLICITARRAY_ is one(1) if the program uses OPTION _EXPLICITARRAY or OPTION _EXPLICIT , it is zero(0) otherwise.
* You can check a precompiler variable against special values DEFINED and UNDEFINED , in order to assess whether the variable has already been assigned a value. Useful for code in libraries which may be repeated.
* $END [IF](IF.md) denotes the end of a valid precompiler [\$IF](\$IF.md) block.
* [\$ELSEIF](\$ELSEIF.md) must follow a valid [\$IF](\$IF.md) or [\$ELSEIF](\$ELSEIF.md) block.
* If [\$ELSE](\$ELSE.md) is used, then it must be the last block before $END [IF](IF.md) .  There can be no additional [\$ELSEIF](\$ELSEIF.md) blocks after the [\$ELSE](\$ELSE.md) block.
* Only be one [\$ELSE](\$ELSE.md) block is allowed in an $IF-$ELSEIF-$ELSE-$END [IF](IF.md) construct.

</blockquote>

#### EXAMPLES

<blockquote>



##### Example 1:
```vb
$LET SCREENMODE = 32
$IF SCREENMODE = 0 THEN
   CONST Red = 4
$ELSEIF SCREENMODE = 32 THEN
   CONST Red = _RGB32(255, 0, 0)
$END IF 

COLOR Red
PRINT "Hello World"
```
  
<br>



##### Example 2:
```vb
$IF WIN THEN
   CONST Slash = "\"
$ELSE
   CONST Slash = "/"
$END IF 

PRINT "The proper slash for your operating system is "; Slash
```
  
<br>



##### Example 3:
```vb
$IF VERSION < 1.5 THEN
   $ERROR Requires QB64 version 1.5 or greater
$END IF
```
  
<br>


</blockquote>

#### SEE ALSO

<blockquote>


* [\$LET](\$LET.md)
* [\$ERROR](\$ERROR.md)
* Metacommands
</blockquote>
