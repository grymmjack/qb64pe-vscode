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


## [_ICON](ICON.md) [📖](https://qb64phoenix.com/qb64wiki/index.php/_ICON)
---
<blockquote>

### The _ICON statement uses an image handle from _LOADIMAGE for the program header and icon image in the OS.

</blockquote>

#### SYNTAX

<blockquote>

`_ICON [ mainImageHandle& [, smallImageHandle& ]]`

</blockquote>

#### PARAMETERS

<blockquote>


* mainImageHandle& is the [LONG](LONG.md) handle value of the OS icon and title bar image pre-loaded with _LOADIMAGE when used alone.
* smallImageHandle& is the [LONG](LONG.md) handle value of a different title bar image pre-loaded with _LOADIMAGE when used.
* No image handle designates use of the default QB64 icon or the embedded icon set by [\$EXEICON](\$EXEICON.md) .
</blockquote>

#### DESCRIPTION

<blockquote>


* If no image handle is passed, the default QB64 icon will be used (all versions). If the [\$EXEICON](\$EXEICON.md) metacommand is used, _ICON without an image handle uses the embedded icon from the binary (Windows only).
* Beginning with version 1.000 , the following is considered:

</blockquote>

#### EXAMPLES

<blockquote>



##### Example 1: Setting the program icon using a 32-bit image in SCREEN 0 (the default screen mode).
```vb
i& =_LOADIMAGE("RDSWU16.BMP", 32) '<<<<<<< use your image file name here

IF i& < -1 THEN
 _ICON i&
 _FREEIMAGE i& ' release image handle after setting icon
END IF
```
  
<br>


</blockquote>

#### SEE ALSO

<blockquote>


* _TITLE
* _LOADIMAGE , _SAVEIMAGE
* [\$EXEICON](\$EXEICON.md)
* Creating Icon Bitmaps
* Bitmaps , Icons and Cursors
* Icon Extraction
</blockquote>
