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

## [VIEW_PRINT](VIEW_PRINT.md) [📖](https://qb64phoenix.com/qb64wiki/index.php/VIEW PRINT)
---
<blockquote>

### The VIEW PRINT statement defines the boundaries of a text viewport PRINT area.

</blockquote>

#### SYNTAX

<blockquote>

`VIEW PRINT [ topRow% TO bottomRow% ]`

</blockquote>

#### PARAMETERS

<blockquote>

*  topRow% and bottomRow% specify the upper and lower rows of the text viewport.
*  If topRow% and bottomRow% are not specified when first used, the text viewport is defined to be the entire screen.

</blockquote>

#### DESCRIPTION

<blockquote>

*  A second [VIEW](VIEW.md)  [PRINT](PRINT.md)  statement without parameters can also disable a viewport when no longer needed.
*  [CLS](CLS.md)  or [CLS](CLS.md)  2 statement will clear the active text viewport area only, and reset the cursor location to topRow% .
*  A [SCREEN](SCREEN.md)  mode change or [RUN](RUN.md)  statement can also clear and disable viewports.
*  After active viewport is disabled, normal screen printing and clearing can begin.
*  Row coordinates may vary when a [WIDTH](WIDTH.md)  statement has been used.
*  Note: QB64 [RUN](RUN.md)  statements will not close [VIEW](VIEW.md)  [PRINT](PRINT.md)  , [VIEW](VIEW.md)  or [WINDOW](WINDOW.md) [VIEW](VIEW.md)  ports presently!


</blockquote>

#### EXAMPLES

<blockquote>



##### Example: Demonstrates how text scrolls within the text viewport.
```vb
' clear the entire screen and show the boundaries of the new text viewport
CLS
PRINT "Start at top..."
LOCATE 9, 1: PRINT "<- row 9 ->"
LOCATE 21, 1: PRINT "<- row 21 ->"

' define new text viewport boundaries
VIEW PRINT 10 TO 20

' print some text that will scroll the text viewport
FOR i = 1 TO 15
PRINT "This is viewport line:"; i
SLEEP 1
NEXT i

' clear only the active text viewport with CLS or CLS 2
CLS
PRINT "After clearing, the cursor location is reset to the top of the text viewport."

' disable the viewport
VIEW PRINT
_DELAY 4
LOCATE 20, 20: PRINT "Print anywhere after view port is disabled"
_DELAY 4
CLS
PRINT "Back to top left after CLS!"
```
  
<br>
</blockquote>

#### SEE ALSO

<blockquote>

*  Featured in our "Keyword of the Day" series
*  [CLS](CLS.md) 
*  [WINDOW](WINDOW.md) 
*  [VIEW](VIEW.md) 
*  [LOCATE](LOCATE.md)  , [PRINT](PRINT.md) 

</blockquote>
