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
CONST MAX_HEALTH = 100.0
CONST GRAVITY = 9.81
CONST DEFAULT_SPEED = 50
CONST DEBUG_MODE = 1

' Global shared variables
DIM SHARED players(MAX_PLAYERS) AS PlayerType
DIM SHARED currentPlayer AS INTEGER
DIM SHARED gameRunning AS INTEGER

' MySubroutine
' This is a sample subroutine
' @param num INTEGER The parameter description
SUB MySubroutine(num AS INTEGER)
    PRINT "Hello from subroutine"
    PRINT num%
END SUB

' Initialize the game with default settings
' Sets up all players with default values and prepares game state
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
' Updates the current player's score by adding the specified points
' @param points LONG The number of points to add to the score
' Returns the new total score after adding points
FUNCTION AddScore(points AS LONG) AS LONG
    ' Local variable within FUNCTION scope
    DIM newScore AS LONG
    
    players(currentPlayer).score = players(currentPlayer).score + points
    newScore = players(currentPlayer).score
    
    ' Return the new score
    AddScore = newScore
END FUNCTION

' Get formatted player information string
' Creates a formatted string containing player details
' @param playerIndex INTEGER The index of the player (1-based)
' Returns a formatted string with player information
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

' Calculate damage with armor reduction
' Applies damage to a player considering their armor level
' @param baseDamage SINGLE The base damage amount before armor reduction
' @param armorLevel INTEGER The player's armor level for damage reduction  
' @param isCritical INTEGER Whether this is a critical hit (non-zero for critical)
' Returns the final damage amount after armor calculation
FUNCTION CalculateDamage(baseDamage AS SINGLE, armorLevel AS INTEGER, isCritical AS INTEGER) AS SINGLE
    DIM finalDamage AS SINGLE
    DIM reduction AS SINGLE
    
    ' Calculate armor reduction (each armor level reduces damage by 5%)
    reduction = armorLevel * 0.05
    IF reduction > 0.8 THEN reduction = 0.8 ' Cap at 80% reduction
    
    finalDamage = baseDamage * (1.0 - reduction)
    
    ' Apply critical hit multiplier
    IF isCritical <> 0 THEN
        finalDamage = finalDamage * 1.5
    END IF
    
    CalculateDamage = finalDamage
END FUNCTION

' Display game status on screen
' Shows current player information and game state
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

' Main game loop with user interaction
' Handles user input and game state updates
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

' ============================================
' TEST AREA FOR SIGNATURE HELP AND COMPLETION
' ============================================
' Try typing the following to test the new features:
' 1. Type "Add" and press Ctrl+Space to see AddScore function
' 2. Type "AddScore(" to see parameter hint with description
' 3. Type "Cal" to see CalculateDamage function  
' 4. Type "CalculateDamage(" to see all parameter descriptions
' 5. Type "MyS" to see MySubroutine

' Test calls - try adding these and see signature help:
' AddScore(
' CalculateDamage(
' MySubroutine(

' Main program
InitializeGame
GameLoop

PRINT "Game Over!"
END

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

' ============================================
' TEST AREA FOR CONSTANT COMPLETION  
' ============================================
' Try typing the following to test constant value display:
' 1. Type "MAX" and press Ctrl+Space to see MAX_PLAYERS = 10
' 2. Type "GAME" to see GAME_TITLE = "QB64PE Test Game" 
' 3. Type "GRAV" to see GRAVITY = 9.81
' 4. Type "DEBUG" to see DEBUG_MODE = 1
'
' The completion should now show:
' CONST MAX_PLAYERS = 10
' CONST GAME_TITLE = "QB64PE Test Game"  
' CONST MAX_HEALTH = 100.0
' CONST GRAVITY = 9.81
' CONST DEFAULT_SPEED = 50
' CONST DEBUG_MODE = 1

' Test expressions using constants:
' IF DEBUG_MODE THEN
' FOR i = 1 TO MAX_PLAYERS
' players(i).health = MAX_HEALTH

END
