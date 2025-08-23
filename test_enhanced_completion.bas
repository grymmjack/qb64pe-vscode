' Test file for enhanced QB64PE completion features
' This file demonstrates user-defined SUBs, FUNCTIONs, TYPEs, variables, and constants

' User-defined type for player information
TYPE PlayerType
    name AS STRING * 30
    score AS LONG
    level AS INTEGER
    health AS SINGLE
END TYPE

' Global constants
CONST MAX_PLAYERS = 10
CONST GAME_TITLE = "QB64PE Test Game"

' Global shared variables
DIM SHARED players(MAX_PLAYERS) AS PlayerType
DIM SHARED currentPlayer AS INTEGER
DIM SHARED gameRunning AS INTEGER

' Initialize the game
SUB InitializeGame
    ' Local variables within SUB scope
    DIM i AS INTEGER
    DIM defaultName AS STRING
    
    defaultName = "Player"
    gameRunning = -1 ' TRUE
    
    FOR i = 1 TO MAX_PLAYERS
        players(i).name = defaultName + STR$(i)
        players(i).score = 0
        players(i).level = 1
        players(i).health = 100.0
    NEXT i
    
    currentPlayer = 1
END SUB

' Add points to current player's score
FUNCTION AddScore(points AS LONG) AS LONG
    ' Local variable within FUNCTION scope
    DIM newScore AS LONG
    
    players(currentPlayer).score = players(currentPlayer).score + points
    newScore = players(currentPlayer).score
    
    ' Return the new score
    AddScore = newScore
END FUNCTION

' Get player information
FUNCTION GetPlayerInfo$(playerIndex AS INTEGER)
    DIM info AS STRING
    DIM p AS PlayerType
    
    IF playerIndex >= 1 AND playerIndex <= MAX_PLAYERS THEN
        p = players(playerIndex)
        info = "Name: " + p.name + " Score: " + STR$(p.score) + " Level: " + STR$(p.level)
    ELSE
        info = "Invalid player index"
    END IF
    
    GetPlayerInfo$ = info
END FUNCTION

' Display game status
SUB DisplayStatus
    ' Local variables
    DIM i AS INTEGER
    DIM statusLine AS STRING
    
    CLS
    PRINT GAME_TITLE
    PRINT "Current Player: "; currentPlayer
    PRINT
    
    FOR i = 1 TO MAX_PLAYERS
        statusLine = GetPlayerInfo$(i)
        PRINT statusLine
    NEXT i
END SUB

' Main game loop
SUB GameLoop
    DIM userInput AS STRING
    DIM points AS LONG
    
    DO WHILE gameRunning
        DisplayStatus
        
        PRINT
        PRINT "Enter points to add (or 'q' to quit): ";
        INPUT userInput
        
        IF LCASE$(userInput) = "q" THEN
            gameRunning = 0
        ELSE
            points = VAL(userInput)
            IF points > 0 THEN
                DIM newScore AS LONG
                newScore = AddScore(points)
                PRINT "New score: "; newScore
            END IF
        END IF
        
        _DELAY 1
    LOOP
END SUB

' Main program
InitializeGame
GameLoop

PRINT "Game Over!"
END
