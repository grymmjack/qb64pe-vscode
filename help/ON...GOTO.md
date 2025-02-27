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


## [ON...GOTO](ON...GOTO.md) [📖](https://qb64phoenix.com/qb64wiki/index.php/ON...GOTO)
---
<blockquote>

### ON...GOTO is a control-flow statement that branches to a line or label in a list depending on a numerical expression.

</blockquote>

#### SYNTAX

<blockquote>

`ON numericalExpression GOTO labelOrNumber [, labelOrNumber ][,...]`

</blockquote>

#### DESCRIPTION

<blockquote>


* numericalExpression represents the line or label that the program should branch to: 1 branches to the first line or label in the list, 2 branches to the second, etc.
* The procedure must be used after the number value is determined or in a loop to monitor current user events.
* Note: SELECT [CASE](CASE.md) provides a much more convenient way of doing this task.

</blockquote>

#### EXAMPLES

<blockquote>



##### Example: Changing the program flow when a value is not 0.
```vb
CLS
a = 2
ON a GOTO hello, hereweare, 143
END
hello:
PRINT "you don't get to see this!"
END
hereweare:
PRINT "And here we are..."
END
143
PRINT "you don't get to see this neither..."
END
```
  
<br>

```vb
And here we are...
```
  
<br>


</blockquote>

#### SEE ALSO

<blockquote>


* [ON...GOSUB](ON...GOSUB.md)
* [GOTO](GOTO.md)
* [GOSUB](GOSUB.md)
* SELECT [CASE](CASE.md)
</blockquote>
