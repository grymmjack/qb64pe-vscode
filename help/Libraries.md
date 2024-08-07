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


## [Libraries](Libraries.md) [📖](https://qb64phoenix.com/qb64wiki/index.php/Libraries)
---
<blockquote>

### 

</blockquote>

#### EXAMPLES

<blockquote>

```vb
QB64 Library Conversion Types

C Name        Description                 Size*    Signed       Range*        Unsigned
char        Character or small integer.   1 byte   -128 to 127                0 to 255
short int   Short Integer(Word)           2 byte   -32768 to 32767            0 to 65535
int         Integer(Dword)                4 byte   -2147483648 to 2147483647  0 to 4294967295
long int    Int32, Long integer or Long   4 byte   -2147483648 to 2147483647  0 to 4294967295
long long   Long long (Qword)             8 byte   -9223372036854775808 to 9223372036854775807
bool        Boolean value true or false.  1 byte   true or false
float       Floating point number         4 byte   +/- 3.4E +/- 38 (~7 digits)
double	    Double precision floating.    8 byte   1.7976E+308 (~15 digits)
long double Long double precision float  10 byte   1.1897E+4932 (~22 digits)
wchar_t     Wide character(Unicode) 	  2 or 4   1 wide character
PVOID       void pointer(void *)           ANY     Pointer or offset
```
  
<br>

```vb
Windows API Data Structures

Name               Description                 Bits                    QB64 Type
bit               8 bits in one byte            1                       _BIT
nybble            2 nybbles in one byte         4                       _BIT * 4
byte              1 byte (2 nybbles)            8                       _BYTE
Char(FunctionA)   ASCII character               8(LEN(buffer))          _BYTE
WORD              2 bytes                      16                       INTEGER
CharW(FunctionW)  Unicode wide character       16(LEN(buffer) \ 2)      _BYTE * 2
DWORD             4 bytes                      32                       LONG
QWORD             8 bytes                      64                       _INTEGER64
Ptr or LP         Short or Long Pointer name   ANY                      _OFFSET
```
  
<br>


</blockquote>
