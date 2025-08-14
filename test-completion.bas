' QB64PE Completion Provider Test File
' This file demonstrates the capabilities of the new completion providers

' Test basic keyword completion
' Type "pr" and you should see PRINT in the completion list

' Test inline completion for control structures
' Type "for" and you should see inline completion for FOR...NEXT loop

' Test inline completion for conditionals
' Type "if" and you should see inline completion for IF...THEN...ELSE

' Test function completion
' Type "le" and you should see LEN, LEFT$, etc. in the completion list

' Test metacommand completion
' Type "$" and you should see $INCLUDE, $CONSOLE, etc.

' User-defined elements will be detected:
DIM myVariable AS INTEGER
DIM myArray(1 TO 10) AS STRING

SUB MySubroutine(param AS INTEGER)
    PRINT "Hello from subroutine"
END SUB

FUNCTION MyFunction(x AS INTEGER) AS INTEGER
    MyFunction = x * 2
END FUNCTION

' Test context-aware completion
' Inside this SUB, type "my" and you should see myVariable, MyFunction, etc.
SUB TestCompletion
    ' Type variable names here to test local completion
    
    ' Type "exit" to see EXIT SUB suggestion
    
END SUB

' Main program
DO
    ' Type keywords here to test completion
    ' Try: print, input, for, if, select, etc.
    
    ' Type common idioms:
    ' - "main" for main loop pattern
    ' - "graphics" for graphics initialization
    ' - "file read" for file reading pattern
    
LOOP
