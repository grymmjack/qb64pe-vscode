The [_OS$](_OS$) function returns the operating system and QB64PE compiler bit version used to compile a QB64PE program.

## Syntax

> compilerVersion$ = [_OS$](_OS$)

## Description

* Returns a [STRING](STRING) listing the OS as [WINDOWS], [LINUX] or [MACOSX] and the compiler bit format of [32BIT] or [64BIT]. Example: [WINDOWS][32BIT]
* Allows a BAS program to be compiled with QB64PE in Windows, Linux or MacOSX using different OS or language specifications.
* Use the return compilerVersion$ to specify the current OS code to use when a BAS program is compiled using another version of the QB64PE compiler.
* Windows can use either a 32 (default) or 64 bit compiler. Linux and Mac use 64 bit by default.

## See Also

* [ENVIRON$](ENVIRON$)
