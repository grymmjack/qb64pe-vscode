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


## [_MEMSOUND](MEMSOUND.md) [📖](https://qb64phoenix.com/qb64wiki/index.php/_MEMSOUND)
---
<blockquote>

### The _MEMSOUND function returns a _MEM value referring to a sound's raw data in memory using a designated sound handle created by the _SNDOPEN or _SNDNEW function.

</blockquote>

#### SYNTAX

<blockquote>

`soundBlock = _MEMSOUND ( soundHandle& [, channel& ])`

</blockquote>

#### PARAMETERS

<blockquote>


* The soundBlock _MEM type variable holds the read-only elements .OFFSET, .SIZE, .ELEMENTSIZE, .TYPE and .SOUND.
* .OFFSET is the starting memory address of the sound sample data.
* .SIZE is the size of the sample data in bytes
* .ELEMENTSIZE will contain the number of bytes-per-sample the audio contains. Can return 1 (8-bit mono), 2 (8-bit stereo), 2 (16-bit mono), 4 (16-bit stereo), 4 (32-bit mono) or 8 (32-bit stereo). Use .TYPE to determine the data type of the sample data.
* .TYPE will contain the data type of the sample data. See _MEM for details.
* .SOUND will contain the same handle value as returned by the _SNDOPEN function.
* The second parameter channel& is optional and deprecated. This was used to specify the sound channel. In QB64-PE v3.1.0 and above stereo data is always interleaved. You must use .ELEMENTSIZE and .TYPE to determine the type of audio data you are dealing with.
</blockquote>

#### DESCRIPTION

<blockquote>


* Use this function to obtain a pointer to the raw sound data in memory for direct access.
* Even if the memory pointer obtained by this fuction was already freed again using _MEMFREE , the respective Sound handle itself must still be freed using _SNDCLOSE when no longer required.
* If .SIZE returns 0, that means the data could not be accessed. It may happen if you try to access the right channel in a mono file or the format simply does not support accessing raw PCM samples.
* channel& - 1 (left channel/mono) or 2 (right channel; for stereo files) was supported on the old OpenAL backend. For the new miniaudio backend, this must be 0.
* _MEMSOUND does not work for sounds loaded with _SNDOPEN when using the STREAM or NODECODE flags.

</blockquote>

#### EXAMPLES

<blockquote>

```vb
OPTION _EXPLICIT

CONST FILE_FILTER = "*.wav|*.aiff|*.aifc|*.flac|*.ogg|*.mp3|*.it|*.xm|*.s3m|*.mod|*.rad|*.ahx|*.hvl|*.mus|*.hmi|*.hmp|*.hmq|*.kar|*.lds|*.mds|*.mids|*.rcp|*.r36|*.g18|*.g36|*.rmi|*.mid|*.midi|*.xfm|*.xmi|*.qoa"

PRINT "Loading...";
DIM Song AS LONG
Song = _SNDOPEN(_OPENFILEDIALOG$("Open audio file", , FILE_FILTER))
IF Song < 1 THEN
   PRINT "Failed to load sound!"
   END
END IF
PRINT "Done!"

DIM channels AS _UNSIGNED _BYTE: channels = SndChannels(Song)

IF channels THEN
   PRINT "This sound data has"; channels; "channels."
ELSE
   PRINT "An error occurred."
END IF

_SNDCLOSE Song

END

' This function returns the number of sound channels for a valid sound handle
FUNCTION SndChannels~%% (handle AS LONG)
   DECLARE LIBRARY
       ' This is needed to convert _OFFSET to LONG / _INTEGER64
       $IF 32BIT THEN
           FUNCTION SndChannels.CLngPtr~& ALIAS "uintptr_t" (BYVAL o AS _UNSIGNED _OFFSET)
       $ELSE
           FUNCTION SndChannels.CLngPtr~&& ALIAS "uintptr_t" (BYVAL o AS _UNSIGNED _OFFSET)
       $END IF 
   END DECLARE

   DIM soundData AS _MEM: soundData = _MEMSOUND(handle)

   IF soundData.SIZE THEN
       ' See https://qb64phoenix.com/qb64wiki/index.php/MEM for details
       SELECT CASE soundData.TYPE
           CASE 260 ' 32-bit floating point
               SndChannels = SndChannels.CLngPtr(soundData.ELEMENTSIZE) \ _SIZE_OF_SINGLE

           CASE 132 ' 32-bit signed integer
               SndChannels = SndChannels.CLngPtr(soundData.ELEMENTSIZE) \ _SIZE_OF_LONG

           CASE 130 ' 16-bit signed integer
               SndChannels = SndChannels.CLngPtr(soundData.ELEMENTSIZE) \ _SIZE_OF_INTEGER

           CASE 1153 ' 8-bit unsigned integer
               SndChannels = SndChannels.CLngPtr(soundData.ELEMENTSIZE) \ _SIZE_OF_BYTE

           CASE ELSE ' unknown format
               SndChannels = 1
       END SELECT
   END IF

   IF soundData.SOUND = handle THEN _MEMFREE soundData
END FUNCTION
```
  
