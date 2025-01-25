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


## [_MAX](MAX.md) [📖](https://qb64phoenix.com/qb64wiki/index.php/_MAX)
---
<blockquote>

### The _MAX function returns the greater of two given numeric values.

</blockquote>

#### SYNTAX

<blockquote>

`maximum## = _MAX ( value1 , value2 )`

</blockquote>

#### PARAMETERS

<blockquote>


* value1 and value2 are the two numbers to compare, any integer or floating point type is supported.
* maximum## is the greater of both values returned as _FLOAT type (suffix ##).
</blockquote>

#### DESCRIPTION

<blockquote>


* The function compares the given numeric values and then returns the greater of both numbers.
* Will return value1 if the values are equivalent.

</blockquote>

#### EXAMPLES

<blockquote>

```vb
'maximum of two values
PRINT _MIN(345, 123)
PRINT _MIN(5.0001, 5.0)
PRINT _MIN(-34, -1.0E+1)
PRINT
'minimum of two values
PRINT _MAX(345, 123)
PRINT _MAX(5.0001, 5.0)
PRINT _MAX(-34, -1.0E+1)
PRINT
'min/max of multiple values
PRINT _MIN(_MIN(345, 123), 255)
PRINT _MAX(_MAX(_MAX(345, 123), 413), 255)
```
  
<br>

```vb
123
5
-34

345
5.0001
-10

123
413
```
  
<br>

```vb
'min/max in array
DIM a(5): RANDOMIZE TIMER 'some random values
a(0) = INT(RND * 10): a(1) = INT(RND * 10): a(2) = INT(RND * 10)
a(3) = INT(RND * 10): a(4) = INT(RND * 10): a(5) = INT(RND * 10)
PRINT "array values:"
FOR i = 0 TO 5: PRINT a(i);: NEXT i: PRINT: PRINT 'print array

minimum = _MIN(a(0), a(1)) 'initial min/max
maximum = _MAX(a(0), a(1))
FOR i = 2 TO 5
   minimum = _MIN(minimum, a(i)) 'check remaining indexes
   maximum = _MAX(maximum, a(i))
NEXT i

PRINT "array minimum ="; minimum
PRINT "array maximum ="; maximum
```
  
<br>


</blockquote>

#### SEE ALSO

<blockquote>


* Featured in our "Keyword of the Day" series
* _MIN , _CLAMP
* [FIX](FIX.md) , [INT](INT.md) , [CINT](CINT.md) , [CLNG](CLNG.md)
</blockquote>
