' Test file demonstrating $INCLUDE functionality
' This file should have access to symbols from mathutils.bi

'$INCLUDE: 'mathutils.bi'

' Test the included functions and types
DIM pos1 AS Vector2D
DIM pos2 AS Vector2D
DIM result AS SINGLE
DIM angle AS SINGLE

' Initialize positions
pos1.x = 10.0
pos1.y = 20.0

pos2.x = 30.0
pos2.y = 40.0

' Test included functions - these should show up in completion
result = Distance(pos1.x, pos1.y, pos2.x, pos2.y)
PRINT "Distance between points: "; result

angle = 45.0
result = DegreesToRadians(angle)
PRINT "45 degrees in radians: "; result

result = RadiansToDegrees(result)
PRINT "Back to degrees: "; result

' Test constants from include file
PRINT "PI constant: "; PI
PRINT "E constant: "; E

' Test vector normalization
DIM testVector AS Vector2D
testVector.x = 3.0
testVector.y = 4.0

PRINT "Before normalization: "; testVector.x; ","; testVector.y
NormalizeVector testVector
PRINT "After normalization: "; testVector.x; ","; testVector.y

' Test clamping
result = Clamp(150.0, 0.0, 100.0)
PRINT "Clamped 150 to 0-100 range: "; result

' Test interpolation
result = Lerp(0.0, 10.0, 0.5)
PRINT "Lerp from 0 to 10 at 0.5: "; result

' ============================================
' TEST AREA FOR HOVER AND COMPLETION FEATURES
' ============================================
' Try the following to test both completion and hover:
' 
' COMPLETION TESTS:
' 1. Type "Dis" and press Ctrl+Space to see Distance function completion
' 2. Type "Distance(" to see parameter hints with descriptions  
' 3. Type "Clamp(" to see multi-parameter signature help
' 4. Type "Cal" and see CalculateDamage from main file
' 5. Type "CalculateDamage(" to see all parameter descriptions
'
' HOVER TESTS:
' 1. Hover over "Distance" to see function documentation
' 2. Hover over "PI" to see: CONST PI = 3.14159265358979323846
' 3. Hover over "Vector2D" to see type definition
' 4. Hover over "NormalizeVector" to see SUB with parameter docs
' 5. Hover over "E" to see: CONST E = 2.71828182845904523536
'
' The hover should show the same beautiful documentation as completion!

' Test calls - try adding these and see signature help:
' Distance(
' Clamp(
' CalculateDamage(

END
