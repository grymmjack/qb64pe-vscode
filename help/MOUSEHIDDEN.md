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


## [_MOUSEHIDDEN](MOUSEHIDDEN.md) [📖](https://qb64phoenix.com/qb64wiki/index.php/_MOUSEHIDDEN)
---
<blockquote>

### The _MOUSEHIDDEN function returns a boolean value according to the current mouse cursor state (hidden or visible).

</blockquote>

#### SYNTAX

<blockquote>

`result% = _MOUSEHIDDEN`

</blockquote>

#### PARAMETERS

<blockquote>


* result% a boolean value reflecting the current mouse cursor state:
* is true (-1), if the mouse cursor is currently hidden
* is false (0), if the mouse cursor is currently visible
</blockquote>

#### DESCRIPTION

<blockquote>


* This function is especially useful for library code, which needs to determine the current state of the mouse cursor, which can be changed using the _MOUSEHIDE and _MOUSESHOW statements.
* At program start the mouse cursor is visible (default), hence this function would return false (0) until the state is changed.

</blockquote>

#### EXAMPLES

<blockquote>

```vb
PRINT "Move the mouse over the program window too see the changes.": PRINT

'at program start the mouse cursor is visible
IF _MOUSEHIDDEN THEN PRINT "Mouse cursor hidden" ELSE PRINT "Mouse cursor visible"
PRINT "press any key...": SLEEP: PRINT

'now hide the mouse cursor
_MOUSEHIDE
IF _MOUSEHIDDEN THEN PRINT "Mouse cursor hidden" ELSE PRINT "Mouse cursor visible"
PRINT "press any key...": SLEEP: PRINT

'and now show it again
_MOUSESHOW
IF _MOUSEHIDDEN THEN PRINT "Mouse cursor hidden" ELSE PRINT "Mouse cursor visible"
PRINT "press any key..."

END
```
  
<br>


</blockquote>

#### SEE ALSO

<blockquote>


* Featured in our "Keyword of the Day" series
* _MOUSEHIDE , _MOUSESHOW
</blockquote>
