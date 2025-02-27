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


## [_PUTIMAGE](PUTIMAGE.md) [📖](https://qb64phoenix.com/qb64wiki/index.php/_PUTIMAGE)
---
<blockquote>

### _PUTIMAGE puts an area of a source image to an area of a destination image in one operation, like GET and PUT .

</blockquote>

#### SYNTAX

<blockquote>

`_PUTIMAGE [STEP] [( dx1 , dy1 )-[STEP][( dx2 , dy2 )]][, sourceHandle& ][, destHandle& ][, ][STEP][( sx1 , sy1 )[-STEP][( sx2 , sy2 )]][, _SMOOTH ]`

</blockquote>
  
#### SAMPLES

<blockquote>

  
  
---
```vb
_PUTIMAGE 'full source image to fit full destination area after _SOURCE and _DEST are set
```
---
  
  
  
  
---
```vb
_PUTIMAGE , sourceHandle& , destHandle& 'size full source to fit full destination area
```
---
  
  
  
  
---
```vb
_PUTIMAGE ( dx1 , dy1 ), sourceHandle& , destHandle& 'full source to top-left corner destination position
```
---
  
  
  
  
---
```vb
_PUTIMAGE ( dx1 , dy1 )-( dx2 , dy2 ), sourceHandle& , destHandle& 'size full source to destination coordinate area
```
---
  
  
  
  
---
```vb
_PUTIMAGE ( dx1 , dy1 ), sourceHandle& , destHandle& , ( sx1 , sy1 )-( sx2 , sy2 ) 'portion of source to the top-left corner of the destination page
```
---
  
  
  
  
---
```vb
_PUTIMAGE , sourceHandle& , destHandle& , ( sx1 , sy1 )-( sx2 , sy2 ) 'portion of source to full destination area
```
---
  
  
  
  
---
```vb
_PUTIMAGE ( dx1 , dy1 )-( dx2 , dy2 ), sourceHandle& , destHandle& ,( sx1 , sy1 ) 'right side of source from top-left corner to destination
```
---
  
  

</blockquote>

#### PARAMETERS

<blockquote>


* Relative coordinates to a previous graphical object can be designated using [STEP](STEP.md) as opposed to literal surface coordinates (version 1.000 and up).
* Coordinates dx and dy map the box area of the destination area to use. When omitted the entire desination area is used. If only one coordinate is used, the source is placed with its original dimensions. Coordinates can be set to flip or resize the image.
* dx1 = the column coordinate at which the insertion of the source will begin (leftmost); when larger than dx2 , reverses image.
* dy1 = the row coordinate at which the insertion of the source will begin (topmost); when larger than dy2 , inverts image.
* dx2 = the column coordinate at which the insertion of the source will end (rightmost); further apart, widens image.
* dy2 = the row coordinate at which the insertion of the source will end (bottommost); closer together, shrinks image
* sourceHandle& = the [LONG](LONG.md) handle of the source image created with _NEWIMAGE , _LOADIMAGE or _COPYIMAGE .
* destHandle& = the [LONG](LONG.md) handle of the destination image may be created with _NEWIMAGE , [SCREEN](SCREEN.md) or destination 0.
* Coordinates sx and sy [GET](GET.md) the box area of the source image to transfer to the destination image, page or screen :
* sx1 = the column coordinate of the left-most pixel to include of the source. When omitted, the entire image is used
* sy1 = the row coordinate of the upper-most pixel to include of the source. When omitted, the entire image is used
* sx2 = the column coordinate of the right-most pixel to include of the source. Can be omitted to get rest of image.
* sy2 = the row coordinate of the bottom-most pixel to include of the source. Can be omitted to get rest of image.
* _SMOOTH applies linear filtering ( version 1.000 and up ).Note: The PUT options PSET, PRESET, AND, OR and XOR are not available with _PUTIMAGE. QB64 can use transparency of colors to achieve the same results.

