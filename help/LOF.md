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


## [LOF](LOF.md) [📖](https://qb64phoenix.com/qb64wiki/index.php/LOF)
---
<blockquote>

### The LOF function is used to find the length of an OPEN file in bytes, or content length of an HTTP response.

</blockquote>

#### SYNTAX

<blockquote>

`totalBytes& = LOF ([#] fileNumber )`

</blockquote>

#### DESCRIPTION

<blockquote>


* For regular OPENed files:
* [LOF](LOF.md) returns the number of bytes in an OPENed designated fileNumber . File is empty if it returns 0.
* fileNumber is the number of the opened file. # is not required.
* Often used to determine the number of records in a [RANDOM](RANDOM.md) access file.
* Can also be used to avoid reading an empty file, which would create an error.
* [LOF](LOF.md) in QB64 can return up to 9 GB (9,223,372,036 bytes) file sizes.
* For HTTP handles opened using _OPENCLIENT :
* [LOF](LOF.md) returns the length listed in the Content-Length header of the HTTP response.
* If no Content-Length header was provided on the HTTP response, then [LOF](LOF.md) return -1

</blockquote>

#### EXAMPLES

<blockquote>

```vb
OPEN file$ FOR RANDOM AS #1 LEN = LEN(Type_variable)
 NumRecords% = LOF(1) \ RecordLEN%
```
  
<br>

```vb
$UNSTABLE:HTTP
h& = _OPENCLIENT("HTTP:https://qb64phoenix.com")
PRINT LOF(h&)
```
  
<br>


</blockquote>

#### SEE ALSO

<blockquote>


* [LEN](LEN.md) , [EOF](EOF.md) , [BINARY](BINARY.md) , [RANDOM](RANDOM.md) , [TYPE](TYPE.md)
</blockquote>
