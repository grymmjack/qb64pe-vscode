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


## [_CLAMP](CLAMP.md) [📖](https://qb64phoenix.com/qb64wiki/index.php/_CLAMP)
---
<blockquote>

### The _CLAMP function forces the given numeric value into a specific range, returning either the given value as is, or the closest boundary if the range is exceeded.

</blockquote>

#### SYNTAX

<blockquote>

`clamped## = _CLAMP ( value , minVal , maxVal )`

</blockquote>

#### PARAMETERS

<blockquote>


* value is the number to clamp, any integer or floating point type is supported.
* minVal is the minimum range bondary, any integer or floating point type is supported.
* maxVal is the maximum range bondary, any integer or floating point type is supported.
* clamped## is the clamped number return as _FLOAT type (suffix ##).
</blockquote>

#### DESCRIPTION

<blockquote>


* The function compares the given numeric value with a given minimum and maximum range boundary and returns a value which is not exceeding that range, i.e.:
* it will return the unmodified value itself, if it fits into the given range.
* it returns minVal , if value is less than the minimum allowed.
* it returns maxVal , if value is greater than the minimum allowed.

</blockquote>

#### EXAMPLES

<blockquote>

```vb
PRINT _CLAMP(123.345, 100, 200) 'value ok, returned as is
PRINT _CLAMP(67.89, 100, 200) 'value < as allowed, return minimum
PRINT _CLAMP(234.5, 100, 200) 'value > as allowed, return maximum
```
  
<br>

```vb
123.456
100
200
```
  
<br>


</blockquote>

#### SEE ALSO

<blockquote>


* _MIN , _MAX
* [FIX](FIX.md) , [INT](INT.md) , [CINT](CINT.md) , [CLNG](CLNG.md)
</blockquote>
