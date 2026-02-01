'' Test file for hover provider case-insensitive keyword lookup
'' Try hovering over these keywords in different cases:

' Test PRINT in different cases
PRINT "uppercase"
print "lowercase"
Print "mixed case"

' Test CLS in different cases  
CLS
cls
Cls

' Test COLOR in different cases
COLOR 15
color 15
Color 15

' Test _NEWIMAGE in different cases
screen _NEWIMAGE(800, 600, 32)
screen _newimage(800, 600, 32)
screen _Newimage(800, 600, 32)

' Test $INCLUDE in different cases
'$INCLUDE: 'test.bi'
'$include: 'test.bi'
'$Include: 'test.bi'

' Test other keywords
DIM x AS INTEGER
dim y as integer
Dim z As Integer

FOR i = 1 TO 10
for j = 1 to 10
For k = 1 To 10
