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


## [LTRIM\$](LTRIM\$.md) [📖](https://qb64phoenix.com/qb64wiki/index.php/LTRIM%24)
---
<blockquote>

### The LTRIM$ function removes leading space characters from a STRING value.

</blockquote>

#### SYNTAX

<blockquote>

`return$ = LTRIM$ ( text$ )`

</blockquote>

#### DESCRIPTION

<blockquote>


* text$ is the [STRING](STRING.md) value to trim.
* If text$ contains no leading space characters, it is returned unchanged.
* Convert fixed length [STRING](STRING.md) values by using a different return$ variable.
* Can be used to trim the leading space of a positive numerical value converted to a string value by [STR\$](STR\$.md) .

</blockquote>

#### EXAMPLES

<blockquote>



##### Example 1: Trimming a positive string number.
```vb
value = 12345
number$ = LTRIM$(STR$(value)) 'converting number to string removes right PRINT space
PRINT "[" + number$ + "]"
```
  
<br>

```vb
[12345]
```
  
<br>



##### Example 2: Trimming leading spaces from text strings.
```vb
PRINT LTRIM$("some text")
PRINT LTRIM$("   some text")
```
  
<br>

```vb
some text
some text
```
  
<br>



##### Example 3: A TRIM\$ function to trim spaces off of both ends of a string.
```vb
text$ = "        Text String           "
trimmed$ = TRIM$(text$)
PRINT CHR$(26) + trimmed$ + CHR$(27)
FUNCTION TRIM$(text$)
TRIM$ = LTRIM$(RTRIM$(text$))
END FUNCTION
```
  
<br>

```vb
→Text String←
```
  
<br>


</blockquote>

#### SEE ALSO

<blockquote>


* Featured in our "Keyword of the Day" series
* _TRIM$ , [RTRIM\$](RTRIM\$.md) , [STR\$](STR\$.md)
* [LEFT\$](LEFT\$.md) , [RIGHT\$](RIGHT\$.md)
* [HEX\$](HEX\$.md) , [MID\$](MID\$.md) (function)
</blockquote>
