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


## [_LOGMINLEVEL](LOGMINLEVEL.md) [📖](https://qb64phoenix.com/qb64wiki/index.php/_LOGMINLEVEL)
---
<blockquote>

### The _LOGMINLEVEL function returns the current minimum logging level that is being output.

</blockquote>

#### SYNTAX

<blockquote>

`level& = _LOGMINLEVEL`

</blockquote>

#### PARAMETERS

<blockquote>


* The return value level& is a number from 1 to 5 indicating the current minimum level of logging enabled. The below table indicates the mapping:
</blockquote>

#### DESCRIPTION

<blockquote>


* The purpose of _LOGMINLEVEL is to allow programs to skip generating expensive logging if that logging would not be output anywhere.
* For example, you may have a very large array of integers that you want to log fairly often - generating the strings of the log messages for that array can slow down your program even if those messages are ultimately never written anywhere. By checking _LOGMINLEVEL before generating those log messages you can avoid that expensive work if it would not be used but also still produce it when you request it.
* If the function returns a 2, that indicates that only logging at the Information level and above is being captured somewhere. If the function returns a 5, that means no logging is being captured anywhere.

</blockquote>

#### EXAMPLES

<blockquote>

```vb
level& = _LOGMINLEVEL

IF level& < 2 THEN
   ' Generate expensive log messages
   _LOGTRACE expensiveLogMessage$
END IF

END
```
  
<br>


</blockquote>

#### SEE ALSO

<blockquote>


* _LOGTRACE , _LOGINFO
* _LOGWARN , _LOGERROR
* Logging
</blockquote>
