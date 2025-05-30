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


## [STRING](STRING.md) [📖](https://qb64phoenix.com/qb64wiki/index.php/STRING)
---
<blockquote>

### STRING variables or literal values are one byte per character length text or ASCII characters.

</blockquote>

#### SYNTAX

<blockquote>

`DIM variable AS STRING [* byte_length]`

</blockquote>

#### EXAMPLES

<blockquote>



##### Example 1: Using a string type suffix with a fixed length byte size in QB64 only. The number designates the fixed string length.
```vb
var$5 = "1234567"

PRINT var$5
```
  
<br>

```vb
12345
```
  
<br>


<div class="explanation">Note: Since quotation marks are used to denote the ends of literal strings, CHR\$ (34) must be used to place quotes inside them.</div>



##### Example 2: Creating a string variable value by adding variable and literal string values. This procedure is called string concatenation .
```vb
age% = 10
a$ = "I am " + CHR$(34) + LTRIM$(STR$(age%)) + CHR$(34) + " years old."
b$ = "How old are you?"
question$ = a$ + SPACE$(1) + b$
PRINT question$
```
  
<br>

```vb
I am "10" years old. How old are you?
```
  
<br>



##### Example 3: How QB64 string type suffixes can fix the length by adding a number of bytes after it.
```vb
strings$5 = "Hello world"

PRINT strings$5
```
  
<br>

```vb
Hello
```
  
<br>



##### Example 4: STRING values can be compared by the ASC code value according to ASCII .
```vb
PRINT "Enter a letter, number or punctuation mark from the keyboard: ";
valu$ = INPUT$(1)
PRINT value$
value1$ = "A"
value2$ = "m"
value3$ = "z"

SELECT CASE value$
 CASE value1$: PRINT "A only"
 CASE value1$ TO value2$: PRINT "B to m" 'A is already evaluated
 CASE value1$, value2$, value3$: PRINT "z only" 'A and m are already evaluated
 CASE IS > value2$: PRINT "greater than m but not z" 'z is already evaluated
 CASE ELSE: PRINT "other value" 'key entry below A including all numbers
END SELECT
```
  
<br>


</blockquote>

#### SEE ALSO

<blockquote>


* [DIM](DIM.md) , [DEFSTR](DEFSTR.md)
* [CHR\$](CHR\$.md) , [ASC](ASC.md) (function)
* [LEFT\$](LEFT\$.md) , [RIGHT\$](RIGHT\$.md) , [MID\$](MID\$.md) (function)
* [LTRIM\$](LTRIM\$.md) , [RTRIM\$](RTRIM\$.md)
* [LCASE\$](LCASE\$.md) , [UCASE\$](UCASE\$.md)
* [STR\$](STR\$.md)
* [HEX\$](HEX\$.md)
* [MKI\$](MKI\$.md) , [MKL\$](MKL\$.md) , [MKS\$](MKS\$.md) , [MKD\$](MKD\$.md) , _MK$
* [CVI](CVI.md) , [CVL](CVL.md) , [CVS](CVS.md) , [CVD](CVD.md) , _CV
* [LEN](LEN.md) , [VAL](VAL.md)
* [ASCII](ASCII.md) , [DRAW](DRAW.md)
* [PRINT](PRINT.md) , [PRINT](PRINT.md) USING , [WRITE](WRITE.md)
</blockquote>
