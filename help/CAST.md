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


## [_CAST](CAST.md) [📖](https://qb64phoenix.com/qb64wiki/index.php/_CAST)
---
<blockquote>

### The _CAST function performs a C-like cast of a numerical value to a specified numerical type.

</blockquote>

#### SYNTAX

<blockquote>

`result = _CAST ( numericalType , numericalValue )`

</blockquote>

#### PARAMETERS

<blockquote>


* numericalType specifies the target type for the conversion. Accepted types are:
* [SINGLE](SINGLE.md)
* [DOUBLE](DOUBLE.md)
* _FLOAT
* _BYTE
* [INTEGER](INTEGER.md)
* [LONG](LONG.md)
* _INTEGER64
* _OFFSET
* The _UNSIGNED modifier is also allowed and can be combined with the integer types.
* numericalValue is the value to be cast to the specified type.
</blockquote>

#### DESCRIPTION

<blockquote>


* _CAST allows explicit type conversion, similar to C-style casting.
* _CAST does not round the value like [INT](INT.md) , _ROUND , [CINT](CINT.md) , or [CLNG](CLNG.md) .
* The result type is determined by numericalType .
* A compiler error is thrown if numericalType is invalid or numericalValue is a [STRING](STRING.md) .
* No runtime errors are thrown if numericalType and numericalValue are valid.

</blockquote>

#### EXAMPLES

<blockquote>

```vb
DIM a AS DOUBLE
DIM b AS _INTEGER64

a = 123.456
b = _CAST(_INTEGER64, a)

PRINT "Original: "; a
PRINT "Casted: "; b

a = 456.789
b = _CAST(_INTEGER64, a)

PRINT "Original: "; a
PRINT "Casted: "; b

a = -123.456
b = _CAST(_INTEGER64, a)

PRINT "Original: "; a
PRINT "Casted: "; b

a = -456.789
b = _CAST(_INTEGER64, a)

PRINT "Original: "; a
PRINT "Casted: "; b
```
  
<br>

```vb
Original:  123.456
Casted:  123
Original:  456.789
Casted:  456
Original: -123.456
Casted: -123
Original: -456.789
Casted: -456
```
  
<br>

```vb
PRINT 4.6!; INT(4.6!); FIX(4.6!); CLNG(4.6!); _ROUND(4.6!); _CAST(LONG, 4.6!)
PRINT -4.6!; INT(-4.6!); FIX(-4.6!); CLNG(-4.6!); _ROUND(-4.6!); _CAST(LONG, -4.6!)

PRINT 1%%; _CAST(_UNSIGNED _BYTE, 1%%)
PRINT -1%%; _CAST(_UNSIGNED _BYTE, -1%%)
```
  
<br>

```vb
4.6  4  4  5  5  4
-4.6 -5 -4 -5 -5 -4
1  1
-1  255
```
  
<br>


</blockquote>

#### SEE ALSO

<blockquote>


* _CEIL
* [INT](INT.md) , [FIX](FIX.md)
* [CINT](CINT.md) , [CLNG](CLNG.md) ,
* [CSNG](CSNG.md) , [CDBL](CDBL.md)
* _ROUND
* Variable Types
</blockquote>
