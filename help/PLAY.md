<style type="text/css">
body {
    background: #00a !important;
    color: #ccc !important;
}
li {
    list-style-type: square !important;
    color: #ccc !important;
}
li::marker {
    color: #77f !important;
}    
hr {
    border-color: #55f !important;
    border-width: 2px !important;
}
h2 {
    color: #fff !important;
    border: 0 !important;
}
h3 {
    color: #cfc !important;
    border: 0 !important;
}
h4 {
    color: #ccc !important;
    border: 0 !important;
}
h5 {
    margin: 0 0 0.5em 0  !important;
    color: #88f !important;
    border: 0 !important;
    font-style: italic !important;
    font-weight: normal !important;
}
code {
    background: #000 !important;
    margin: 0 !important;
    padding: 8px !important;
    border-radius: 4px !important; 
    border: 1px solid #333 !important;
}
pre > code {
    background: transparent !important;
    margin: 0 !important;
    padding: 0 !important;
    border-radius: inherit !important; 
    border: 0 !important;
}
blockquote {
    border: 0 !important;
    background: transparent !important;
    margin: 0 !important;
    padding: 0 1em !important;
}
pre {
    border-radius: 4px !important;
    background: #000 !important;
    border: 1px solid #333 !important;
    margin: 0 !important;
}
a:link, a:visited, a:hover, a:active {
    color: #ff0 !important;
}
br + pre {
    border-radius: 0 !important;
    border-style: inset !important;
    border-width: 5px !important;
    border-color: #999 !important;
    background-color: #000 !important;
    box-shadow: 0px 10px 3px rgba(0, 0, 0, 0.25) !important;
    margin-top: -1em !important;
}
br + pre::before {
    content: "OUTPUT \A" !important;
    color: #555 !important;
    border-bottom: 1px solid #333;
    font-size: x-small;
    display: block !important;
    padding: 0 3px !important;
    margin: -1em -1em 1em -1em !important;
    -webkit-user-select: none; /* Safari */
    -ms-user-select: none; /* IE 10 and IE 11 */
    user-select: none; /* Standard syntax */    
}
br ~ h5 {
    margin-top: 2em !important;
}
.explanation {
    color: #995 !important;
    /* background-color: rgba(150, 150, 100) !important; */
    border-radius: 10em !important;
    border: 2px #441 dashed !important;
    padding: 8px 32px !important;
    margin-bottom: 4em !important;
    font-size: x-small !important;
}
</style>


## [PLAY](PLAY.md) [📖](https://qb64phoenix.com/qb64wiki/index.php/PLAY)
---
<blockquote>

### PLAY is a statement that plays a tune defined by Music Macro Language (MML) STRINGs .

</blockquote>

#### SYNTAX

<blockquote>

`PLAY mmlString1$ [, mmlString2$ ][, mmlString3$ ][, mmlString4$ ]`

</blockquote>

#### PARAMETERS

<blockquote>


* The mmlString1$ , mmlString2$ , mmlString3$ , mmlString4$ can be any literal or variable [STRING](STRING.md) consisting of the following commands:
* Command string values are not case-sensitive and white spaces and ; are ignored. Use upper or lower case as desired.
</blockquote>

#### EXAMPLES

<blockquote>

```vb
PLAY "q0w3mll64"
DO
   FOR x = 1 TO 50
       a$ = a$ + "v" + LTRIM$(STR$(x)) + "n" + LTRIM$(STR$(x))
   NEXT
   FOR x = 50 TO 1 STEP -1
       a$ = a$ + "v" + LTRIM$(STR$(x)) + "n" + LTRIM$(STR$(x))
   NEXT
   PLAY a$
   a$ = ""
LOOP UNTIL INKEY$ <> ""
PLAY "v10l1c,l4egl2o5c,o4l4eg"
```
  
<br>

