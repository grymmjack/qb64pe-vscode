' Fixture: dim_lists.bas
' Multiple declarations per line, DIM AS lists, mixed case, fixed strings, ranges.
$CONSOLE:ONLY

DIM a AS LONG, b AS LONG
DIM buf AS STRING, z AS _UNSIGNED LONG, a8 AS _UNSIGNED _BYTE
DIM AS LONG basei, i
Dim As Long note, duration
DIM name AS STRING * 8
DIM SHARED grid(1 TO 10, 1 TO 10) AS INTEGER
DIM matrix(3, 3)
REDIM _PRESERVE items(20) AS STRING

Fill
SYSTEM

SUB Fill
    STATIC calls AS LONG, last AS LONG
    DIM AS INTEGER row, col
    calls = calls + 1
END SUB
