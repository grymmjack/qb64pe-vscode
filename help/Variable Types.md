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
    margin: 0 0 1em 0  !important;
    color: #88f !important;
    border: 0 !important;
}
code {
    background: #000 !important;
    margin: 0 !important;
    padding: 8px !important;
    border-radius: 8px !important; 
    border: 1px solid #567 !important;
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
    border-radius: 8px !important; 
    border: 1px solid #567 !important;
    margin: 0 !important;
    box-shadow: 0px 5px 0px rgba(0, 0, 0, 0.25) !important;
}
a:link, a:visited, a:hover, a:active {
    color: #ff0 !important;
}

</style>

## [Variable_Types](Variable_Types.md) [📖](https://qb64phoenix.com/qb64wiki/index.php/Variable Types)
---
<blockquote>

### QB64 uses more variable types than QBasic ever did. The variable type determines the size of values that numerical variables can hold.

</blockquote>

#### EXAMPLES

<blockquote>

```vb
Table 1: The variable types supported by the QB64 language.
┌───────────────────────────────────────────────────────────────────────────┐
│                              Numerical types                              │
├──────────────────────┬───────────┬────────────────────────────┬───────────┤
│      Type Name       │   Type    │       Minimum value        │  Size in  │
│                      │  suffix   │       Maximum value        │   Bytes   │
├──────────────────────┼───────────┼────────────────────────────┼───────────┤
│         _BIT         │     &grave;     │                         -1 │    1/8    │
│                      │           │                          0 │           │
├──────────────────────┼───────────┼────────────────────────────┼───────────┤
│       _BIT * n       │    &grave;n     │                       -128 │    n/8    │
│                      │           │                        127 │           │
├──────────────────────┼───────────┼────────────────────────────┼───────────┤
│    _UNSIGNED _BIT    │    ~&grave;     │                          0 │    1/8    │
│                      │           │                          1 │           │
├──────────────────────┼───────────┼────────────────────────────┼───────────┤
│        _BYTE         │    %%     │                       -128 │     1     │
│                      │           │                        127 │           │
├──────────────────────┼───────────┼────────────────────────────┼───────────┤
│   _UNSIGNED _BYTE    │    ~%%    │                          0 │     1     │
│                      │           │                        255 │           │
├──────────────────────┼───────────┼────────────────────────────┼───────────┤
│       INTEGER        │     %     │                    -32,768 │     2     │
│                      │           │                     32,767 │           │
├──────────────────────┼───────────┼────────────────────────────┼───────────┤
│  _UNSIGNED INTEGER   │    ~%     │                          0 │     2     │
│                      │           │                     65,535 │           │
├──────────────────────┼───────────┼────────────────────────────┼───────────┤
│         LONG         │     &     │             -2,147,483,648 │     4     │
│                      │           │              2,147,483,647 │           │
├──────────────────────┼───────────┼────────────────────────────┼───────────┤
│    _UNSIGNED LONG    │    ~&     │                          0 │     4     │
│                      │           │              4,294,967,295 │           │
├──────────────────────┼───────────┼────────────────────────────┼───────────┤
│      _INTEGER64      │    &&     │ -9,223,372,036,854,775,808 │     8     │
│                      │           │  9,223,372,036,854,775,807 │           │
├──────────────────────┼───────────┼────────────────────────────┼───────────┤
│ _UNSIGNED _INTEGER64 │    ~&&    │                          0 │     8     │
│                      │           │ 18,446,744,073,709,551,615 │           │
├──────────────────────┼───────────┼────────────────────────────┼───────────┤
│        SINGLE        │     !     │              -2.802597E-45 │     4     │
│                      │ (or none) │              +3.402823E+38 │           │
├──────────────────────┼───────────┼────────────────────────────┼───────────┤
│        DOUBLE        │     #     │    -4.490656458412465E-324 │     8     │
│                      │           │    +1.797693134862310E+308 │           │
├──────────────────────┼───────────┼────────────────────────────┼───────────┤
│        _FLOAT        │    ##     │                -1.18E-4932 │    32     │
│                      │           │                +1.18E+4932 │ (10 used) │
├──────────────────────┼───────────┼────────────────────────────┼───────────┤
│       _OFFSET        │    %&     │ -9,223,372,036,854,775,808 │  use LEN  │
│                      │           │  9,223,372,036,854,775,807 │           │
├──────────────────────┼───────────┼────────────────────────────┼───────────┤
│  _UNSIGNED _OFFSET   │    ~%&    │                          0 │  use LEN  │
│                      │           │ 18,446,744,073,709,551,615 │           │
├──────────────────────┼───────────┼────────────────────────────┴───────────┤
│         _MEM         │   none    │ An internal TYPE like memory variable. │
└──────────────────────┴───────────┴────────────────────────────────────────┘
For the floating-point numeric types SINGLE (default when not assigned),
DOUBLE and _FLOAT, the minimum values represent the smallest values closest
to zero, while the maximum values represent the largest values closest to
pos./neg. infinity. _OFFSET dot values are used as a part of the _MEM
variable type in QB64 to return or set the position in memory.

┌───────────────────────────────────────────────────────────────────────────┐
│                                Text types                                 │
├──────────────────────┬───────────┬────────────────────────────┬───────────┤
│      Type Name       │   Type    │       Minimum value        │  Size in  │
│                      │  suffix   │       Maximum value        │   Bytes   │
├──────────────────────┼───────────┼────────────────────────────┼───────────┤
│        STRING        │     $     │                          0 │  use LEN  │
│                      │           │              2,147,483,647 │           │
├──────────────────────┼───────────┼────────────────────────────┼───────────┤
│      STRING * n      │    $n     │                          1 │     n     │
│                      │           │              2,147,483,647 │           │
└──────────────────────┴───────────┴────────────────────────────┴───────────┘
While a regular variable length STRING may have a minimum length of zero
(empty string), the fixed length string type STRING * n, where n is an
integer length value, must have a minimum length of at least one character.
```
  
<br>
</blockquote>