```vb
CLS: PRINT "Frosty the Snow Man"
FOR X = 1 TO 2
   PRINT
   IF X = 1 THEN PRINT "Fros-ty the Snow man was a jolly happy soul,"
   IF X = 2 THEN PRINT "Fros-ty the Snow man knew the sun was hot that day"
   PLAY "w3q1t140o2p4g2e4.f8g4o3c2o2b8o3c8d4c4o2b4a8g2." 'MB removed to print song one line at a time
   IF X = 1 THEN PRINT "with a corn cob pipe and a button nose and two eyes made out of coal."
   IF X = 2 THEN PRINT "so he said Let's run and we'll have some fun now before I melt away."
   PLAY "o2b8o3c8d4c4o2b4a8a8g8o3c4o2e8e4g8a8g4f4e4f4g2."
   IF X = 1 THEN PRINT "Fros-ty the Snow Man is a fair-y tale, they say,"
   IF X = 2 THEN PRINT "Down to the vil-lage, with a broom-stick in his hand,"
   PLAY "g2e4.f8g4o3c2o2b8o3c8d4c4o2b4a8g2."
   IF X = 1 THEN PRINT "He was made of snow but the chil-dren knew how he come to life one day."
   IF X = 2 THEN PRINT "run-ning here and there all a-round the square, say-in' catch me if you can."
   PLAY "o2b8o3c8d4c4o2b4a8a8g8o3c4o2e8e4g8a8g4f4e4d4c2."
   IF X = 1 THEN PRINT "There must have been some magic in that old silk hat they found."
   IF X = 2 THEN PRINT "He led them down the streets of town right to the traffic cop."
   PLAY "c4a4a4o3c4c4o2b4a4g4e4f4a4g4f4e2."
   IF X = 1 THEN PRINT "For when they placed it on his head he be-gan to dance a round."
   IF X = 2 THEN PRINT "And he on-ly paused a moment when he heard him hol-ler Stop!"
   PLAY "e8e8d4d4g4g4b4b4o3d4d8o2b8o3d4c4o2b4a4g4p4"
   IF X = 1 THEN PRINT "Oh, Fros-ty the Snow Man was a-live as he could be,"
   IF X = 2 THEN PRINT "For, Fros-ty the Snow Man had to hur-ry on his way"
   PLAY "g2g2e4.f8g4o3c2o2b8o3c8d4c4o2b4a8g8g2."
   IF X = 1 THEN PRINT "and the chil-dren say he could laugh and play just the same as you and me."
   IF X = 2 THEN PRINT "but he waved good-bye say-in' Don't you cry, I'll be back a-gain some day."
   PLAY "o2b8o3c8d4c4o2b4a8a8g8o3c4o2e8e4g8a8g4f4e4d4c2.p4"
NEXT X
PRINT: PRINT "Thump-et-y thump thump, thump-et-y thump thump, look at Fros-ty go."
PLAY "t180g8g8g4g4g4a8g8g4g4g4a4g4e4g4d1"
PRINT "Thump-et-y thump thump, thump-et-y thump thump, ov-er the hills of snow."
PLAY "t180g8g8g4g4g4a8g8g4g4g4g8g8g4a4b4o3c2c4p1"
END
```
  
<br>

```vb
DIM SHARED grid(16, 16), grid2(16, 16), cur
CONST maxx = 512
CONST maxy = 512
SCREEN _NEWIMAGE(maxx, maxy, 32)
_TITLE "MusicGrid"
cleargrid
DO
   IF TIMER - t# > 1 / 8 THEN cur = (cur + 1) AND 15: t# = TIMER
   IF cur <> oldcur THEN
       figuregrid
       drawgrid
       playgrid
       oldcur = cur
   END IF
   domousestuff
   in$ = INKEY$
   IF in$ = "C" OR in$ = "c" THEN cleargrid
LOOP UNTIL in$ = CHR$(27)

SUB drawgrid
   scale! = maxx / 16
   scale2 = maxx \ 16 - 2
   FOR y = 0 TO 15
       y1 = y * scale!
       FOR x = 0 TO 15
           x1 = x * scale!
           c& = _RGB32(grid2(x, y) * 64 + 64, 0, 0)
           LINE (x1, y1)-(x1 + scale2, y1 + scale2), c&, BF
       NEXT x
   NEXT y
END SUB

SUB figuregrid
   FOR y = 0 TO 15
       FOR x = 0 TO 15
           grid2(x, y) = grid(x, y)
       NEXT x
   NEXT y
   FOR y = 1 TO 14
       FOR x = 1 TO 14
           IF grid(x, y) = 1 AND cur = x THEN
               grid2(x, y) = 2
               IF grid(x - 1, y) = 0 THEN grid2(x - 1, y) = 1
               IF grid(x + 1, y) = 0 THEN grid2(x + 1, y) = 1
               IF grid(x, y - 1) = 0 THEN grid2(x, y - 1) = 1
               IF grid(x, y + 1) = 0 THEN grid2(x, y + 1) = 1
           END IF
       NEXT x
   NEXT y
END SUB

SUB domousestuff
   DO WHILE _MOUSEINPUT
       IF _MOUSEBUTTON(1) THEN
           x = _MOUSEX \ (maxx \ 16)
           y = _MOUSEY \ (maxy \ 16)
           grid(x, y) = 1 - grid(x, y)
       END IF
   LOOP
END SUB

SUB playgrid
   n$ = "W3Q1L16 "
   'scale$ = "O1CO1DO1EO1FO1GO1AO1BO2CO2DO2EO2FO2GO2AO2BO3CO3D"
   scale$ = "o1fo1go1ao2co2do2fo2go2ao3co3do3fo3go3ao4co4do4fo"
   FOR y = 15 TO 0 STEP -1
       IF grid(cur, y) = 1 THEN
           note$ = MID$(scale$, 1 + (15 - y) * 3, 3)
           n$ = n$ + note$ + "," 'comma plays 2 or more column notes simultaneously
       END IF
   NEXT y
   n$ = LEFT$(n$, LEN(n$) - 1)
   PLAY n$
END SUB

SUB cleargrid
   FOR y = 0 TO 15
       FOR x = 0 TO 15
           grid(x, y) = 0
       NEXT x
   NEXT y
END SUB
```
  
