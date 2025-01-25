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


## [_TOSTR\$](TOSTR\$.md) [📖](https://qb64phoenix.com/qb64wiki/index.php/_TOSTR%24)
---
<blockquote>

### The _TOSTR$ function returns the STRING representation of a numerical value. It's a successor of the legacy STR$ function.

</blockquote>

#### SYNTAX

<blockquote>

`result$ = _TOSTR$ ( value [, digits ])`

</blockquote>

#### PARAMETERS

<blockquote>


* value is any numerical type value to convert, literal or variable.
* digits is optional, if given it determines the maximum number of significant digits to convert for floating point values.
* This argument has no effect for integer values and is silently ignored, if given.
* For [SINGLE](SINGLE.md) values 1-7 digits are possible, for [DOUBLE](DOUBLE.md) values 1-16 digits and for _FLOAT values 1-19 digits.
* Digit numbers exceeding the possible range are clipped to either the minimum or maximum possible.
* Negative digit numbers will cause an Illegal function call error.
* The digits exceeding the given maximum are not simply cut off, but rounded to the final position converted. If rounding results into a trailing zero(0) , then it is omitted.
</blockquote>

#### DESCRIPTION

<blockquote>


* Different from the legacy [STR\$](STR\$.md) this function will not add a leading space to positive values, hence you can waive to the usual trimming using [LTRIM\$](LTRIM\$.md) or _TRIM$ .
* While the legacy [STR\$](STR\$.md) can only handle _FLOAT values as long as they not exceed the [DOUBLE](DOUBLE.md) range, this function supports the full _FLOAT range.

</blockquote>

#### EXAMPLES

<blockquote>

```vb
'min/max values for SINGLE, DOUBLE and _FLOAT
smi! = -3.402823E+38
smf! = 1.175494E-38
sma! = 3.402823E+38
dmi# = -1.797693134862315D+308
dmf# = 2.225073858507201D-308
dma# = 1.797693134862315D+308
fmi## = -1.189731495357231765F+4932
fmf## = 3.362103143112093506F-4932
fma## = 1.189731495357231765F+4932

PRINT "Values enclosed by () to show there's no leading/trailing space."
PRINT
PRINT "min.   SINGLE: ("; _TOSTR$(smi!); ")"
PRINT "min. fraction: ("; _TOSTR$(smf!); ")"
PRINT "max.   SINGLE: ("; _TOSTR$(sma!); ")"
PRINT
PRINT "min.   DOUBLE: ("; _TOSTR$(dmi#); ")"
PRINT "min. fraction: ("; _TOSTR$(dmf#); ")"
PRINT "max.   DOUBLE: ("; _TOSTR$(dma#); ")"
PRINT
PRINT "min.   _FLOAT: ("; _TOSTR$(fmi##); ")"
PRINT "min. fraction: ("; _TOSTR$(fmf##); ")"
PRINT "max.   _FLOAT: ("; _TOSTR$(fma##); ")"

END
```
  
<br>

```vb
Values enclosed by () to show there's no leading/trailing space.

min.   SINGLE: (-3.402823E+38)
min. fraction: (1.175494E-38)
max.   SINGLE: (3.402823E+38)

min.   DOUBLE: (-1.797693134862315D+308)
min. fraction: (2.225073858507201D-308)
max.   DOUBLE: (1.797693134862315D+308)

min.   _FLOAT: (-1.189731495357231765F+4932)
min. fraction: (3.362103143112093506F-4932)
max.   _FLOAT: (1.189731495357231765F+4932)
```
  
<br>

```vb
num## = _PI(10): typ$ = "_FLOAT": mi% = 1: ma% = 19

PRINT "Printing _PI(10) as "; typ$; ":"
PRINT "  default:  "; _TOSTR$(num##)
FOR x% = 0 TO 20
   PRINT USING "## digits:  "; x%;
   num$ = _TOSTR$(num##, x%)
   PRINT num$; SPC(ma% + 5 - LEN(num$));
   IF x% < mi% THEN
       PRINT "(forced to at least 1 digit)"
   ELSEIF x% > ma% THEN
       PRINT "(cropped to max. digits for "; typ$; ")"
   ELSEIF x% > 1 _ANDALSO INSTR(num$, ".") > 0 _ANDALSO LEN(num$) < x% + 1 THEN
       PRINT "(trailing zero (rounding) omitted)"
   ELSE
       PRINT
   END IF
NEXT x%

END
```
  
<br>

```vb
Printing _PI(10) as _FLOAT:
 default:  31.41592653589793116
0 digits:  3F+01                   (forced to at least 1 digit)
1 digits:  3F+01                   
2 digits:  31                      
3 digits:  31.4                    
4 digits:  31.42                   
5 digits:  31.416                  
6 digits:  31.4159                 
7 digits:  31.41593                
8 digits:  31.415927               
9 digits:  31.4159265              
10 digits:  31.41592654             
11 digits:  31.415926536            
12 digits:  31.4159265359           
13 digits:  31.4159265359           (trailing zero (rounding) omitted)
14 digits:  31.415926535898         
15 digits:  31.4159265358979        
16 digits:  31.41592653589793       
17 digits:  31.415926535897931      
18 digits:  31.4159265358979312     
19 digits:  31.41592653589793116    
20 digits:  31.41592653589793116    (cropped to max. digits for _FLOAT)
```
  
<br>


</blockquote>

#### SEE ALSO

<blockquote>


* [VAL](VAL.md) , [STR\$](STR\$.md)
* _BIN$ , [HEX\$](HEX\$.md) , [OCT\$](OCT\$.md)
</blockquote>
