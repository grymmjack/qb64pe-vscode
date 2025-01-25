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


## [PLAY (function)](PLAY_(function).md) [📖](https://qb64phoenix.com/qb64wiki/index.php/PLAY%20%28function%29)
---
<blockquote>

### The PLAY function returns the amount of time (in seconds) in the background music queue.

</blockquote>

#### SYNTAX

<blockquote>

`remaining# = PLAY ( voice& )`

</blockquote>

#### PARAMETERS

<blockquote>


* remaining# is the number of seconds left to play in the background music queue.
* voice& can be any numeric expression. It indicates for which tone voice channel the number of seconds remaining is to be returned. If voice& is not in [0-3], the queue for voice 0 is returned.
* See also the important version dependent notes in the Availability section.
</blockquote>

#### DESCRIPTION

<blockquote>


* This function may be used to detect, if the background music queue is still playing.
* When nothing is left to play, this function returns zero.

</blockquote>

#### EXAMPLES

<blockquote>

```vb
OPTION _EXPLICIT

CONST MML = "mbv15l16t155o2mnb4p8msbbmnb4p8msbbb8g#8e8g#8b8g#8b8o3e8o2b8g#8e8g#8b8g#8b8o3e8o2mnb4p8msbbmnb4" + _
   "p8msbbmnb4p8msbbmnb4p8msbbb8bbb8b8b8bbb8b8b8bbb8b8b8bbb8b8mlb2b2b8p8p4p4p8mso1bbb8bbb8bbo2e8f#8g#8o1bb" + _
   "b8bbo2e8g#g#f#8d#8o1b8bbb8bbb8bbo2e8f#8g#8eg#mlb4bmsag#f#e8g#8e8o3bbb8bbb8bbo4e8f#8" + _
   "g#8o3bbb8bbo4e8g#g#f#8d#8o3b8bbb8bbb8bbo4e8f#8g#8mleg#b4bag#f#mse8g#8e8o3g#g#g#8g#g#g#8g#g#" + _
   "g#8o4c#8o3g#8o4c#8o3g#8o4c#8o3g#8f#8e8d#8c#8g#g#g#8g#g#g#8g#g#g#8o4c#8o3g#8o4c#8" + _
   "o3g#8o4c#8o3b8a#8b8a#8b8g#g#g#8g#g#g#8g#g#g#8o4c#8o3g#8o4c#8o3g#8o4c#8o3g#8f#8" + _
   "e8d#8c#8g#g#g#8g#g#g#8g#g#g#8o4c#8o3g#8o4c#8o3g#8o4c#8o3b8a#8b8o2bbb8f#f#" + _
   "f#8f#f#f#8g#8a8f#4mna8msg#8mne4msg#8f#8f#8f#8o3f#f#f#8f#f#f#8g#8" + _
   "a8mnf#4msa8g#8mne4msg#8f#8o2bbb8o1bbb8bbb8bbo2mne8f#8g#8o1bbb8bbo2e8g#g#f#8d#8o1b8bbb8bb" + _
   "b8bbo2e8f#8g#8eg#mlb4mnbag#f#e8g#8e8o3bbb8bbb8bbo4e8f#8g#8o3bbb8bbo4e8g#g#f#8d#8o3b8bb" + _
   "b8bbb8bbo4e8f#8g#8mleg#mlb4mnbag#f#mne8g#8e8o3mle56f56g56a56b56o4c56d56mne8eee8e8mlg#4g#8" + _
   "mnf#8e8d#8e8c#8mso3bo4c#o3bo4c#o3bo4c#d#eo3abababo4c#d#o3g#ag#ag#abo4c#o3f#" + _
   "g#f#g#f#g#f#g#f#g#f#d#o2bo3mlbo4c#d#e8d#8e8c#8o3msbo4c#o3bo4c#o3bo4c#d#eo3abababo4c#d#o3g#" + _
   "ag#ag#abo4c#o3f#g#f#g#f#af#emne8p8mlc#4mnc#o2cmso3c#o2co3d#c#o2baag#ec#c#c#c#c#e" + _
   "d#o1cg#g#g#g#g#g#o2c#eg#o3c#c#c#c#c#o2co3c#o2co3d#c#o2baag#ec#c#c#c#c#ed#o1cg#g#g#g#g#mng#" + _
   "o2c#eg#o3msc#ed#c#d#o2cg#g#g#o3g#ec#d#o2cg#g#g#o3g#ec#d#o2bg#g#a#gd#d#g#gg#gg#ag#f#e" + _
   "o1ba#bo2eo1bo2f#o1bo2g#ed#eg#eaf#bo3g#f#ed#f#ec#o2bo3c#o2bo3c#d#ef#g#o2ababo3c#d#ef#o2g#" + _
   "ag#aco3c#d#eo2f#g#f#g#f#g#f#g#f#g#f#d#o1bco2c#d#eo1ba#bo2eo1bo2f#o1bo2g#ed#eg#eaf#b" + _
   "o3g#f#ed#f#ec#o2bo3c#o2bo3c#d#ef#g#o2ababo3c#d#ef#o2g#ag#abo3c#d#eo2f#o3c#o2co3c#d#c#o2af#mne" + _
   "o3mlef#g#abo4c#d#mne8mseee8e8mlg#4g#8msf#8mse8d#8e8c#8o3bo4c#o3bo4c#o3bo4c#d#eo3a" + _
   "bababo4c#d#o3g#ag#ag#abo4c#o3f#g#f#g#f#g#f#g#f#g#f#d#o2bo3mlbo4c#d#mne8eee8e8mlg#4g#8" + _
   "msf#8e8d#8e8c#8o3bo4c#o3bo4c#o3bo4c#d#eo3abababo4c#d#o3g#ag#ag#abo4c#o3f#" + _
   "g#f#g#f#ag#f#e8o2b8o3e8g#g#g#8mng#g#g#8g#g#g#8o4c#8o3g#8o4c#8o3g#8o4c#8o3g#8f#8e8" + _
   "d#8c#8g#g#g#8g#g#g#8g#g#g#8o4c#8o3g#8o4c#8o3g#8o4c#8o3b8a#8b8a#8b8g#g#g#8" + _
   "g#g#g#8g#g#g#8o4c#8o3g#8o4c#8o3g#8o4c#8o3g#8f#8e8d#8c#8g#g#g#8g#g#g#8g#g#g#8" + _
   "o4c#8o3g#8o4c#8o3g#8o4c#8o3b8a#8b8a#8b8o2f#f#f#8f#f#f#8g#8a8f#4a8g#8" + _
   "e4g#8f#8o0b8o1b8o2f#f#f#8f#f#f#8g#8a8f#4a8g#8e4g#8f#8bbb8o1bbb8bbb8bbo2e8f#8g#8" + _
   "o1bbb8bbo2e8g#g#f#8d#8o1b8bbb8bbb8bbo2e8f#8g#8eg#mlb4mnbag#f#e8o1b8o2e8o3bbb8bbb8bbo4e8" + _
   "f#8g#8o3bbb8bbo4e8g#g#f#8d#8o3b8bbb8bbb8bbo4e8f#8g#8o3eg#mlb4mnbag#f#mlef#g#mnamlg#abo4mnc#mlo3bo4c#d#mnemld#" + _
   "ef#mng#ao3bo4ao3bo4ao3bo4ao3bo4ao3bo4ao3bo4ao3bo4ao3bmlef#g#mnamlg#abmno4c#mlo3bo4c#d#mnemld#ef#mng#ao3bo4ao3bo4a" + _
   "o3bo4ao3bo4ao3bo4ao3bo4ao3bo4ao3bp16mlg#o4g#o3mng#p16mld#o4d#o3mnd#p16" + _
   "mleo4eo3mnep16mlao4ao3mnap16mlg#o4g#o3mng#p16mld#o4d#o3mnd#p16mleo4eo3mnep16" + _
   "mlao4ao3mnao4go3go4go3go4go3go4go3go4msg8e8c8e8o4mng#o3g#o4g#o3g#o4g#o3g#o4g#o3g#o4msg#8e8o3b8o4e8mng#o3g#o4g#o3g#o4g#" + _
   "o3g#o4g#o3g#o4msg#8f8c#8f8mna#o3a#o4a#o3a#o4a#o3a#o4a#o3a#o4msa#8g8e8g8b8p16mna#p16ap16g#p16f#p16ep16" + _
   "d#p16c#p16o3bp16a#p16ap16g#p16f#p16ep16d#p16f#mlef#g#mnamlg#abmno4c#o3mlbo4c#d#mnemld#ef#mng#ao3bo4ao3bo4a" + _
   "o3bo4ao3bo4ao3bo4ao3bo4ao3bo4ao3bmlef#g#mnamlg#abmno4c#o3mlb" + _
   "o4c#d#mnemld#ef#mng#ao3bo4ao3bo4ao3bo4ao3bo4ao3bo4ao3bo4a" + _
   "o3bo4ao3bp16mlg#o4g#o3mng#p16mld#o4d#o3mnd#p16mleo4eo3mnep16mlao4ao3mnap16" + _
   "mlg#o4g#o3mng#p16mld#o4d#o3mnd#p16mleo4eo3mnep16mlao4ao3mnao4go3go4go3go4g" + _
   "o3go4go3go4g8e8c8e8g#o3g#o4g#o3g#o4g#o3g#o4g#o3g#o4g#8e8o3b8o4e8g#o3g#o4g#o3g#o4g#o3g#o4g#o3g#o4msg#8mnf8c#8" + _
   "f8a#o3a#o4a#o3a#o4a#o3a#o4a#o3a#o4a#8g8e8g8b8p16a#p16ap16g#p16f#p16ep16d#p16c#p16o3bp16a#p16" + _
   "ap16g#p16f#p16ep16d#p16fmled#ed#mne8bbb8bbb8bbo4e8f#8g#8o3bbb8bbb8bbo4g#8a8b8p8e8f#8g#8p8o3g#8" + _
   "a8b8p8p2o2bco3c#dd#eff#gg#aa#bco4c#d#ed#f#d#ed#f#d#ed#f#d#ed#f#d#ed#f#d#ed#f#d#ed#f#d#e" + _
   "d#f#d#e8eo3eo4eo3eo4eo3eo4e8o3bo2bo3bo2bo3bo2bo3b8g#o2g#o3g#o2g#o3g#o2g#o3g8eo2eo3eo2eo3eo2eo3e8eee8" + _
   "e8e8o2bbb8b8b8g#g#g#8g#8g#8eee8e8e8o1b8o2e8o1b8o2g#8e8b8g#8o3e8o2b8o3e8o2b8o3g#8e8b8g#8o4e4" + _
   "p8eee8e8e8e8e4p8p16ee4p8p16o2ee2"

LOCATE 12, 28
PRINT "The William Tell Overture."
PLAY MML

DIM secondsLeft AS LONG

DO
   LOCATE 13, 32

   secondsLeft = PLAY(0)

   PRINT USING "(### seconds left)"; secondsLeft;

   _LIMIT 30
LOOP WHILE secondsLeft _ANDALSO _KEYHIT <> 27

END
```
  