</blockquote>

#### DESCRIPTION

<blockquote>


* _PUTIMAGE can be used without any handle parameters if the _SOURCE and/or _DEST are already defined.
* If the area of the source is bigger or smaller than the area of the destination then the image is adjusted to fit that area.
* Supports 32 bit alpha blending, color key transparency, true type fonts, stretching, mirroring/flipping, and a variety of graphics file formats including gif, png, bmp & jpg. 32 bit screen surface backgrounds (black) have zero _ALPHA and are transparent when placed over other surfaces. Use [CLS](CLS.md) or _DONTBLEND to make a new surface background _ALPHA 255 or opaque.
* All graphical surfaces, including screen pages, can be acted upon in the same manner, and are referred to as "images".
* Hardware images (created using mode 33 via _LOADIMAGE or _COPYIMAGE ) can be used as the source or destination.
* Handles are used to identify graphical surfaces. Positive values are used to refer to screen pages. -1 (negative one) indicates an invalid surface. It is recommended to store image handles in [LONG](LONG.md) variables. Passing an invalid handle generates an "Invalid handle" error.
* When handles are not passed (or cannot be passed) to subs/functions then the default destination image or source image is referenced. These are set to the active page when the [SCREEN](SCREEN.md) statement is called, but can be changed to any image. So it is possible to read from one image using [POINT](POINT.md) and write to a different one with [PSET](PSET.md) .
* PRINTed text cannot be transferred and positioned accurately. Use _PRINTSTRING for graphical text or font placement.
* Images are not deallocated when the [SUB](SUB.md) or [FUNCTION](FUNCTION.md) they are created in ends. Free them with _FREEIMAGE .
* It is important to free discarded or unused images with _FREEIMAGE to prevent CPU memory overflow errors.

</blockquote>

#### EXAMPLES

<blockquote>



##### Example 1:
```vb
SCREEN 13
a& = _NEWIMAGE(640, 200, 13) ' creates a 640 * 200 image with the LONG handle a&
_DEST a& ' makes image a& the default drawing output.
LINE (10, 10)-(100, 100), 12, BF ' draws a filled box (BF) into destination
_PUTIMAGE (0, 0)-(320, 200), a&, 0, (0, 0)-(320, 200)
```
  
<br>



##### Example 2: You don't need to do anything special to use a .PNG image with alpha/transparency. Here's a simple example:
```vb
SCREEN _NEWIMAGE(640, 480, 32)
CLS , _RGB(0, 255, 0)
i = _LOADIMAGE("QB64.PNG") 'any 32 bit image (ie. with alpha channel)
_PUTIMAGE (0, 0), i ' places image at upper left corner of window w/o stretching it
```
  
<br>



