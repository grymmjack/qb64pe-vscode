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


## [Download](Download.md) [📖](https://qb64phoenix.com/qb64wiki/index.php/Download)
---
<blockquote>

### 

</blockquote>

#### EXAMPLES

<blockquote>

```vb
CRLF$ = CHR$(13) + CHR$(10)
Request$ = "GET " + File_Path + " HTTP/1.1" + CRLF$ + "Host:" + Web_Address + CRLF$ + CRLF$
```
  
<br>

```vb
HTTP/1.1 200 OK
Server: dbws
Date: Tue, 25 Oct 2011 04:41:03 GMT
Content-Type: text/plain; charset=ascii
Connection: keep-alive
content-length: 4087
x-robots-tag: noindex,nofollow
accept-ranges: bytes
etag: 365n
pragma: public
cache-control: max-age=0
```
  
<br>

```vb
IF Download("www.qb64.net/qb64.png", "qb64logo.png", 10) THEN ' timelimit = 10 seconds
SCREEN _LOADIMAGE("qb64logo.png",32)
ELSE: PRINT "Couldn't download QB64 logo."
END IF
SLEEP
SYSTEM
' ---------- program end -----------

FUNCTION Download (url$, file$, timelimit) ' returns -1 if successful, 0 if not
url2$ = url$
x = INSTR(url2$, "/")
IF x THEN url2$ = LEFT$(url$, x - 1)
client = _OPENCLIENT("TCP/IP:80:" + url2$)
IF client = 0 THEN EXIT FUNCTION
e$ = CHR$(13) + CHR$(10) ' end of line characters
url3$ = RIGHT$(url$, LEN(url$) - x + 1)
x$ = "GET " + url3$ + " HTTP/1.1" + e$
x$ = x$ + "Host: " + url2$ + e$ + e$
PUT #client, , x$
t! = TIMER ' start time
DO
_DELAY 0.05 ' 50ms delay (20 checks per second)
GET #client, , a2$
a$ = a$ + a2$
i = INSTR(a$, "Content-Length:")
IF i THEN
i2 = INSTR(i, a$, e$)
IF i2 THEN
l = VAL(MID$(a$, i + 15, i2 - i -14))
i3 = INSTR(i2, a$, e$ + e$)
IF i3 THEN
i3 = i3 + 4 'move i3 to start of data
IF (LEN(a$) - i3 + 1) = l THEN
CLOSE client ' CLOSE CLIENT
d$ = MID$(a$, i3, l)
fh = FREEFILE
OPEN file$ FOR OUTPUT AS #fh: CLOSE #fh 'Warning! Clears data from existing file
OPEN file$ FOR BINARY AS #fh
PUT #fh, , d$
CLOSE #fh
Download = -1 'indicates download was successfull
EXIT FUNCTION
END IF ' availabledata = l
END IF ' i3
END IF ' i2
END IF ' i
LOOP UNTIL TIMER > t! + timelimit ' (in seconds)
CLOSE client
END FUNCTION
```
  
<br>

