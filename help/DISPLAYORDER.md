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


## [_DISPLAYORDER](DISPLAYORDER.md) [📖](https://qb64phoenix.com/qb64wiki/index.php/_DISPLAYORDER)
---
<blockquote>

### The _DISPLAYORDER statement defines the order to render software, hardware and custom-OpenGL-code.

</blockquote>

#### SYNTAX

<blockquote>

`_DISPLAYORDER [{_SOFTWARE|_HARDWARE|_HARDWARE1|_GLRENDER}][, ...][, ...][, ...][, ...]`

</blockquote>

#### PARAMETERS

<blockquote>


* _SOFTWARE refers to software created surfaces or SCREENs .
* _HARDWARE and _HARDWARE1 refer to surfaces created by OpenGL hardware acceleration.
* _GLRENDER refers to OpenGL code rendering order
</blockquote>

#### DESCRIPTION

<blockquote>


* The default on program start is: _DISPLAYORDER _SOFTWARE, _HARDWARE, _GLRENDER, _HARDWARE1
* Any content or combination order is allowed, except listing the same content twice consecutively.
* Simply using _DISPLAYORDER _HARDWARE will render hardware surfaces only.
* Use an underscore to continue a code line on a new text row in the IDE.
* After _DISPLAYORDER has been used, it must be used to make any changes, even to default.

</blockquote>

#### EXAMPLES

<blockquote>


</blockquote>

#### SEE ALSO

<blockquote>


* _DISPLAY
* _PUTIMAGE
* _LOADIMAGE
* _COPYIMAGE
* Hardware images
</blockquote>
