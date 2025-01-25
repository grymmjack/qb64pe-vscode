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


## [_ENCODEURL\$](ENCODEURL\$.md) [📖](https://qb64phoenix.com/qb64wiki/index.php/_ENCODEURL%24)
---
<blockquote>

### The _ENCODEURL$ function returns the so called percent encoded representation of the given URL.

</blockquote>

#### SYNTAX

<blockquote>

`result$ = _ENCODEURL$ ( url$ )`

</blockquote>

#### PARAMETERS

<blockquote>


* url$ is the URL to encode as variable or literal [STRING](STRING.md) .
</blockquote>

#### DESCRIPTION

<blockquote>


* URL encoding may be required before trying to retrieve it using the _OPENCLIENT("HTTP:url") command.
* Proper encoding is under the obligation of the application, because only that knows how the URL currently looks like and hence if encoding is required or not.
* This function performs the most simple encoding according to the informations found here , which is sufficient for the most work cases.
* Chars - . _ ~ 0 to 9 Aa to Zz (not encoded).
* Chars # / : ? @ [ ] (not encoded in address part but encoded in query part, first ? is not encoded and starts the query part).
* Chars & = (not encoded as query key separator respectively query value assignment on a simple 1:1 swap base).
* Control chars, spaces and extended [ASCII](ASCII.md) (>127) are always encoded, regardless in which part of the URL they are used.
* If the application uses unconventional URL notation, e.g. query parts like ?foo=bar&baz&flip=true where the use of ampersands (&) or other reserved chars is ambigous, then it must implement its own custom encoding routine, as only the application knows the correct syntax in such cases.
* Note that this function performs no validation of the given URL, it expects a valid URL to be given and just does the encoding.
* Note also that it does not check, if the URL is already encoded. Although multiple times encoded URLs should not be a problem for most servers, it's recommended to avoid it.

</blockquote>

#### EXAMPLES

<blockquote>


</blockquote>

#### SEE ALSO

<blockquote>


* _OPENCLIENT , _DECODEURL$
* Downloading Files
</blockquote>
