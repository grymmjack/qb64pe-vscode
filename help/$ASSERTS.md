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


## [\$ASSERTS](\$ASSERTS.md) [📖](https://qb64phoenix.com/qb64wiki/index.php/%24ASSERTS)
---
<blockquote>

### The $ASSERTS metacommand enables debug tests with the _ASSERT macro.

</blockquote>

#### SYNTAX

<blockquote>

`$ASSERTS`

</blockquote>

#### DESCRIPTION

<blockquote>


* This metacommand does not require a comment ' or [REM](REM.md) before it. There is no space between the metacommand name, the colon and the [CONSOLE](CONSOLE.md) parameter.
* If this metacommand is used in a program and any of the set _ASSERT checkpoints will fail, then the program will stop with an _ASSERT failed error.
* Detailed error messages passed to the _ASSERT statement will be displayed in the console window, but only if $ASSERTS:CONSOLE is used.
* The [\$ASSERTS](\$ASSERTS.md) metacommand serves as main switch to enable debug tests during development. Later you just need to remove the metacommand while leaving all the _ASSERT statements in place for later debugging sessions, they are simply ignored without the metacommand.
* In newer versions a precompiler flag named _ASSERTS_ is available (see Availability ):
* The flag is one(1) if the program is compiled with [\$ASSERTS](\$ASSERTS.md) enabled and zero(0) if compiled without it.
* You may use it to include/exclude debugging related code using precompiler [\$IF](\$IF.md) .. [\$ELSE](\$ELSE.md) ... $END [IF](IF.md) blocks.

</blockquote>

#### EXAMPLES

<blockquote>

```vb
$ASSERTS:CONSOLE

DO
   a = INT(RND * 10)
   b$ = myFunc$(a)
   PRINT a, , b$
   _LIMIT 3
LOOP UNTIL _KEYHIT
END

FUNCTION myFunc$ (value AS SINGLE)
   _ASSERT value > 0, "Value cannot be zero"
   _ASSERT value <= 10, "Value cannot exceed 10"

   IF value > 1 THEN plural$ = "s"
   myFunc$ = STRING$(value, "*") + STR$(value) + " star" + plural$ + " :-)"
END FUNCTION
```
  
<br>


</blockquote>

#### SEE ALSO

<blockquote>


* [Metacommand](Metacommand.md)
* _ASSERT
* [\$CHECKING](\$CHECKING.md)
* Relational Operations
* [ERROR](ERROR.md) Codes
</blockquote>
