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


## [OCT\$](OCT\$.md) [📖](https://qb64phoenix.com/qb64wiki/index.php/OCT%24)
---
<blockquote>

### This function returns the octal (base 8) representation of any numeric value.

</blockquote>

#### SYNTAX

<blockquote>

`octvalue$ = OCT$ ( number )`

</blockquote>

#### PARAMETERS

<blockquote>


* number can be any [INTEGER](INTEGER.md) , [LONG](LONG.md) or _INTEGER64 value, positive or negative.
* number can also be any [SINGLE](SINGLE.md) , [DOUBLE](DOUBLE.md) or _FLOAT value, but only the integer part of the value is converted in that case. That is, from the value -123.45 the function would convert the -123 only.
</blockquote>

#### DESCRIPTION

<blockquote>


* The function returns the base 8 (octal) representation of the given number as [STRING](STRING.md) .
* Different from [STR\$](STR\$.md) , this function does not return a leading sign placeholder space, so no [LTRIM\$](LTRIM\$.md) to strip that space from positive numbers is necessary.
* [VAL](VAL.md) can convert the returned oct string value back to a decimal value by prefixing the string with " &O ".
* Eg. decimal = [VAL](VAL.md) ("&O" + octvalue$) .

</blockquote>

#### EXAMPLES

<blockquote>

```vb
tabletop$ = " Decimal | Hexadecimal | Octal | Binary "
tablesep$ = "---------+-------------+-------+--------"
tableout$ = "  \ \    |      \\     |   \\  |  \  \  " 'the PRINT USING template

LOCATE 2, 10: PRINT tabletop$
LOCATE 3, 10: PRINT tablesep$
FOR n% = 0 TO 15
   LOCATE 4 + n%, 10: PRINT USING tableout$; STR$(n%); HEX$(n%); OCT$(n%); _BIN$(n%)
NEXT n%
```
  
<br>

```vb
Decimal | Hexadecimal | Octal | Binary
        ---------+-------------+-------+--------
           0     |      0      |   0   |  0
           1     |      1      |   1   |  1
           2     |      2      |   2   |  10
           3     |      3      |   3   |  11
           4     |      4      |   4   |  100
           5     |      5      |   5   |  101
           6     |      6      |   6   |  110
           7     |      7      |   7   |  111
           8     |      8      |   10  |  1000
           9     |      9      |   11  |  1001
           10    |      A      |   12  |  1010
           11    |      B      |   13  |  1011
           12    |      C      |   14  |  1100
           13    |      D      |   15  |  1101
           14    |      E      |   16  |  1110
           15    |      F      |   17  |  1111
```
  
<br>

```vb
octvalue$ = OCT$(255)
PRINT "Oct: "; octvalue$
PRINT "Converting Oct value to Decimal:"; VAL("&O" + octvalue$)
```
  
<br>

```vb
Oct: 377
Converting Oct value to Decimal: 255
```
  
<br>


</blockquote>

#### SEE ALSO

<blockquote>


* _BIN$ , [HEX\$](HEX\$.md) , [STR\$](STR\$.md)
* &B , &H , &O , [VAL](VAL.md)
* Base Comparisons
</blockquote>