<br>

```vb
' 2012, 2013 mennonite
' license: creative commons cc0 1.0 universal
' (public domain) http://creativecommons.org/publicdomain/zero/1.0/

SCREEN 12 ' the following works in other screen modes, too
RANDOMIZE TIMER

PLAY "mbw3q1o2 l4cf.l8el4fag.l8fl4gl8agl4f.l8fl4a>cl2dl4dl4c.<l8al4afg.l8fl4gl8agl4f.l8dl4dcl2f>l4dc.<l8al4afg.l8fl4g>dc.<l8al4a>cl2dl4dc.<l8al4afg.l8fl4gl8agl4f.l8dl4dcl1f"

DIM ccs(1 TO 9, 1 TO 2)
ccs(1, 1) = 415: ccs(1, 2) = 289
ccs(2, 1) = 185: ccs(2, 2) = 128
ccs(3, 1) = 108: ccs(3, 2) = 75
ccs(4, 1) = 70: ccs(4, 2) = 48
ccs(5, 1) = 48: ccs(5, 2) = 32
ccs(6, 1) = 32: ccs(6, 2) = 20
ccs(7, 1) = 20: ccs(7, 2) = 12
ccs(8, 1) = 10: ccs(8, 2) = 6
ccs(9, 1) = 2: ccs(9, 2) = 2

FOR extra = 1 TO 23
   FOR p = 1 TO 9
       gcolor INT(RND * 9 + 14 - 9)
       _DELAY .04
       CLS
       gscale p
       row = ccs(p, 1)
       cl = ccs(p, 2)
       glocate row, cl
       gprint "000000000000000000000000000000000000000000000000000000000000000000000"
       glocate row + 1, cl
       gprint "0x00x0xxxx0xxxx0xxxx0x0x000x00x0xxxx0x000x000x0x0xxxx0xxxx0xxxx000x00"
       glocate row + 2, cl
       gprint "0x00x0x00x0x00x0x00x0x0x000xx0x0x0000x000x000x0x0x0000x00x0x00x000x00"
       glocate row + 3, cl
       gprint "0xxxx0xxxx0xxxx0xxxx0x0x000x0xx0xxx00x0x0x000x0x0xxx00xxxx0xxxx000x00"
       glocate row + 4, cl
       gprint "0x00x0x00x0x0000x00000x0000x00x0x0000x0x0x0000x00x0000x00x0x0x0000000"
       glocate row + 5, cl
       gprint "0x00x0x00x0x0000x00000x0000x00x0xxxx0xx0xx0000x00xxxx0x00x0x00x000x00"
       glocate row + 6, cl
       gprint "000000000000000000000000000000000000000000000000000000000000000000000"
   NEXT p
   SLEEP 1
   IF INKEY$ = CHR$(27) THEN EXIT FOR
NEXT extra

END

SUB gscale (s):
   SHARED gscalep
   gscalep = INT(s)
END SUB

SUB gcolor (c):
   SHARED gcolorp
   gcolorp = c
END SUB

SUB gbackcolor (c):
   SHARED gbackcolorp
   gbackcolorp = c
END SUB

SUB glocate (row, column):
   SHARED gposxp
   SHARED gposyp
   gposyp = row
   gposxp = column
END SUB

SUB gprint (p$):
   SHARED gscalep
   SHARED gposxp, gposyp
   SHARED gcolorp, gbackcolorp
   ' # means "use the foreground color here."
   ' . means "use the background color here."
   ' _ means "transparent - don't draw this block at all" (you can layer!)
   ' 0,1,2,3,4,5,6,7,8,9,a,b,c,d,e,f means "do color attribute 0 to 15."
   ' any letter after f: "use the foreground color here."
   IF gscalep < 1 THEN gscalep = 1
   pcolorp = gcolorp
   FOR p = 1 TO LEN(p$):
       SELECT CASE LCASE$(MID$(p$, p, 1))
           CASE "#", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"
               pcolorp = gcolorp
           CASE "."
               pcolorp = gbackcolorp
           CASE "_"
               pcolorp = -1
           CASE "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"
               pcolorp = INSTR("0123456789abcdef", LCASE$(MID$(p$, p, 1))) - 1
       END SELECT
       IF NOT pcolorp = -1 THEN
           IF gscalep > 1 THEN
               LINE ((gposxp - 1) * gscalep, (gposyp - 1) * gscalep)-STEP(gscalep - 1, gscalep - 1), pcolorp, BF
           ELSE:
               PSET (gposxp, gposyp), pcolorp
           END IF
       END IF
       glocate gposyp, gposxp + 1
   NEXT p
   gposxp = 1
   glocate gposyp + 1, 1 'gposyp = gposyp + 1
END SUB
```
  
