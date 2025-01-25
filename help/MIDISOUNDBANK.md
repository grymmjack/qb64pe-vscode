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


## [_MIDISOUNDBANK](MIDISOUNDBANK.md) [📖](https://qb64phoenix.com/qb64wiki/index.php/_MIDISOUNDBANK)
---
<blockquote>

### The _MIDISOUNDBANK command enables _SNDOPEN to use an external FM Bank or SoundFont when playing MIDI files.

</blockquote>

#### SYNTAX

<blockquote>

`_MIDISOUNDBANK : fileName$ [, capabilities$ ]`

</blockquote>

#### PARAMETERS

<blockquote>


* fileName is literal or variable [STRING](STRING.md) file name value.
* The literal or variable [STRING](STRING.md) capabilities$ is optional, but it can be set to MEMORY and one of the following formats:
* MEMORY : This will treat fileName as a memory buffer containing the sound file instead of a file name.
* AD : Global Timbre Library format for Audio Interface Library.
* OP2 : DMX OPL-2 format.
* OPL : Global Timbre Library format for Audio Interface Library.
* SF2 : Creative's SoundFont 2.0 format.
* SF3 : MuseScore's Ogg compressed Creative SoundFont 2.0 format.
* SFO : Bernhard Schelling's Ogg compressed Creative SoundFont 2.0 format.
* TMB : Apogee Sound System timbre format.
* WOPL : Vitaly Novichkov's OPL3BankEditor format.
</blockquote>

#### DESCRIPTION

<blockquote>


* The selected sound bank is what is used to play all MIDI files.
* If fileName is an empty string ( "" ), the sound bank will default to the internal sound bank.
* If fileName is missing, corrupted, or inaccessible, the command will not produce any errors. However, subsequent attempts to open a MIDI file with _SNDOPEN will fail.
* The command supports AD, OP2, OPL, SF2, SF3, SFO, TMB, WOPL formats on all supported platforms.
* It also supports VSTi (Virtual Studio Technology Instruments) 2.x (DLL) on Windows. However, a VST host, such as the one utilized by foo_midi, is required.
* _EMBEDDED$ sound banks can be used directly with _MIDISOUNDBANK .

</blockquote>

#### EXAMPLES

<blockquote>

```vb
_MIDISOUNDBANK "awesome.sf3"

handle = _SNDOPEN("onestop.mid")
_SNDPLAY handle
```
  
<br>

```vb
$EMBED:'./tiny.sf2','mysf2'

_MIDISOUNDBANK _EMBEDDED$("mysf2"), "memory, sf2"

handle = _SNDOPEN("canyon.xmi")
_SNDPLAY handle
```
  
<br>


</blockquote>

#### SEE ALSO

<blockquote>


* Featured in our "Keyword of the Day" series
* _SNDOPEN
</blockquote>
