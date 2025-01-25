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


## [_CONSOLEFONT](CONSOLEFONT.md) [📖](https://qb64phoenix.com/qb64wiki/index.php/_CONSOLEFONT)
---
<blockquote>

### The _CONSOLEFONT statement is used to change the text font used in Console Windows or change its size.

</blockquote>

#### SYNTAX

<blockquote>

`_CONSOLEFONT fontName$ , fontSize%`

</blockquote>

#### PARAMETERS

<blockquote>


* fontName$ is the name of the desired font. Note that only a few fonts are allowed, in most standard systems it will probably only be Consolas and Lucida Console .
* To see a complete list of names available on your system: open a command prompt, click on the console windows's title icon in the upper left corner, select properties and then the fonts tab.
* fontSize% specifies the pixel height of the font to use.
* Note that both arguments are mandatory, i.e. even if you just wanna change the fontSize% , you must still give the fontName$ too.
</blockquote>

#### DESCRIPTION

<blockquote>


* Note that any font changes globally affect the entire console window and all its contents, i.e. only one font or one specific size can be used, further _CONSOLEFONT calls will override former ones and the console window will use whatever was set last.
* Keyword not supported in Linux or macOS versions

</blockquote>

#### EXAMPLES

<blockquote>

```vb
$CONSOLE:ONLY

_CONSOLEFONT "Consolas", 24
PRINT: PRINT "current font is Consolas size 24": SLEEP

_CONSOLEFONT "Lucida Console", 20
PRINT: PRINT "current font is Lucida Console size 20": SLEEP

_CONSOLEFONT "Lucida Console", 22
PRINT: PRINT "current font is Lucida Console size 22"

PRINT: PRINT "press any key...": SLEEP
SYSTEM
```
  
<br>


</blockquote>

#### SEE ALSO

<blockquote>


* _CONSOLE
* _CONSOLETITLE , _CONSOLECURSOR
* _CONSOLEINPUT , _CINP
* Metacommands
</blockquote>
