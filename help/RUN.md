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


## [RUN](RUN.md) [📖](https://qb64phoenix.com/qb64wiki/index.php/RUN)
---
<blockquote>

### RUN is a control flow statement that clears and restarts the program currently in memory or executes another specified program.

</blockquote>

#### SYNTAX

<blockquote>

`RUN [{ line_number | filespec$ }] [ command_parameter(s) ]`

</blockquote>

#### PARAMETERS

<blockquote>


* line number specifies a line number in the main module code.
* An optional filespec specifies a program to load into memory and run.
</blockquote>

#### EXAMPLES

<blockquote>



##### Example 1: Shows how RUN can reference multiple line numbers in the main module code. No line number executes first code line.
```vb
PRINT " A", " B", " C", " D"
10 A = 1
20 B = 2
30 C = 3
40 D = 4
50 PRINT A, B, C, D
60 IF A = 0 THEN 70 ELSE RUN 20    'RUN clears all values
70 IF B = 0 THEN 80 ELSE RUN 30
80 IF C = 0 THEN 90 ELSE RUN 40
90 IF D = 0 THEN 100 ELSE RUN 50
100 PRINT
INPUT "Do you want to quit?(Y/N)", quit$
IF UCASE$(quit$) = "Y" THEN END ELSE RUN  'RUN without line number executes at first code line
```
  
<br>

```vb
A       B       C       D
1       2       3       4
0       2       3       4
0       0       3       4
0       0       0       4
0       0       0       0

Do you want to quit?(Y/N)_
```
  
<br>


</blockquote>

#### SEE ALSO

<blockquote>


* [CHAIN](CHAIN.md) , [SHELL](SHELL.md)
* [COMMAND\$](COMMAND\$.md)
</blockquote>
