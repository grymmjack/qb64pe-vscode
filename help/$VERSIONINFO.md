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


## [\$VERSIONINFO](\$VERSIONINFO.md) [📖](https://qb64phoenix.com/qb64wiki/index.php/%24VERSIONINFO)
---
<blockquote>

### The $VERSIONINFO metacommand adds text metadata to the resulting executable for identification purposes across the OS. Windows-only.

</blockquote>

#### SYNTAX

<blockquote>

`$VERSIONINFO : key = value`

</blockquote>

#### PARAMETERS

<blockquote>


* Text keys can be: Comments, CompanyName, FileDescription, FileVersion, InternalName, LegalCopyright, LegalTrademarks, OriginalFilename, ProductName, ProductVersion, Web
* Numeric keys can be: FILEVERSION# and PRODUCTVERSION#
* When provided, the numerical keys FILEVERSION# and PRODUCTVERSION# will also provide values to the text keys FileVersion and ProductVersion, if the text versions are not provided separately. (QB64-PE v0.6.0 and up)
</blockquote>

#### DESCRIPTION

<blockquote>


* Text and numerical values are string literals without quotes entered by programmer. No variables are accepted. (variable names would be interpreted as literals).
* Numeric key= value must be 4 comma-separated numerical text values entered by programmer which usually stand for major, minor, revision and build numbers).
* A manifest file is automatically embedded into the resulting .exe file so that Common Controls v6.0 gets linked at runtime, if required.
* Keyword not supported in Linux or macOS versions

</blockquote>

#### EXAMPLES

<blockquote>



##### Example: Adding metadata to a Windows exe compiled with QB64:
```vb
$VERSIONINFO:CompanyName=Your company name goes here
$VERSIONINFO:FILEVERSION#=1,0,0,0
$VERSIONINFO:PRODUCTVERSION#=1,0,0,0
```
  
<br>


</blockquote>

#### SEE ALSO

<blockquote>


* [\$EXEICON](\$EXEICON.md)
* _ICON
* VERSIONINFO resource (MSDN)
</blockquote>
