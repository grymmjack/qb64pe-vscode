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


## [_MESSAGEBOX (function)](MESSAGEBOX_(function).md) [📖](https://qb64phoenix.com/qb64wiki/index.php/_MESSAGEBOX%20%28function%29)
---
<blockquote>

### The _MESSAGEBOX function displays a message dialog box, which presents a message and returns the button ID clicked by the user. The return value can be 0 for "cancel" / "no" , 1 for "ok" / "yes" , 2 for "no" in "yesnocancel" .

</blockquote>

#### SYNTAX

<blockquote>

`result& = _MESSAGEBOX ([ title$ ][, message$ ][, dialogType$ ][, iconType$ ][, defaultButton& ])`

</blockquote>

#### PARAMETERS

<blockquote>


* title$ is the dialog box title
* message$ is the dialog box message
* dialogType$ is the dialog box type and shows different buttons based on the value (this can be "ok" , "okcancel" , "yesno" , or "yesnocancel" )
* iconType$ is the icon type that is displayed inside the dialog box (this can be "info" , "warning" , "error" , or "question" )
* defaultButton& can be 0 for "cancel" / "no" , 1 for "ok" / "yes" , 2 for "no" in "yesnocancel"
</blockquote>

#### DESCRIPTION

<blockquote>


* "ok" , "okcancel" , "yesno" , or "yesnocancel" can be in any case
* "info" , "warning" , "error" , or "question" can be in any case
* All parameters accept nothing or an empty string ( "" ). In both cases system defaults are used
* The dialog box automatically becomes a modal window if the application window is visible

</blockquote>

#### EXAMPLES

<blockquote>

```vb
IF _MESSAGEBOX("My Cool App", "Do you want to hear a beep?", "yesno", "question") = 1 THEN
   BEEP
ELSE
   _MESSAGEBOX "My Cool App", "The sound of silence."
END IF
```
  
<br>


</blockquote>

#### SEE ALSO

<blockquote>


* _NOTIFYPOPUP
* _MESSAGEBOX
* _INPUTBOX$
* _SELECTFOLDERDIALOG$
* _COLORCHOOSERDIALOG
* _OPENFILEDIALOG$
* _SAVEFILEDIALOG$
</blockquote>
