'' Test file for QB64PE completion providers
'' This file tests the new keywords and underscore functions

' Test basic graphics functions
SCREEN _NEWIMAGE(800, 600, 32)
_TITLE "QB64PE Test"

' Test color functions
COLOR _RGB32(255, 255, 255)
CLS , _RGBA32(0, 0, 0, 255)

' Test image functions
img& = _LOADIMAGE("test.png")
_PUTIMAGE (100, 100), img&

' Test font functions
font& = _LOADFONT("arial.ttf", 16)
_FONT font&
_PRINTSTRING (10, 10), "Hello World"

' Test sound functions
sound& = _SNDOPEN("sound.wav")
_SNDPLAY sound&

' Test input functions
DO
    _LIMIT 60
    
    WHILE _MOUSEINPUT
        IF _MOUSEBUTTON(1) THEN
            x = _MOUSEX
            y = _MOUSEY
        END IF
    WEND
    
    k& = _KEYHIT
    IF k& = 27 THEN EXIT DO ' ESC
    
    ' Test clipboard functions
    IF k& = ASC("c") THEN
        _CLIPBOARD$ = "Hello from QB64PE"
    END IF
    
    ' Test display functions
    _DISPLAY
LOOP

' Test memory functions
DIM m AS _MEM
m = _MEMIMAGE(img&)
_MEMFREE m

' Test file dialog functions
filename$ = _OPENFILEDIALOG$("Open Image", "", "*.png|*.jpg|*.bmp")

SYSTEM
