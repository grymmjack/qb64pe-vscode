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


## [_HSB32](HSB32.md) [📖](https://qb64phoenix.com/qb64wiki/index.php/_HSB32)
---
<blockquote>

### The _HSB32 function specifies a color using the HSB colorspace and returns the 32-bit ARGB color value representing the color with the specified hue, saturation and brightness.

</blockquote>

#### SYNTAX

<blockquote>

`color32value~& = _HSB32 ( hue# , saturation# , brightness# )`

</blockquote>

#### PARAMETERS

<blockquote>


* hue# specifies the hue [DOUBLE](DOUBLE.md) of the desired color from 0 to 360 degrees.
* The color wheel starts with red(0), turns to yellow(60), green(120), cyan(180), blue(240), magenta(300) to red(360) again.
* Mixed colors can be build by specifying values between the 6 base color angles.
* saturation# specifies the saturation [DOUBLE](DOUBLE.md) of the desired color from 0 to 100 percent.
* 100% is the richest color possible, as closer you come to 0%, as more the color is fading ending at dull gray.
* The intensity of the gray (i.e. black >> darkgray >> midgray >> lightgray >> white) depends on the brightness# value.
* brightness# specifies the brightness [DOUBLE](DOUBLE.md) of the desired color from 0 to 100 percent.
* 100% is the brightest (highest intensity), as closer you come to 0%, as darker is the color always ending in black regardless of the given hue# and saturation# .
</blockquote>

#### DESCRIPTION

<blockquote>


* The value returned is always a 32-bit _UNSIGNED [LONG](LONG.md) ARGB color value, as is the [POINT](POINT.md) value.
* Return variable types must be _UNSIGNED [LONG](LONG.md) or [LONG](LONG.md) , otherwise the resulting color may lose the _BLUE value.
* Parameter values outside the allowed ranges are clipped.
* All colors build with this function are opaque (full alpha), i.e. it returns _UNSIGNED [LONG](LONG.md) 32-bit hexadecimal values from &HFF 00 00 00 to &HFF FF FF FF .
* Use _HSBA32 if you also need control over the alpha channel.
* When ( _UNSIGNED ) [LONG](LONG.md) values are [PUT](PUT.md) to file, the ARGB values become BGRA . Use [LEFT\$](LEFT\$.md) ( [MKL\$](MKL\$.md) ( color32value~& ), 3) to place 3 colors.

</blockquote>

#### EXAMPLES

<blockquote>

```vb
SCREEN _NEWIMAGE(640, 480, 32)

FOR ang# = 0 TO 360 STEP 0.25
   FOR rad# = 0 TO 200 STEP 0.25
       x% = rad# * COS(_D2R(ang#))
       y% = rad# * SIN(_D2R(ang#))
       PSET (320 + x%, 240 - y%), _HSB32(ang#, rad# / 2, 100)
   NEXT rad#
NEXT ang#

END
```
  
<br>

```vb
SCREEN _NEWIMAGE(640, 480, 32)

FOR hei# = 0 TO 200 STEP 5
   FOR ang# = 5 TO 285 STEP 0.25
       FOR rad# = 0 TO 200 STEP 1
           x% = rad# * COS(_D2R(ang#))
           y% = rad# * SIN(_D2R(ang#))
           z% = hei#
           XYfrom3D x%, y%, z%
           PSET (330 + x%, -z% + 340), _HSB32(ang#, rad# / 2, hei# / 2)
           IF rad# = 0 _ANDALSO (hei# = 0 OR hei# = 200) THEN
               IF hei# = 0 THEN
                   IF ang# = 5 THEN bmpx% = 330 + x%: bmpy% = -z% + 340
               ELSE
                   IF ang# = 5 THEN tmpx% = 330 + x%: tmpy% = -z% + 340
               END IF
           ELSEIF rad# = 200 _ANDALSO (hei# = 0 OR hei# = 200) THEN
               PSET (330 + x%, -z% + 340), &HFFFFFFFF
               IF hei# = 0 THEN
                   IF ang# = 5 THEN bspx% = 330 + x%: bspy% = -z% + 340
                   IF ang# = 285 THEN bepx% = 330 + x%: bepy% = -z% + 340
               ELSE
                   IF ang# = 5 THEN tspx% = 330 + x%: tspy% = -z% + 340
                   IF ang# = 285 THEN tepx% = 330 + x%: tepy% = -z% + 340
               END IF
           END IF
       NEXT rad#
   NEXT ang#
NEXT hei#
LINE (bspx%, bspy%)-(bmpx%, bmpy%), &HFFFFFFFF
LINE (bmpx%, bmpy%)-(bepx%, bepy%), &HFFFFFFFF
LINE (tspx%, tspy%)-(tmpx%, tmpy%), &HFFFFFFFF
LINE (tmpx%, tmpy%)-(tepx%, tepy%), &HFFFFFFFF
LINE (bspx%, bspy%)-(tspx%, tspy%), &HFFFFFFFF
LINE (bmpx%, bmpy%)-(tmpx%, tmpy%), &HFFFFFFFF
LINE (bepx%, bepy%)-(tepx%, tepy%), &HFFFFFFFF
END

SUB XYfrom3D (x%, y%, z%)
x% = (x% + (y% * .5))
z% = (z% + (y% * .5))
END SUB
```
  
<br>


</blockquote>

#### SEE ALSO

<blockquote>


* _HSBA32 , _HUE32
* _SATURATION32 , _BRIGHTNESS32
* _RGBA32 , _RGB , _RGBA
* _RED32 , _GREEN32 , _BLUE32
* _PALETTECOLOR
* [HEX\$](HEX\$.md) 32 Bit Values
* SaveImage [SUB](SUB.md)
* Hexadecimal Color Values
</blockquote>
