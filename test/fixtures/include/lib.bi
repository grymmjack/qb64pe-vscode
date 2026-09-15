' lib.bi - first-level include: declarations only
CONST LIB_VERSION = 2

TYPE LibInfo
    id AS LONG
    label AS STRING * 8
END TYPE

DIM SHARED lib_info AS LibInfo
