' Math utilities include file
' This file demonstrates symbols that should be available via $INCLUDE

' Mathematical constants
CONST PI = 3.14159265358979323846
CONST E = 2.71828182845904523536

' Convert radians to degrees
' @param radians SINGLE The angle in radians to convert
' Returns the angle converted to degrees
FUNCTION RadiansToDegrees(radians AS SINGLE) AS SINGLE
    RadiansToDegrees = radians * 180.0 / PI
END FUNCTION

' Convert degrees to radians  
' @param degrees SINGLE The angle in degrees to convert
' Returns the angle converted to radians
FUNCTION DegreesToRadians(degrees AS SINGLE) AS SINGLE
    DegreesToRadians = degrees * PI / 180.0
END FUNCTION

' Calculate distance between two points using Pythagorean theorem
' @param x1 SINGLE X coordinate of first point
' @param y1 SINGLE Y coordinate of first point  
' @param x2 SINGLE X coordinate of second point
' @param y2 SINGLE Y coordinate of second point
' Returns the Euclidean distance between the two points
FUNCTION Distance(x1 AS SINGLE, y1 AS SINGLE, x2 AS SINGLE, y2 AS SINGLE) AS SINGLE
    DIM dx AS SINGLE, dy AS SINGLE
    dx = x2 - x1
    dy = y2 - y1
    Distance = SQR(dx * dx + dy * dy)
END FUNCTION

' Clamp a value between specified minimum and maximum bounds
' @param value SINGLE The value to clamp
' @param minVal SINGLE The minimum allowed value
' @param maxVal SINGLE The maximum allowed value  
' Returns the clamped value within the specified range
FUNCTION Clamp(value AS SINGLE, minVal AS SINGLE, maxVal AS SINGLE) AS SINGLE
    IF value < minVal THEN
        Clamp = minVal
    ELSEIF value > maxVal THEN
        Clamp = maxVal
    ELSE
        Clamp = value
    END IF
END FUNCTION

' Linear interpolation between two values
' @param start SINGLE The starting value
' @param finish SINGLE The ending value
' @param t SINGLE The interpolation factor (0.0 to 1.0)
' Returns the interpolated value between start and finish
FUNCTION Lerp(start AS SINGLE, finish AS SINGLE, t AS SINGLE) AS SINGLE
    Lerp = start + (finish - start) * t
END FUNCTION

' Vector type for 2D operations
TYPE Vector2D
    x AS SINGLE
    y AS SINGLE
END TYPE

' Normalize a vector to unit length
' Modifies the input vector to have a length of 1.0
' @param v Vector2D The vector to normalize (passed by reference)
SUB NormalizeVector(v AS Vector2D)
    DIM length AS SINGLE
    length = SQR(v.x * v.x + v.y * v.y)
    
    IF length > 0 THEN
        v.x = v.x / length
        v.y = v.y / length
    END IF
END SUB
