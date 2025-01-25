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


## [_SNDRAWBATCH](SNDRAWBATCH.md) [📖](https://qb64phoenix.com/qb64wiki/index.php/_SNDRAWBATCH)
---
<blockquote>

### The _SNDRAWBATCH statement plays a batch of sound wave sample frequencies created by a program.

</blockquote>

#### SYNTAX

<blockquote>

`_SNDRAWBATCH sampleFrameArray!([index&]) [, channels& ][, pipeHandle& ][, frameCount& ]`

</blockquote>

#### PARAMETERS

<blockquote>


* sampleFrameArray!([index&]) is an array of [SINGLE](SINGLE.md) values representing the audio sample frames. Optionally, an index can be specified to determine the starting point in the array.
* channels& is number of channels. This can be 1 (mono) or 2 (stereo). It is assumed as mono if not provided.
* pipeHandle& is a handle to the sound pipe, obtained by using the _SNDOPENRAW function.
* frameCount& is the number of sample frames to play, not the number of array elements. Each frame corresponds to one set of samples per channel.
</blockquote>

#### DESCRIPTION

<blockquote>


* Unlike _SNDRAW , _SNDRAWBATCH is designed to play a batch of sample frames. This removes the need to call the underlying audio subsystem for each sample frame and thus improves performance.
* A sample frame is one snapshot of audio data that includes the sound levels for all channels at a specific point in time. In mono audio (1 channel), a sample frame is just 1 value. In stereo audio (2 channels), a sample frame has 2 values: one for the left channel and one for the right channel.
* Stereo audio data should always be interleaved (a left channel sample followed by a right channel sample).
* Ensure that _SNDRAWLEN is comfortably above 0 (until you've finished playing sound). If you get occasional unintended random clicks, this generally means that _SNDRAWLEN has dropped to 0.
* _SNDRAWBATCH is not intended to queue up many minutes worth of sound. It will probably work but will chew up a lot of memory (and if it gets swapped to disk, your sound could be interrupted abruptly).
* _SNDRATE determines how many samples are played per second. However, the timing is done by the sound card, not your program.
* Do not attempt to use _TIMER or _DELAY or _LIMIT to control the timing of _SNDRAW. You may use them for delays or to limit your program's CPU usage, but how much to queue should only be based on the _SNDRAWLEN .

</blockquote>

#### EXAMPLES

<blockquote>

```vb
OPTION _EXPLICIT

REDIM soundBuffer(0) AS SINGLE
DIM AS LONG oct, octave, note
DIM fq AS SINGLE, noteStr AS STRING

DO
   COLOR 7
   PRINT "Enter the octave 1 to 8 (0 quits!):";

   oct = VAL(INPUT$(1)): PRINT oct
   IF oct = 0 THEN EXIT DO
   octave = oct - 4 '440 is in the 4th octave, 9th note

   COLOR oct + 1
   PRINT USING "Octave: ##"; oct

   FOR note = 0 TO 11 'notes C to B
       fq = FreQ(octave, note, noteStr)
       PRINT USING "#####.## \\"; fq, noteStr

       GenWave fq, _SNDRATE, soundBuffer()
       _SNDRAWBATCH soundBuffer()
       _SNDRAWDONE

       DO
           _LIMIT 60
       LOOP WHILE _SNDRAWLEN

       IF LEN(INKEY$) THEN EXIT DO
   NEXT
LOOP

END

FUNCTION FreQ (octave AS LONG, note AS LONG, noteStr AS STRING)
   FreQ = 440! * 2! ^ (octave + (note + 3!) / 12! - 1!) '* 12 note octave starts at C (3 notes up)
   noteStr = MID$("C C#D D#E F F#G G#A A#B ", note * 2 + 1, 2)
END FUNCTION

SUB GenWave (frequency AS SINGLE, sampleRate AS LONG, destBuffer() AS SINGLE)
   REDIM destBuffer(0 TO sampleRate - 1) AS SINGLE

   DIM sndLoop AS LONG

   DO WHILE sndLoop < sampleRate
       destBuffer(sndLoop) = SIN((2! * 4! * ATN(1!) * sndLoop / sampleRate) * frequency) * EXP(-(sndLoop / sampleRate) * 3!)
       sndLoop = sndLoop + 1
   LOOP
END SUB
```
  
<br>


</blockquote>

#### SEE ALSO

<blockquote>


* _SNDRAW , _SNDRAWLEN
* _SNDOPENRAW , _SNDRAWDONE
* _SNDOPEN , _SNDRATE
* [PLAY](PLAY.md) , [BEEP](BEEP.md)
* DTMF Phone Demo
</blockquote>