<br>

```vb
WIDTH 59, 28
PRINT
x$ = x$ + "   o3    l4         t         0120c    ml<f1   ,a      1,  "
x$ = x$ + "   >c    1,        mnf        .e  8f   am  l<   e1    ,g   "
x$ = x$ + "   1,    >c       1, mn       g.   f8  ga   8g   8m  l<    "
x$ = x$ + "   f2.,a2.,      >c   2.      ,m  nf   .f  8a     ml<f     "
x$ = x$ + "   ,a,>c,mn     >cd2.,<f2     .,d2     .,<b        -2      "
x$ = x$ + "   .m    lb    -,>d,f,mn>d    ml       <c          1,      "
x$ = x$ + "   <a    1,   f1         ,m   n>       >c          .<      "
x$ = x$ + "   a8    af  ml           c1  ,<       e1          ,g      "
x$ = x$ + "                                                           "
x$ = x$ + "      1,m      n>  g.f8ga8g8m  l<                   f1     "
x$ = x$ + "      ,d1,     <b  -1           ,m                 n>      "
x$ = x$ + "      >f .d    8d  c<            f2               .,       "
x$ = x$ + "      a2  .,   c2  .,>f2.         ml      <      b-        "
x$ = x$ + "      ,>   d,  f,  mn>dml          <c    1,<    a1         "
x$ = x$ + "      ,f    1, mn  >>               c.  <a 8a  fm          "
x$ = x$ + "      lc     2.,<  e2                .,g2   .,mn           "
x$ = x$ + "      >g      .f8  gml<b-,>d,         f,     mn            "
x$ = x$ + "                                                           "
x$ = x$ + ">d      ml  <<f2.,a2.,         >         c2.,m       n>  c."
x$ = x$ + " <a    8a   ml                <e,        g,  >c      ,m  n>"
x$ = x$ + "  cm  l<    <b               -2 .,       >d   2.     ,f  2."
x$ = x$ + "   ,mn>     d2.ml<          <b   -,      >d  ,f      ,m  n>"
x$ = x$ + "    dm      l<<f1,         a1,>c1,mn     >c.<a       8a  fm"
x$ = x$ + "    lc      1,            <e1,g1,mn>g    .f  8g      a8  g8"
x$ = x$ + "    ml      <<           b-         1,   >d   1,           "
x$ = x$ + "    f1      ,mn>f.d8dc  l1           ml  f,    c,    <a  ,f"
PRINT x$;
PLAY x$
```
  
<br>

```vb
'Play scale in 7 different octaves
scale$ = "CDEFGAB"

play$ = "L16O=" + VARPTR$(i%) + "X" + VARPTR$(scale$)

FOR i% = 0 TO 6
   PLAY play$
NEXT
```
  
<br>

