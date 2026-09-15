' Fixture: sigils.bas
' Type-suffix (sigil) identifiers: $ % & ! # && ~%
$CONSOLE:ONLY

DIM title$, count%, big&, ratio!, precise#
DIM Exes$(8), Formats$(8)
DIM flags~%(4)
DIM huge&&

title$ = Describe$(3)
PRINT Half%(10); Scale!(2.5, 2#)
Show title$, count%
SYSTEM

' Sigil on function name and params, no space before the paren
FUNCTION Describe$(n%)
    Describe$ = "n=" + STR$(n%)
END FUNCTION

FUNCTION Half% (value%)
    Half% = value% \ 2
END FUNCTION

FUNCTION Scale! (f!, factor#)
    Scale! = f! * factor#
END FUNCTION

SUB Show (msg$, times%)
    DIM i%
    FOR i% = 1 TO times%: PRINT msg$: NEXT
END SUB