##### Example 3: Flipping and enlarging an image with _PUTIMAGE by swapping or increasing the desination coordinates.
```vb
DEFLNG A-Z
dest_handle = _NEWIMAGE(640, 480, 32)
SCREEN dest_handle  '32 bit Screen 12 dimensions
source_handle = _LOADIMAGE("QB64.PNG", 32) 'any 32 bit image (ie. with alpha channel)
dx1 = 0: dy1 = 0
dx2 = _WIDTH(source_handle) - 1: dy2 = _HEIGHT(source_handle) - 1 'image dimensions - 1
LOCATE 29, 33: PRINT "Press any Key!";
'normal image coordinate values based on the dimensions of the image:
_PUTIMAGE (dx1, dy1)-(dx2, dy2), source_handle, dest_handle
LOCATE 20, 34: PRINT "Normal layout"
LOCATE 24, 10: PRINT "_PUTIMAGE (dx1, dy1)-(dx2, dy2), source_handle, dest_handle"
K$ = INPUT$(1)
'to flip the image on the x axis, swap the dx coordinate values:
_PUTIMAGE (dx2, dy1)-(dx1, dy2), source_handle, dest_handle
LOCATE 20, 34: PRINT "Flip by X axis"
LOCATE 24, 10: PRINT "_PUTIMAGE (dx2, dy1)-(dx1, dy2), source_handle, dest_handle"
K$ = INPUT$(1)
'to flip image on y axis, swap the dy coordinate values:
_PUTIMAGE (dx1, dy2)-(dx2, dy1), source_handle, dest_handle
LOCATE 20, 34: PRINT "Flip by Y axis"
LOCATE 24, 10: PRINT "_PUTIMAGE (dx1, dy2)-(dx2, dy1), source_handle, dest_handle "
K$ = INPUT$(1)
'to flip both, swap both the dx and dy coordinate values:
_PUTIMAGE (dx2, dy2)-(dx1, dy1), source_handle, dest_handle
LOCATE 20, 34: PRINT "Flip on both axis"
LOCATE 24, 10: PRINT "_PUTIMAGE (dx2, dy2)-(dx1, dy1), source_handle, dest_handle"
K$ = INPUT$(1)
'to enlarge, double the second set of values plus any offset of the first coordinates:
_PUTIMAGE (dx1, dy1)-((2 * dx2) + dx1, (2 * dy2) + dy1), source_handle, dest_handle
LOCATE 20, 34: PRINT "Double image size"
LOCATE 24, 2:
PRINT "_PUTIMAGE (dx1, dy1)-((2 * dx2) + dx1, (2 * dy2) + dy1), s_handle, d_handle
END
```
  
<br>



##### Example 4: Using _PUTIMAGE to scroll a larger image created on a separate _NEWIMAGE screen page with QB64.
```vb
RANDOMIZE TIMER
ws& = _NEWIMAGE(2560, 1440, 32) 'large image page
s& = _NEWIMAGE(1280, 720, 32)' program screen

_DEST ws& 'create large image of random filled circles
FOR i = 1 TO 50
   x = RND(1) * 2560
   y = RND(1) * 1440
   clr& = _RGB32(RND(1) * 255, RND(1) * 255, RND(1) * 255)
   CIRCLE (x, y), RND(1) * 300, clr&
   PAINT (x, y), clr&
NEXT
PRINT "This is a demo of some screen scrolling.   Use the number pad keys to scroll.  4 goes left, 6 goes right.  8 up, 2 down. ESC key will close this program."
x = 0: y = 0
SCREEN s&

DO
   CLS
   _PUTIMAGE (0, 0), ws&, 0, (x, y)-(x + 1279, y + 719)
   a$ = INKEY$
   SELECT CASE a$
       CASE "4": x = x - 10: IF x < 0 THEN x = 0
       CASE "6": x = x + 10: IF x > 1280 THEN x = 1280
       CASE "8": y = y - 10: IF y < 0 THEN y = 0
       CASE "2": y = y + 10: IF y > 720 THEN y = 720
       CASE CHR$(32): SYSTEM
   END SELECT
   _DISPLAY
LOOP
```
  
<br>



##### Example 5: _PUTIMAGE can be used with no parameters at all if the _SOURCE and _DEST are already set.
```vb
SCREEN 13
h& = _NEWIMAGE(640, 480, 256)
_DEST h&
_PRINTSTRING (10, 10), "This _PUTIMAGE used no parameters!"
_SOURCE h&
_DEST 0
_PUTIMAGE
END
```
  
<br>


</blockquote>

#### MORE EXAMPLES

<blockquote>


* Bitmaps
* SaveImage [SUB](SUB.md)
</blockquote>

#### SEE ALSO

<blockquote>


* Featured in our "Keyword of the Day" series
* _LOADIMAGE , _NEWIMAGE
* _COPYIMAGE , _SAVEIMAGE
* _SCREENIMAGE
* _MAPTRIANGLE , [STEP](STEP.md)
* _DEST , _SOURCE , _FREEIMAGE
* Hardware images
</blockquote>
