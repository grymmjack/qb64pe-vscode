' Fixture: edge_cases.bas
' Multi-statement lines, continuations, single-line IF, labels, DECLARE LIBRARY,
' and keyword-like text inside comments and strings.
$CONSOLE:ONLY
OPTION _EXPLICIT

DECLARE LIBRARY "fastmath"
    FUNCTION Fast_Sqrt& (BYVAL val AS LONG)
    SUB Fast_Seed (BYVAL seed AS LONG)
END DECLARE

DECLARE LIBRARY
    FUNCTION getpid& ()
END DECLARE

DIM first AS LONG: DIM second AS LONG
DIM third AS LONG: third = 3
REM DIM notreal AS LONG
' SUB FakeSub is only mentioned in a comment
PRINT "SUB NotASub": PRINT "FUNCTION NotAFunc"
DIM msg AS STRING
msg = "DIM inside_string AS LONG"

IF first > 0 THEN second = 1
If third > 2 Then first = third - 1
IF msg = "" THEN PRINT "empty" ELSE PRINT "full"

DIM total AS LONG
total = first + _
        second + _
        third

GOSUB handler
GOTO finish

handler:
    PRINT "handled"
    RETURN

finish:
SYSTEM

' A sub whose parameter list spans lines
SUB Configure (width AS INTEGER, _
               height AS INTEGER, _
               title AS STRING)
    DIM area AS LONG: area = width * height
    IF area > 0 THEN PRINT title
END SUB

FUNCTION Clamp& (v AS LONG, lo AS LONG, hi AS LONG)
    IF v < lo THEN Clamp& = lo: EXIT FUNCTION
    IF v > hi THEN Clamp& = hi: EXIT FUNCTION
    Clamp& = v
END FUNCTION
