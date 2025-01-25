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


## [ON ERROR](ON_ERROR.md) [📖](https://qb64phoenix.com/qb64wiki/index.php/ON%20ERROR)
---
<blockquote>

### The ON ERROR statement is used in conjunction with GOTO to handle errors in a program.

</blockquote>

#### PARAMETERS

<blockquote>


* lineNumberOrLabel must be a line number or program label in the main part of your program usually placed after the [END](END.md) or [SYSTEM](SYSTEM.md) statement. Line numbers or labels inside of [SUB](SUB.md) or [FUNCTION](FUNCTION.md) blocks are not allowed.
* 0 (zero) will disable all program based error handling, i.e. errors remain unhandled .
</blockquote>

#### DESCRIPTION

<blockquote>


* An unhandled error in a program will cause execution to stop and an error message box is displayed to the user, who can choose to continue (ignore the error - which could have unexpected results) or end the program.
* Use [ON](ON.md) [ERROR](ERROR.md) when your program performs operations that are likely to generate errors, like file access operations.
* [ON](ON.md) [ERROR](ERROR.md) statements can be in the main code section or in [SUB](SUB.md) or [FUNCTION](FUNCTION.md) procedures, but the line number or label must always be in the main code section.
* [ON](ON.md) [ERROR](ERROR.md) statements take precedence in the order they are encountered, i.e. the most recently set handler is used. Subsequent [ON](ON.md) [ERROR](ERROR.md) statements will override the previous one.
* [ON](ON.md) [ERROR](ERROR.md) [GOTO](GOTO.md) 0 can be used to disable program based error trapping and give default error message boxes.
* [GOTO](GOTO.md) is required in the statement. Cannot use [GOSUB](GOSUB.md) .
* QB64 and QB64-PE do not support the PDS (QuickBASIC 7) [ON](ON.md) [ERROR](ERROR.md) [RESUME](RESUME.md) [NEXT](NEXT.md) statement.

</blockquote>

#### EXAMPLES

<blockquote>

```vb
'install our own error handler
ON ERROR GOTO errHandler
'now simulate an "Out of Memory" error
ERROR 7
'our error handler will return to this point
PRINT "Error was handled.": PRINT
'now we disable our error handler
ON ERROR GOTO 0
COLOR 9: PRINT "Handler disabled.": COLOR 7
'without our own error handler the following error is reported
'in the usual message box popup again
PRINT "The next error will no longer be handled, press any key ...": SLEEP
ERROR 7
END

'the error handler label must be part of the main program, local
'labels inside a SUB/FUNCTION are not allowed for error handlers
errHandler:
COLOR 10: PRINT "Start handling error"; ERR; "on program file line"; _ERRORLINE;
BEEP: PRINT "... done.": COLOR 7
RESUME NEXT 'returns execution to the code following the error
```
  
<br>

```vb
Start handling error 7 on program file line 6 ... done.
Error was handled.

Handler disabled.
The next error will no longer be handled, press any key ...
```
  
<br>

```vb
ON ERROR GOTO mainHandler
ERROR 7
PRINT "Error was handled.": PRINT
LegacyErrorTest
PRINT "Error was handled.": PRINT
ERROR 7
PRINT "Error was handled.": PRINT
ON ERROR GOTO 0
COLOR 9: PRINT "Handler disabled.": COLOR 7
PRINT "The next error will no longer be handled, press any key ...": SLEEP
ERROR 7
END

'the error handler label must be part of the main program, local
'labels inside a SUB/FUNCTION are not allowed for error handlers
mainHandler:
COLOR 10: PRINT "Main handler starts handling error"; ERR; "on program file line"; _ERRORLINE;
BEEP: PRINT "... done.": COLOR 7
RESUME NEXT
'an alternative error handler which we set from within a SUB/FUNCTION
'however, the error handler label must still be part of the main program
subHandler:
COLOR 12: PRINT "Sub handler starts handling error"; ERR; "on program file line"; _ERRORLINE;
BEEP: PRINT "... done.": COLOR 7
RESUME NEXT

SUB LegacyErrorTest
'the next line overrides the currently active "mainHandler"
'with our new "subHandler"
ON ERROR GOTO subHandler
ERROR 7
'unfortunately the legacy QuickBASIC/QBasic syntax has no function to
'restore back to the old handler, so you need to know which handler was
'active and restore that manually
ON ERROR GOTO mainHandler
END SUB
```
  
<br>

```vb
Main handler starts handling error 7 on program file line 4 ... done.
Error was handled.

Sub handler starts handling error 7 on program file line 33 ... done.
Error was handled.

Main handler starts handling error 7 on program file line 8 ... done.
Error was handled.

Handler disabled.
The next error will no longer be handled, press any key ...
```
  
<br>

```vb
ON ERROR GOTO mainHandler
ERROR 7
PRINT "Error was handled.": PRINT
QB64peErrorTest
PRINT "Error was handled.": PRINT
ERROR 7
PRINT "Error was handled.": PRINT
ON ERROR GOTO 0
COLOR 9: PRINT "Handler disabled.": COLOR 7
PRINT "The next error will no longer be handled, press any key ...": SLEEP
ERROR 7
END

mainHandler:
COLOR 10: PRINT "Main handler starts handling error"; ERR; "on program file line"; _ERRORLINE;
BEEP: PRINT "... done.": COLOR 7
RESUME NEXT
subHandler:
COLOR 12: PRINT "Sub handler starts handling error"; ERR; "on program file line"; _ERRORLINE;
BEEP: PRINT "... done.": COLOR 7
RESUME NEXT

SUB QB64peErrorTest
'the next line overrides the currently active "mainHandler"
'with our new "subHandler", but the _NEWHANDLER keyword explicitly
'designates this as override and to remember the former handler
ON ERROR GOTO _NEWHANDLER subHandler
ERROR 7
'now the following _LASTHANDLER syntax can easily restore back
'to the former handler without we need to know which one it was,
ON ERROR GOTO _LASTHANDLER
END SUB
```
  
<br>

```vb
Main handler starts handling error 7 on program file line 4 ... done.
Error was handled.

Sub handler starts handling error 7 on program file line 30 ... done.
Error was handled.

Main handler starts handling error 7 on program file line 8 ... done.
Error was handled.

Handler disabled.
The next error will no longer be handled, press any key ...
```
  
<br>


</blockquote>

#### SEE ALSO

<blockquote>


* [ERR](ERR.md) , [ERL](ERL.md) , [RESUME](RESUME.md)
* [ON...GOTO](ON...GOTO.md)
* _ERRORLINE , _INCLERRORLINE , _INCLERRORFILE$
* [ERROR](ERROR.md)
* [ERROR](ERROR.md) Codes
</blockquote>