<br>

```vb
OPTION _EXPLICIT

CONST FILE_FILTER = "*.wav|*.aiff|*.aifc|*.flac|*.ogg|*.mp3|*.it|*.xm|*.s3m|*.mod|*.rad|*.ahx|*.hvl|*.mus|*.hmi|*.hmp|*.hmq|*.kar|*.lds|*.mds|*.mids|*.rcp|*.r36|*.g18|*.g36|*.rmi|*.mid|*.midi|*.xfm|*.xmi|*.qoa"

DECLARE LIBRARY
   ' This is needed to convert _OFFSET to LONG / _INTEGER64
   $IF 32BIT THEN
       FUNCTION CLngPtr~& ALIAS "uintptr_t" (BYVAL o AS _UNSIGNED _OFFSET)
   $ELSE
       FUNCTION CLngPtr~&& ALIAS "uintptr_t" (BYVAL o AS _UNSIGNED _OFFSET)
   $END IF 
END DECLARE

SCREEN _NEWIMAGE(800, 327, 32)

PRINT "Loading...";
DIM Song AS LONG
Song = _SNDOPEN(_OPENFILEDIALOG$("Open audio file", , FILE_FILTER))
IF Song < 1 THEN
   PRINT "Failed to load sound!"
   END
END IF
PRINT "Done!"

_SNDPLAY Song

DIM soundData AS _MEM: soundData = _MEMSOUND(Song, 0)

IF soundData.SIZE = 0 THEN
   PRINT "Failed to access sound sample data."
   END
END IF

DIM sz AS _UNSIGNED _INTEGER64: sz = CLngPtr(soundData.ELEMENTSIZE)
DIM x AS LONG, i AS _UNSIGNED _INTEGER64

DO UNTIL _KEYHIT = 27 OR NOT _SNDPLAYING(Song) OR i + (_WIDTH * sz) > soundData.SIZE
   CLS
   LOCATE 1, 1: PRINT i; "/"; soundData.SIZE, "Frame Size ="; sz, "Data Type ="; soundData.TYPE

   ' See https://qb64phoenix.com/qb64wiki/index.php/MEM for details
   SELECT CASE soundData.TYPE
       CASE 130 ' integer stereo or mono
           FOR x = 0 TO _WIDTH - 1
               DIM si AS INTEGER: si = _MEMGET(soundData, soundData.OFFSET + i + x * sz, INTEGER) ' get sound data
               LINE (x, _HEIGHT \ 2)-STEP(0, 300! * si / 32768!), _RGB32(0, 111, 0) 'plot wave
           NEXT

       CASE 132 ' long stereo or mono
           FOR x = 0 TO _WIDTH - 1
               DIM sl AS LONG: sl = _MEMGET(soundData, soundData.OFFSET + i + x * sz, LONG) ' get sound data
               LINE (x, _HEIGHT \ 2)-STEP(0, 300! * sl / 2147483648!), _RGB32(0, 111, 0) 'plot wave
           NEXT

       CASE 260 ' floating point stereo or mono
           FOR x = 0 TO _WIDTH - 1
               DIM sf AS SINGLE: sf = _MEMGET(soundData, soundData.OFFSET + i + x * sz, SINGLE) ' get sound data
               LINE (x, _HEIGHT \ 2)-STEP(0, sf * 300!), _RGB32(0, 111, 0) 'plot wave
           NEXT

       CASE 1153 ' unsigned byte stereo or mono
           FOR x = 0 TO _WIDTH - 1
               DIM sb AS _BYTE: sb = _MEMGET(soundData, soundData.OFFSET + i + x * sz, _UNSIGNED _BYTE) XOR &H80 ' get sound data and convert to signed
               LINE (x, _HEIGHT \ 2)-STEP(0, 300! * sb / 128!), _RGB32(0, 111, 0) ' plot wave
           NEXT
   END SELECT

   _DISPLAY

   _LIMIT 60

   i = FIX(_SNDGETPOS(Song) * _SNDRATE) * sz ' calculate the new sample frame position
LOOP

_SNDCLOSE Song
_AUTODISPLAY
END
```
  
<br>


</blockquote>

#### SEE ALSO

<blockquote>


* _MEM , _MEMFREE
* _MEMPUT , _MEMGET , _MEMGET (function)
* _SNDOPEN , _SNDNEW , _SNDCLOSE , _SNDRAW
* _SNDRATE
</blockquote>
