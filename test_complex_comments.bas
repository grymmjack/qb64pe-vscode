' Test file for complex comment parsing
' 
' This file tests the improved comment handling where:
' 1. @param lines are used ONLY for parameter documentation (not main description)
' 2. Main description includes only the descriptive text
' 3. Complex comment patterns ('' and ') are handled cleanly

''
' This is a convenience SUB for updating and drawing the bounding box
' You can call this single SUB from your main loop
' @param showHUD INTEGER Show the HUD debug information? (TRUE | FALSE)
'
SUB GJ_BBX_Tick(showHUD AS INTEGER)
    PRINT "This demonstrates clean documentation without @param duplication"
END SUB

''
' Initialize the bounding box with specified dimensions
' This function sets up all the default values for the bounding box
' @param x INTEGER x Position
' @param y INTEGER y Position  
' @param w INTEGER Width
' @param h INTEGER Height
'
SUB GJ_BBX_InitBox (x AS INTEGER, y AS INTEGER, w AS INTEGER, h AS INTEGER)
    PRINT "Test function"
END SUB

''
' Poll the mouse state
' @param m GJ_BBX_MouseState The mouse state to update
' @param init INTEGER Is this the initial poll? (TRUE | FALSE)
'
SUB GJ_BBX_PollMouse(m AS GJ_BBX_MouseState, init AS INTEGER)
    PRINT "Test function"
END SUB

'
' Simple comment with just apostrophe and space
'
SUB SimpleTest
    PRINT "Simple test"
END SUB

''
''
' Multiple empty comment lines
' @param value SINGLE A test parameter
' This function does something useful
''
'
FUNCTION TestFunction(value AS SINGLE) AS SINGLE
    TestFunction = value * 2
END FUNCTION

' Single line comment
SUB SingleLineComment
    PRINT "Single line"
END SUB

END
