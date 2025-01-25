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


## [_ALPHA](ALPHA.md) [📖](https://qb64phoenix.com/qb64wiki/index.php/_ALPHA)
---
<blockquote>

### The _ALPHA function returns the alpha channel transparency level of a color value used on a screen page or image.

</blockquote>

#### SYNTAX

<blockquote>

`result& = _ALPHA ( color~& [, imageHandle& ])`

</blockquote>

#### DESCRIPTION

<blockquote>


* If imageHandle& is omitted, it is assumed to be the current write page. Invalid handles will create Illegal function call errors.
* _NEWIMAGE 32 bit [SCREEN](SCREEN.md) modes will always use an _UNSIGNED [LONG](LONG.md) color~& value.
* Color values that are set as a _CLEARCOLOR always have an alpha level of 0 (transparent).
* _SETALPHA can set any alpha level from 0 (or fully transparent) to 255 (or opaque).
* Normal color values that are set by _RGB or _RGB32 always have an alpha level of 255(opaque).
* In 4 (16 color) or 8 (256 color) bit palette screens the function will always return 255.
* _RED32 , _GREEN32 , _BLUE32 and _ALPHA32 are all equivalent to _RED , _GREEN , _BLUE and _ALPHA but they are highly optimized and only accept a 32-bit color (B8:G8:R8:A8). Using them (opposed to dividing then ANDing 32-bit color values manually) makes code easy to read.
* NOTE: 32 bit _NEWIMAGE screen page backgrounds are transparent black or _ALPHA 0. Use _DONTBLEND or [CLS](CLS.md) for opaque.

</blockquote>

#### EXAMPLES

<blockquote>



##### Example 1: Alpha transparency levels are always 255 in 4 or 8 bit screen modes.
```vb
SCREEN 13

clr~& = _RGBA(255, 0, 255, 192) 'returns closest palette color attribute
PRINT "Color:"; clr~&

COLOR clr~&
PRINT "Alpha:"; _ALPHA(clr~&)

END
```
  
<br>

```vb
Color 36
Alpha: 255
```
  
<br>


<div class="explanation">Explanation: Set the ALPHA value to 255 using CLS to make the background opaque when overlaying pages.</div>



##### Example 2: Finding the transparency of a 32 bit screen mode's background before and after CLS .
```vb
SCREEN _NEWIMAGE(640, 480, 32)
BG& = POINT(1, 1)
PRINT "Alpha ="; _ALPHA(BG&); "Press a key to use CLS!"
K$ = INPUT$(1)
CLS
BG& = POINT(1, 1)
PRINT "CLS Alpha ="; _ALPHA(BG&)
```
  
<br>

```vb
CLS Alpha = 255
```
  
<br>


</blockquote>

#### SEE ALSO

<blockquote>


* _ALPHA32 , _SETALPHA
* _RGBA , _RGBA32 (set color with alpha)
* _CLEARCOLOR , _CLEARCOLOR (function)
* _RED , _GREEN , _BLUE
* _RED32 , _GREEN32 . _BLUE32
* [CLS](CLS.md) , [COLOR](COLOR.md) , Images
</blockquote>