```vb
DEFINT A-Z

CR$ = CHR$(13) + CHR$(10) 'crlf carriage return line feed characters
' Change this to the file's public link
DownFile$ = "http://a5.sphotos.ak.fbcdn.net/hphotos-ak-snc7/293944_10150358253659788_151813304787_8043392_486717139_n.jpg?dl=1"

' Get base URL
BaseURL$ = DownFile$
IF INSTR(BaseURL$, "http://") THEN BaseURL$ = RIGHT$(BaseURL$, LEN(BaseURL$) - 7) 'trim http://
Path$ = MID$(BaseURL$, INSTR(BaseURL$, "/")) 'path to file
BaseURL$ = LEFT$(BaseURL$, INSTR(BaseURL$, "/") - 1) 'site URL


' Connect to base URL
PRINT "Connecting to "; BaseURL$; "...";
Client& = _OPENCLIENT("TCP/IP:80:" + BaseURL$)
IF Client& = 0 THEN PRINT "Failed to connect...": END
PRINT "Done."

' Send download request
PRINT "Sending download request...";
Request$ = "GET " + Path$ + " HTTP/1.1" + CR$ + "Host:" + BaseURL$ + CR$ + CR$
PUT #Client&, , Request$
PRINT "Done."

' Download the header
PRINT "Getting HTML header...";
Dat$ = ""
DO
_LIMIT 20
GET #Client&, , gDat$
Dat$ = Dat$ + gDat$
LOOP UNTIL INSTR(Dat$, CR$ + CR$) ' Loop until 2 CRLFs (end of HTML header) are found
PRINT "Done."

' Get file size
FileSizePos = INSTR(UCASE$(Dat$), "CONTENT-LENGTH: ") + 16
FileSizeEnd = INSTR(FileSizePos, Dat$, CR$)
FileSize& = VAL(MID$(Dat$, FileSizePos, (FileSizeEnd - FileSizePos) + 1))

PRINT "File size:"; FileSize&
PRINT "Downloading file...";

' Trim off HTML header
EndHeaderPos = INSTR(Dat$, CR$ + CR$) + 4
Dat$ = RIGHT$(Dat$, (LEN(Dat$) - EndHeaderPos) + 1)

' Get the file name tucked at the end of the URL if necessary
FOR S = LEN(DownFile$) TO 1 STEP -1
IF MID$(DownFile$, S, 1) = "/" THEN
OutFile$ = RIGHT$(DownFile$, (LEN(DownFile$) - S))
EXIT FOR
END IF
NEXT S
' Remove some kind of tag at the end of the file name in some URLs
IF INSTR(OutFile$, "?") THEN OutFile$ = LEFT$(OutFile$, INSTR(OutFile$, "?") - 1)

' Download the rest of the data
OPEN OutFile$ FOR OUTPUT AS #1: CLOSE #1 'Warning! Clears data from an existing file
OPEN OutFile$ FOR BINARY AS #1 'write data to binary image file
DO
_LIMIT 20
PUT #1, , Dat$
GET #Client&, , Dat$
LOOP UNTIL LOF(1) >= FileSize&
CLOSE #1, #Client&
PRINT "Done!"
```
  
<br>

```vb
CrLf$ = CHR$(13) + CHR$(10) ' carriage return + line feed ASCII characters

Host = _OPENHOST("TCP/IP:319")
IF Host THEN
PRINT "> Server started succesfully."

'// Change this to the file's public link
IP_File$ = "dl.dropbox.com/u/8440706/QB64.INI" 'a Drop Box link
URL$ = LEFT$(IP_File$, INSTR(IP_File$, "/") - 1)
Path$ = MID$(IP_File$, INSTR(IP_File$, "/"))
Client& = _OPENCLIENT("TCP/IP:80:" + URL$)
IF Client& THEN
Request$ = "GET " + Path$ + " HTTP/1.1" + CrLf$ + "Host:" + URL$ + CrLf$ + CrLf$
PUT #Client&, , Request$
DO: _LIMIT 20 '              load response header
GET #Client&, , Dat$
Header$ = Header$ + Dat$
LOOP UNTIL INSTR(Header$, CrLf$ + CrLf$) ' Loop until 2 CRLFs (end of HTML header) are found
PRINT "Header Done."

' Get file size from header
SizePos = INSTR(UCASE$(Header$), "CONTENT-LENGTH:") + 16
SizeEnd = INSTR(SizePos, Header$, CrLf$)
FileSize& = VAL(MID$(Header$, SizePos, (SizeEnd - SizePos) + 1))
PRINT "File size is"; FileSize&; "bytes"
EndPos = INSTR(Header$, CrLf$ + CrLf$) + 4
Response$ = MID$(Header$, EndPos) ' get data after header already downloaded

start = 1  '// Get file name from original URL path if necessary
DO '// Change this to destination local file name and path...
posit = INSTR(start, IP_File$, "/")
IF posit THEN lastpos = posit: start = posit + 1
LOOP UNTIL posit = 0
File$ = MID$(IP_File$, lastpos + 1) 'beware of tag suffixes
OPEN File$ FOR BINARY AS #1
DO: _LIMIT 20
PUT #1, , Response$
GET #Client&, , Response$
LOOP UNTIL LOF(1) >= FileSize&
PRINT "File download completed!"
CLOSE #1
ELSE
PRINT "Failed to connect."
END IF
ELSE
PRINT "Failed to create server connection..."
END IF
```
  
<br>


</blockquote>
