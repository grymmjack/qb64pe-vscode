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


## [_TRIM\$](TRIM\$.md) [📖](https://qb64phoenix.com/qb64wiki/index.php/_TRIM%24)
---
<blockquote>

### The _TRIM$ function removes both leading and trailing space characters from a STRING value.

</blockquote>

#### SYNTAX

<blockquote>

`return$ = _TRIM$ ( text$ )`

</blockquote>

#### DESCRIPTION

<blockquote>


* Shorthand to using [LTRIM\$](LTRIM\$.md) ( [RTRIM\$](RTRIM\$.md) ("text"))
* text$ is the [STRING](STRING.md) value to trim.
* If text$ contains no leading or trailing space characters, it is returned unchanged.
* Convert fixed length [STRING](STRING.md) values by using a different return$ variable.

</blockquote>

#### EXAMPLES

<blockquote>



##### Example: Demonstrating how _TRIM\$(text\$) can replace LTRIM\$(RTRIM\$(text\$)):
```vb
text$ = SPACE$(10) + "some text" + SPACE$(10)
PRINT "[" + text$ + "]"
PRINT "[" + RTRIM$(text$) + "]"
PRINT "[" + LTRIM$(text$) + "]"
PRINT "[" + LTRIM$(RTRIM$(text$)) + "]"
PRINT "[" + _TRIM$(text$) + "]"
```
  
<br>

```vb
[          some text          ]
[          some text]
[some text          ]
[some text]
[some text]
```
  
<br>


</blockquote>

#### SEE ALSO

<blockquote>


* Featured in our "Keyword of the Day" series
* [RTRIM\$](RTRIM\$.md) , [LTRIM\$](LTRIM\$.md)
</blockquote>
