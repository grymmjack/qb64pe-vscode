' Fixture: basics.bas
' Baseline declarations plus doc comments.
$CONSOLE:ONLY

' A 2D vector
TYPE Vec2
    x AS SINGLE
    y AS SINGLE
END TYPE

' A player record with mixed field types
TYPE Player
    name AS STRING * 16 ' fixed-length string
    score AS _UNSIGNED _INTEGER64
    pos AS Vec2
END TYPE

CONST MAX_PLAYERS = 4
CONST TITLE = "Fixture"

DIM SHARED players(MAX_PLAYERS) AS Player
DIM count AS INTEGER
REDIM SHARED names(10) AS STRING
COMMON SHARED level AS LONG

InitGame
PRINT Add(1, 2)
SYSTEM

' Initialises the game state.
SUB InitGame
    STATIC initialised AS INTEGER
    DIM i AS INTEGER
    initialised = 1
END SUB

' Adds two integers.
' @param a first operand
' @param b second operand
FUNCTION Add (a AS INTEGER, b AS INTEGER)
    Add = a + b
END FUNCTION

' STATIC sub - locals persist between calls
SUB DrawSpike (X, Y) STATIC
    X = X + 1
END SUB
