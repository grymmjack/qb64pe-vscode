' Math utilities include file
' This file demonstrates symbols that should be available via $INCLUDE

' Mathematical constants
CONST PI = 3.14159265358979323846
CONST E = 2.71828182845904523536

' Utility functions for mathematical operations
FUNCTION RadiansToDegrees(radians AS SINGLE) AS SINGLE
    RadiansToDegrees = radians * 180.0 / PI
END FUNCTION

FUNCTION DegreesToRadians(degrees AS SINGLE) AS SINGLE
    DegreesToRadians = degrees * PI / 180.0
END FUNCTION

' Calculate distance between two points
FUNCTION Distance(x1 AS SINGLE, y1 AS SINGLE, x2 AS SINGLE, y2 AS SINGLE) AS SINGLE
    DIM dx AS SINGLE, dy AS SINGLE
    dx = x2 - x1
    dy = y2 - y1
    Distance = SQR(dx * dx + dy * dy)
END FUNCTION

' Clamp a value between min and max
FUNCTION Clamp(value AS SINGLE, minVal AS SINGLE, maxVal AS SINGLE) AS SINGLE
    IF value < minVal THEN
        Clamp = minVal
    ELSEIF value > maxVal THEN
        Clamp = maxVal
    ELSE
        Clamp = value
    END IF
END FUNCTION

' Linear interpolation
FUNCTION Lerp(start AS SINGLE, finish AS SINGLE, t AS SINGLE) AS SINGLE
    Lerp = start + (finish - start) * t
END FUNCTION

' Vector type for 2D operations
TYPE Vector2D
    x AS SINGLE
    y AS SINGLE
END TYPE

' Normalize a vector
SUB NormalizeVector(v AS Vector2D)
    DIM length AS SINGLE
    length = SQR(v.x * v.x + v.y * v.y)
    
    IF length > 0 THEN
        v.x = v.x / length
        v.y = v.y / length
    END IF
END SUB
