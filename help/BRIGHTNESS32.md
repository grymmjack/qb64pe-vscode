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


## [_BRIGHTNESS32](BRIGHTNESS32.md) [📖](https://qb64phoenix.com/qb64wiki/index.php/_BRIGHTNESS32)
---
<blockquote>

### The _BRIGHTNESS32 function returns the brightness value ( HSB colorspace ) of a given 32-bit ARGB color.

</blockquote>

#### SYNTAX

<blockquote>

`brightness# = _BRIGHTNESS32 ( argbColor~& )`

</blockquote>

#### PARAMETERS

<blockquote>


* argbColor~& is the 32-bit ARGB color value to retrieve the brightness value from.
* ARGB colors are returned by various functions, such as _PALETTECOLOR , [POINT](POINT.md) and obviously by the color creating _RGB32 , _RGBA32 , _HSB32 or _HSBA32 functions.
</blockquote>

#### DESCRIPTION

<blockquote>


* The value returned is of type [DOUBLE](DOUBLE.md) in the range 0 to 100 percent, use [CINT](CINT.md) to work with integers only.
* 100% is the brightest (highest intensity), as closer the value comes to 0%, as darker is the color always ending in black regardless of the hue and saturation values.

</blockquote>

#### EXAMPLES

<blockquote>

```vb
PRINT "Creating a color using the HSB colorspace..."
c~& = _HSB32(90, 75, 65)

PRINT "_HSB32( 90, 75, 65 ) = _RGB32("; _RED32(c~&); ","; _GREEN32(c~&); ","; _BLUE32(c~&); ")"
PRINT
PRINT "back to HSB values (notice the precision loss)..."
PRINT "Hue.......:"; _HUE32(c~&)
PRINT "Saturation:"; _SATURATION32(c~&)
PRINT "Brightness:"; _BRIGHTNESS32(c~&)
PRINT
PRINT "but with CINT() we can get back the original values..."
PRINT "Hue.......:"; CINT(_HUE32(c~&))
PRINT "Saturation:"; CINT(_SATURATION32(c~&))
PRINT "Brightness:"; CINT(_BRIGHTNESS32(c~&))

END
```
  
<br>


</blockquote>

#### SEE ALSO

<blockquote>


* _HSB32 , _HSBA32
* _HUE32 , _SATURATION32
* _RGB32 , _RGBA32
* _RED32 , _GREEN32 , _BLUE32 , _ALPHA32
</blockquote>
