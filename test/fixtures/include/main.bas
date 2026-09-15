' Fixture: include/main.bas -> lib.bi (top) and nested/deep.bm (bottom) -> nested/util.bm
$CONSOLE:ONLY
'$INCLUDE:'lib.bi'

DIM SHARED app_name AS STRING
app_name = "demo"
PRINT DeepValue&(LIB_VERSION)
SYSTEM

'$include:'nested/deep.bm'
