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


## [_CONSOLEINPUT](CONSOLEINPUT.md) [📖](https://qb64phoenix.com/qb64wiki/index.php/_CONSOLEINPUT)
---
<blockquote>

### The _CONSOLEINPUT function is used to monitor any new mouse or keyboard input coming from a $CONSOLE window. It must be called in order for _CINP to return valid values. Windows-only.

</blockquote>

#### SYNTAX

<blockquote>

`infoExists%% = _CONSOLEINPUT`

</blockquote>

#### DESCRIPTION

<blockquote>


* Returns 1 if new keyboard information is available, 2 if mouse information is available, otherwise it returns 0.
* Must be called before reading any of the other mouse functions and before reading _CINP .
* To clear all previous input data, read _CONSOLEINPUT in a loop until it returns 0.
* To capture mouse input, turn off Quick Edit in the settings of command prompt and use _SOURCE _CONSOLE or $CONSOLE:ONLY .
* Keyword not supported in Linux or macOS versions

</blockquote>

#### EXAMPLES

<blockquote>

```vb
$CONSOLE:ONLY

PRINT "Press any key, and I'll give you the scan code for it.  <ESC> quits the demo."
PRINT
PRINT
DO
   x = _CONSOLEINPUT
   IF x = 1 THEN 'read only keyboard input ( = 1)
       c = _CINP
       PRINT c;
   END IF
LOOP UNTIL c = 1
END
```
  
<br>


</blockquote>

#### SEE ALSO

<blockquote>


* [\$CONSOLE](\$CONSOLE.md) , _CONSOLE
* _CINP , Scan Codes
* _MOUSEX , _MOUSEY , _MOUSEBUTTON , _MOUSEWHEEL
</blockquote>