```vb
'-----------------------------------------------------------------------------------------------------------------------
' QB64-PE v4.0.0 multi-voice PLAY Demo by a740g
'-----------------------------------------------------------------------------------------------------------------------

$IF VERSION < 4.0.0 THEN
   $ERROR This requires the latest version of QB64-PE from https://github.com/QB64-Phoenix-Edition/QB64pe/releases/latest
$END IF 

_DEFINE A-Z AS LONG
OPTION _EXPLICIT

CONST APP_NAME = "Multi-voice PLAY Demo"
CONST LOOPS = 3

_TITLE APP_NAME

DIM AS STRING CH0Verse_1, CH0Verse_2, CH1Verse_1, CH1Verse_2, CH2Verse_1, CH2Verse_2, CH2Verse_3, CH3Verse_1
DIM AS STRING Channel_0, Channel_1, Channel_2, Channel_3, Caption
DIM c AS LONG

DO
   DO
       CLS
       PRINT
       PRINT "Enter number for a tune to play."
       PRINT
       PRINT "1. Demo 1 by J. Baker"
       PRINT "2. Demo 2 by Wilbert Brants"
       PRINT "3. Demo 3 by Wilbert Brants"
       PRINT "4. Demo 4 by J. Baker"
       PRINT "5. Demo 5 by Wilbert Brants"
       PRINT
       INPUT "Your choice (0 exits)"; c
   LOOP WHILE c < 0 OR c > 7

   SELECT CASE c
       CASE 1
           Caption = "Demo 1 by J. Baker"

           144
           CH0Verse_1 = "t144 l4 q0 w1 o0 ^75_100 v32 w1 ^75_100 o0 dd2 w8 ^100_80 o4 c"
           CH0Verse_2 = "w4 ^75_100 o0 d2 w8 ^100_80 o4 cd"

           CH1Verse_1 = "t144 q0 w1 o2 /1^100_99 v31 l1 gba /1\20^25_79 l4 gab2"
           CH1Verse_2 = "v40 /9^100\1 l1 gba \2 l4 gab2"

           CH2Verse_1 = "t144 l4 w2 o3 q20 v33 r1r1"
           CH2Verse_2 = "cd>d<e"
           CH2Verse_3 = "cd>d2<"

           CH3Verse_1 = "t144 q0 w9 y15 o3 _100 v29 l8 d"

           Channel_0 = RepeatVerse(CH0Verse_1 + CH0Verse_1 + CH0Verse_1 + CH0Verse_1 + CH0Verse_1 + CH0Verse_1 + CH0Verse_1 + CH0Verse_1 + CH0Verse_2 + CH0Verse_2 + CH0Verse_2 + CH0Verse_2, LOOPS)
           Channel_1 = RepeatVerse(CH1Verse_1 + CH1Verse_1 + CH1Verse_2, LOOPS)
           Channel_2 = RepeatVerse(CH2Verse_1 + CH2Verse_1 + CH2Verse_1 + CH2Verse_1 + CH2Verse_2 + CH2Verse_2 + CH2Verse_2 + CH2Verse_3, LOOPS)
           Channel_3 = RepeatVerse(CH3Verse_1, 96 * LOOPS)

       CASE 2
           Caption = "Demo 2 by Wilbert Brants"

           CH0Verse_1 = "t103 w2 o0 q8 v38 L8 G4B-B-G4B-B-  G4>E-E-<G4>E-E-<  A>CF4<A>CF4<  F4AAGB->D4<"
           CH1Verse_1 = "t103 w1 o1 q2 v33 L8 GB->D4<GB->D4<  GB->E-<B-GB->E-<B-  A>CF4<A>CF4<  FA>C<AGB->D4<"
           CH2Verse_1 = "t103 w1 o3 q1 v35 L4 GG2G8F8 E-E-2E-8D8 CCCD E-2D2"
           CH2Verse_2 = "B-B-2B-8A8 GG2G8F8 CCCD E-2D2"
           CH2Verse_3 = "B-B-2B-8A8 GG2G8F8 ACFA G2D2"

           Channel_0 = CH0Verse_1 + CH0Verse_1 + CH0Verse_1 + CH0Verse_1
           Channel_1 = CH1Verse_1 + CH1Verse_1 + CH1Verse_1 + CH1Verse_1
           Channel_2 = CH2Verse_1 + CH2Verse_2 + CH2Verse_1 + CH2Verse_3
           Channel_3 = _STR_EMPTY

       CASE 3
           Caption = "Demo 3 by Wilbert Brants"

           CH0Verse_1 = "t144 w2 o0 q16 v22 l8 v+cv-ceeg4 v+ f v- faa>cc< v+ c v- ceeg4 v+ f v- faa>cc< ggbb>d4< q8 g4c2"
           CH1Verse_1 = "t144 w1 o1 q2 v20 l4 gec f2a8c8 gec f2a8c8 gbd ec2"
           CH2Verse_1 = "t144 w3 o3 q2 v22 l8 cegceg l4 caf l8 cegceg l4 caf l8 gbdgbd l4 cgg"

           Channel_0 = RepeatVerse(CH0Verse_1, LOOPS)
           Channel_1 = RepeatVerse(CH1Verse_1, LOOPS)
           Channel_2 = RepeatVerse(CH2Verse_1, LOOPS)
           Channel_3 = _STR_EMPTY

       CASE 4
           Caption = "Demo 4 by J. Baker"

           Channel_0 = "t120 w1 o0 q2 v20 l8 <dced> dcge4 l4 q1 <d1> r8 l8 q2 dg l4 q1 <d1> l8 q2 dge q1 <d1> q2 dcdrr v+ <<dd>> v- r"
           Channel_1 = "t120 w1 o1 q1 v21 l8 >dcde< dcde#4 l4 >d1< l8 de l4 >f1 l8 ddfe1< dedfe dd r4"
           Channel_2 = _STR_EMPTY
           Channel_3 = _STR_EMPTY

       CASE 5
           Caption = "Demo 5 by Wilbert Brants"

           CH0Verse_1 = "T103 q16 O0 V22 W2 L4 V+CV-E8E8 <FA> <V+GV-B8B8> CE"
           CH1Verse_1 = "T103 q8 O2 V22 W1 L8 CEG>C< <FA>CF <GB>DG CEG>C<"
           CH2Verse_1 = "T103 q1 O3 v60 W4 L4 CEC<G> CEC2 CEC<G> CE16R16E16R16C2 CEC<G> CEC2 CEC<G> C<G16>R16E16R16C2"

           Channel_0 = RepeatVerse(CH0Verse_1, 4 * LOOPS)
           Channel_1 = RepeatVerse(CH1Verse_1, 4 * LOOPS)
           Channel_2 = RepeatVerse(CH2Verse_1, LOOPS)
           Channel_3 = _STR_EMPTY

       CASE ELSE
           EXIT DO ' Exit program
   END SELECT

   PlayMML Channel_0, Channel_1, Channel_2, Channel_3, Caption
LOOP

SYSTEM

SUB PlayMML (chan0 AS STRING, chan1 AS STRING, chan2 AS STRING, chan3 AS STRING, caption AS STRING)
   PLAY chan0, chan1, chan2, chan3

   PRINT
   PRINT "Playing "; caption; "..."

   DIM curLine AS LONG: curLine = CSRLIN

   DO
       _LIMIT 15

       LOCATE curLine, 1
   LOOP WHILE DisplayVoiceStats

   SLEEP 1
   _KEYCLEAR
END SUB

FUNCTION RepeatVerse$ (verse AS STRING, count AS _UNSIGNED LONG)
   DIM buffer AS STRING

   DIM i AS _UNSIGNED LONG

   WHILE i < count
       buffer = buffer + verse
       i = i + 1
   WEND

   RepeatVerse = buffer
END FUNCTION

FUNCTION DisplayVoiceStats%%
   STATIC voiceTotalTime(0 TO 3) AS DOUBLE

   DIM voiceElapsedTime(0 TO 3) AS DOUBLE
   DIM i AS LONG

   FOR i = 0 TO 3
       voiceElapsedTime(i) = PLAY(i)

       IF voiceElapsedTime(i) > voiceTotalTime(i) THEN
           voiceTotalTime(i) = voiceElapsedTime(i)
       END IF

       PRINT USING "Voice #: ### of ### seconds left"; i; voiceElapsedTime(i); voiceTotalTime(i)
   NEXT i

   DIM playing AS _BYTE: playing = voiceElapsedTime(0) > 0 _ORELSE voiceElapsedTime(1) > 0 _ORELSE voiceElapsedTime(2) > 0 _ORELSE voiceElapsedTime(3) > 0

   IF NOT playing THEN
       FOR i = 0 TO 3
           voiceTotalTime(i) = 0
       NEXT i
   END IF

   DisplayVoiceStats = playing
END FUNCTION
```
  
<br>


</blockquote>

#### SEE ALSO

<blockquote>


* [PLAY](PLAY.md) (function)
* [SOUND](SOUND.md) , [BEEP](BEEP.md) , _WAVE
* _SNDOPEN , _SNDRAW
</blockquote>