<br>

```vb
OPTION _EXPLICIT

DIM mml(0 TO 2) AS STRING

PRINT "Playing tune."

DO
   READ mml(0), mml(1), mml(2)
   PLAY mml(0), mml(1), mml(2)
LOOP WHILE LEN(mml(0)) _ORELSE LEN(mml(1)) _ORELSE LEN(mml(2))

PRINT "Waiting for tune to finish playing."

DIM cLine AS LONG: cLine = CSRLIN

DO
   _LIMIT 60
   LOCATE cLine, 1
LOOP WHILE _KEYHIT <> 27 _ANDALSO DisplayVoiceStats

END

DATA "mb v15","mb v15","mb v15"
DATA "v11 t120 o3 e-8 >e-8","v12 t120 o2 p4","v12 t120 o2 e-4"
DATA "o4 <f8 >e-8","o2 p4","o2 e-4"
DATA "o4 <g8 >e-8","o2 p4","o2 p4"
DATA "o4 <a-8 >e-8","o2 p4","o2 c4"
DATA "o4 <b-8 >e-8","o2 p4","o2 c4"
DATA "o4 c8 e-8","o2 p4","o2 p4"
DATA "o4 <b-16 >e-16 d16 c16","o2 p4","o1 g4"
DATA "o4 <b-16 >g16 f16 e-16","o2 p4","o1 a-4"
DATA "o4 d16 c16 <b-16 a-16","o2 p4","o1 b-4"
DATA "o3 g16 a-16 b-16 g16","o2 p4","o1 e-4"
DATA "o3 e-16 g16 b-16 >e-16","o2 p4","o1 g4"
DATA "o4 <f16 a16 >c16 e-16","o2 p4","o1 a4"
DATA "o4 d16 c16 d16 f16","o2 b-8 >b-8","o1 b-4"
DATA "o4 e-16 d16 e-16 g16","o3 c8 b-8","o1 b-4"
DATA "o4 f16 e-16 f16 a-16","o3 d8 b-8","o1 p4"
DATA "o4 g16 f16 g16 b-16","o3 e-8 b-8","o1 b-4"
DATA "o4 d16 c16 d16 b-16","o3 f8 b-8","o1 b-4"
DATA "o4 e-16 d16 e-16 b-16","o3 g8 b-8","o1 p4"
DATA "o4 d8 f8","o3 f16 b-16 a16 g16","o1 b-4"
DATA "o4 b-8 d8","o3 f16 >d16 c16 <b-16","o1 >d4"
DATA "o4 c8 a8","o3 a16 g16 f16 e-16","o2 f4"
DATA "o4 b-8 d8","o3 d16 e-16 f16 d16","o2 b-4"
DATA "o4 f8 d8","o3 <b-16 >d16 f16 b-16","o2 b-4"
DATA "o4 <b-8 >d8","o3 d16 f16 a-16 b-16","o2 p4"
DATA "o4 e-8 p8","o3 g16 f16 g16 b-16","o1 e-8 >e-8"
DATA "o4 e-8 p8","o3 a-16 g16 a-16 >c16","o2 <f8 >e-8"
DATA "o4 e-8 p8","o3 <b-16 a-16 b-16 >d-16","o2 <g8 >e-8"
DATA "o4 e-8 p8","o4 c16 <b-16 >c16 e-16","o2 <a-8 >e-8"
DATA "o4 e-8 p8","o4 <g16 f16 g16 >e-16","o2 <b-8 >e-8"
DATA "o4 e-8 p8","o4 <a-16 g16 a-16 >e-16","o2 c8 e-8"
DATA "o4 p16 e-16 f16 g16","o4 <g8 b-8","o2 <b-8 p8"
DATA "o4 a-16 b-16 >c16 <b-16","o3 >e-8 <g8","o1 >c8 p8"
DATA "o4 a-16 g16 f16 a-16","o3 f8 b-8","o2 d8 p8"
DATA "o4 g8 <b-8","o3 p16 e-16 f16 g16","o2 e-4"
DATA "o3 >c8 <a-8","o3 a-16 b-16 >c16 <b-16","o2 e-4"
DATA "o3 >f4","o3 a-16 g16 f16 a-16","o2 d4"
DATA "o4 p16 a-16 g16 f16","o3 g8 <b-8","o2 e-4"
DATA "o4 e-16 d16 c16 <b-16","o2 >c8 <a-8","o2 a-4"
DATA "o3 a-16 g16 a-16 >f16","o2 >f4","o2 p4"
DATA "o4 <g16 >f16 e-16 d16","o3 p16 a-16 g16 f16","o2 <b4"
DATA "o4 c16 <b-16 a-16 g16","o3 e-16 d16 c16 <b-16","o1 >c4"
DATA "o3 f4","o2 a-16 g16 a-16 >f16","o2 d4"
DATA "o3 p16 a-16 g16 f16","o3 <g16 >f16 e-16 d16","o2 <e-4"
DATA "o3 e-4","o3 c16 <b-16 a-16 g16","o1 a-4"
DATA "o3 p16 d16 e-16 f16","o2 f4","o1 a-4"
DATA "o3 <b8 >d8","o2 p16 a-16 g16 f16","o1 g4"
DATA "o3 g8 b8","o2 e-8 g8","o1 p16 >g16 f16 g16"
DATA "o3 >c8 d8","o2 a8 b8","o2 e-16 f16 d16 e-16"
DATA "o4 e-16 c16 <b16 >c16","o3 c8 p8","o2 c8 e-8"
DATA "o4 <g16 >c16 <b16 >c16","o3 p4","o2 c8 e-8"
DATA "o4 e-16 c16 <b-16 >c16","o3 p4","o2 c8 e-8"
DATA "o4 <a-8 p8","o3 p16 f16 e-16 f16","o2 <f8 >a-8"
DATA "o3 >e-8 p8","o3 c16 f16 e-16 f16","o2 <f8 >a-8"
DATA "o4 e-8 p8","o3 a-16 f16 e-16 f16","o2 <f8 >a-8"
DATA "o4 p16 <b-16 a-16 b-16","o3 d8 p8","o2 <b-8 >d8"
DATA "o3 f16 b-16 a-16 b-16","o3 a-8 p8","o2 <b-8 >d8"
DATA "o3 >d16 <b-16 a-16 b-16","o3 a-8 p8","o2 <b-8 >d8"
DATA "o3 g8 p8","o3 p16 e-16 d-16 e-16","o2 <e-8 >g8"
DATA "o3 >d-8 p8","o3 <b-16 >e-16 d-16 e-16","o2 <e-8 >g8"
DATA "o4 d-8 p8","o3 g16 e-16 d-16 e-16","o2 <e-8 g8"
DATA "o3 p16 a-16 g16 a-16","o3 c16 f16 e16 f16","o1 a-8 >c8"
DATA "o3 f16 a-16 g16 a-16","o3 c16 f16 e16 f16","o2 <a-8 >c8"
DATA "o3 >c16 <a-16 g16 a-16","o3 a-16 f16 e-16 f16","o2 <a-8 >c8"
DATA "o3 f16 b-16 a-16 b-16","o3 d8 f8","o2 <a-8 >d8"
DATA "o3 >d16 <b-16 a-16 b-16","o3 b-4","o2 <a-8 >d8"
DATA "o3 >f16 d16 c16 d16","o3 b-4","o2 <a-8 >d8"
DATA "o4 b-8 g8","o3 p16 <b-16 a-16 b-16","o2 <g8 >e-8"
DATA "o4 e-4","o2 >e-16 <b-16 a-16 b-16","o2 <g8 >e-8"
DATA "o4 e-4","o2 >g16 e-16 d16 e-16","o2 <g8 >e-8"
DATA "o4 p16 d16 c16 <b-16","o3 a16 b-16 a16 g16","o2 <f4"
DATA "o3 a16 b-16 a16 g16","o3 f16 >d16 c16 <b-16","o1 p4"
DATA "o3 f16 >e-16 d16 c16","o3 a16 g16 f16 e-16","o1 p4"
DATA "o3 b-4","o3 d16 c16 d16 f16","o1 b-8 >b-8"
DATA "o3 b-4","o3 e-16 d16 e-16 g16","o2 c8 b-8"
DATA "o3 b-4","o3 f16 e-16 f16 a-16","o2 d8 b-8"
DATA "o3 p16 a16 b-16 >e-16","o3 g16 f16 g16 b-16","o2 e-8 b-8"
DATA "o4 <b-16 a16 b-16 >d16","o3 d16 c16 d16 b-16","o2 f8 b-8"
DATA "o4 c4","o3 e-16 d16 e-16 b-16","o2 g8 b-8"
DATA "o4 p16 g16 f16 e-16","o3 d4","o2 f8 b-8"
DATA "o4 d16 b-16 a16 g16","o3 p16 >d16 c16 <b-16","o2 e-8 b-8"
DATA "o4 f16 e-16 d16 c16","o3 a16 g16 f16 e-16","o2 f8 a8"
DATA "o3 b-8 >f8","o3 d16 b-16 a16 b-16","o1 b-4"
DATA "o4 g8 f8","o3 e-16 b-16 d16 b-16","o1 p4"
DATA "o4 g8 f8","o3 e-16 b-16 c16 b-16","o1 p4"
DATA "o4 f16 b-16 a16 b-16","o3 d8 f8","o1 b-4"
DATA "o4 e-16 b-16 d16 b-16","o3 g8 f8","o1 p4"
DATA "o4 e-16 b-16 c16 b-16","o3 g8 e-8","o1 p4"
DATA "o4 d4","o3 f16 <b-16 >c16 d16","o1 p8 >f8"
DATA "o4 p16 <b-16 >c16 d16","o3 e-4","o2 g8 f8"
DATA "o4 e-16 f16 g16 a16","o3 p16 d16 e-16 c16","o2 g8 e-8"
DATA "o4 b-8 <b-8","o3 f8 d8","o2 d8 g8"
DATA "o3 >c8 p8","o3 e-8 p8","o2 e-8 p8"
DATA "o4 <a4","o3 c4","o2 f4"
DATA "o3 mlb-4","o3 mld4","o1 mlb-4"
DATA "o3 b-4","o3 d4","o1 b-4"
DATA "o3 b-4","o3 d4","o1 b-4"
DATA "","",""

FUNCTION DisplayVoiceStats%%
   DIM voiceTime(0 TO 3) AS _INTEGER64
   DIM i AS LONG

   FOR i = 0 TO 3
       voiceTime(i) = PLAY(i)
       PRINT "Voice"; i; ":"; voiceTime(i); "seconds left"; SPC(10)
   NEXT i

   DisplayVoiceStats = voiceTime(0) > 0 _ORELSE voiceTime(1) > 0 _ORELSE voiceTime(2) > 0 _ORELSE voiceTime(3) > 0
END FUNCTION
```
  
<br>


</blockquote>

#### SEE ALSO

<blockquote>


* [PLAY](PLAY.md) , [SOUND](SOUND.md) , [BEEP](BEEP.md)
* _SNDOPEN , _SNDRAW
</blockquote>
