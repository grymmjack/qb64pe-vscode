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


## [SINGLE](SINGLE.md) [📖](https://qb64phoenix.com/qb64wiki/index.php/SINGLE)
---
<blockquote>

### SINGLE variables are 32-bits floating point numerical values up to seven digits precision ( see IEEE 754 Single precision ).

</blockquote>

#### DESCRIPTION

<blockquote>


* Values can range up to 7 digits. Decimal point accuracy depends on whole value places taken.
* The suffix ! can also be placed after a literal numerical value to designate the value as [SINGLE](SINGLE.md) .
* Values may be given as real number ( 123.456 ) or scientific notation using E as exponent marker ( 1.23456E+2 ).
* [PRINT](PRINT.md) usually takes the shorter of both notations (depending on the value) to output the numbers. In alternative you may use [PRINT](PRINT.md) USING to designate your desired output format.
* Floating decimal point numerical values cannot be _UNSIGNED .
* Values can be converted to 4-bytes [STRING](STRING.md) values using _MKS$ and back to numbers with _CVS .

</blockquote>

#### EXAMPLES

<blockquote>


</blockquote>

#### SEE ALSO

<blockquote>


* [DOUBLE](DOUBLE.md) , _FLOAT
* [DIM](DIM.md) , [DEFSNG](DEFSNG.md) , _DEFINE
* [MKS\$](MKS\$.md) , [CVS](CVS.md) , _MK$ , _CV
* [LEN](LEN.md) , Constants
* Variable Types
</blockquote>
