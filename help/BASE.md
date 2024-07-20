## OPTION BASE
---

### The OPTION BASE statement is used to set the default lower bound of arrays.

#### SYNTAX

`OPTION BASE {0|1}`

#### DESCRIPTION
* This statement affects array declarations where the lower bound of a dimension is not specified.
* When used, [OPTION](./OPTION.md) [BASE](./BASE.md) must come before any array declarations ( [DIM](./DIM.md) ) to be affected.
* By default, the lower bound for arrays is zero, and may be changed to one using the statement.
* Otherwise, arrays will be dimensioned from element 0 if you [DIM](./DIM.md) just the upper bounds.
* You can also set other array boundaries by using [TO](./TO.md) in the [DIM](./DIM.md) declaration such as [DIM](./DIM.md) array(5 [TO](./TO.md) 10)


#### EXAMPLES
##### Example 1: Set the default lower bound for array declarations to one.
```vb
OPTION BASE 1

' Declare a 5-element one-dimensional array with element indexes of one through five.
DIM array(5) AS INTEGER

PRINT LBOUND(array)
```
  
```vb
1
```
  
##### Example 2: Set the default lower bound for array declarations to zero.
```vb
OPTION BASE 0

' Declare an 18-element two-dimensional array with element indexes of zero through two
' for the first dimension, and 10 through 15 for the second dimension.
DIM array(2, 10 to 15) AS INTEGER

PRINT LBOUND(array, 1)
PRINT LBOUND(array, 2)
```
  
```vb
0
10
```
  


#### SEE ALSO
* Arrays , [LBOUND](./LBOUND.md) , [UBOUND](./UBOUND.md)
* [DIM](./DIM.md) , [REDIM](./REDIM.md) , [STATIC](./STATIC.md) , [COMMON](./COMMON.md)