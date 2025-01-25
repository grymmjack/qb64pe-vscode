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


## [_IIF](IIF.md) [📖](https://qb64phoenix.com/qb64wiki/index.php/_IIF)
---
<blockquote>

### The _IIF function is a conditional operator-like feature allowing conditional evaluations with short-circuiting behavior.

</blockquote>

#### SYNTAX

<blockquote>

`result = _IIF ( expression , truePart , falsePart )`

</blockquote>

#### PARAMETERS

<blockquote>


* expression is a condition that evaluates to a logical value (true or false).
* truePart is the value or expression returned when expression evaluates to true.
* falsePart is the value or expression returned when expression evaluates to false.
</blockquote>

#### DESCRIPTION

<blockquote>


* The _IIF function provides a way to perform conditional evaluations, similar to the ternary operator in C (condition ? truePart : falsePart) .
* It ensures short-circuiting, meaning only the relevant branch ( truePart or falsePart ) is evaluated based on the condition.
* Since only the truePart or falsePart is evaluated, it ensures optimal performance and avoids unnecessary computation, as any procedures involved in the skipped branch are not called , be aware of this behavior.
* The return type is determined by the type of truePart .
* Mixing [STRING](STRING.md) with other data types in truePart and falsePart is not allowed.
* It allows inline evaluations, improving readability, and reducing the need for verbose [IF](IF.md) ... [THEN](THEN.md) ... [ELSE](ELSE.md) structures.
* A compiler error is thrown if expression cannot be evaluated as a boolean.

</blockquote>

#### EXAMPLES

<blockquote>

```vb
DIM userInput AS INTEGER
DIM result AS STRING

PRINT "Enter a number:"
INPUT userInput

result = _IIF(userInput MOD 2 = 0, "Even", "Odd")
PRINT "The number is "; result
```
  
<br>

```vb
Enter a number:
5
The number is Odd
```
  
<br>

```vb
DIM x AS INTEGER, y AS INTEGER
DIM max AS INTEGER

PRINT "Enter the first number:"
INPUT x
PRINT "Enter the second number:"
INPUT y

max = _IIF(x > y, x, y)
PRINT "The larger number is: "; max
```
  
<br>

```vb
Enter the first number:
10
Enter the second number:
20
The larger number is: 20
```
  
<br>

```vb
DIM a AS INTEGER, b AS SINGLE

PRINT "Enter a non-zero number:"
INPUT a

b = _IIF(a <> 0, 100 / a, 0) ' Avoids division by zero when a = 0
PRINT "Result: "; b
```
  
<br>

```vb
Enter a non-zero number:
0
Result: 0
```
  
<br>


</blockquote>

#### SEE ALSO

<blockquote>


* [IF...THEN](IF...THEN.md)
* SELECT [CASE](CASE.md)
* _NEGATE , _ANDALSO , _ORELSE
* [Boolean](Boolean.md)
</blockquote>
