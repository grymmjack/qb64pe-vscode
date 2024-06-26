[$LET]($LET) is a precompiler command, which is now usable by modern day [cavemen](cavemen) to help include and exclude which sections of code compiles in their program based on OS/bit-size or other predefined conditions.

## Syntax

>  [$LET]($LET) variable = expression

## Description

* Unlike [LET](LET), [$LET]($LET) is not optional.
* $LET A = 12 sets a precompiler variable "a" to the value of 12.   This variable is only valid for the precompiler itself and does nothing to affect the values of any variable/constant which might also be called "a" in the program.
* Variable names must follow QB64's variable naming conventions.
* You can check a precompiler variable against special values **DEFINED** and **UNDEFINED**, in order to assess whether the variable has already been assigned a value. Useful for code in libraries which may be repeated.
* The precompiler comes with some preset values which can be used to help determine which code blocks to include/exclude.  These are:
  * **WIN** or **WINDOWS** if the user is running QB64PE in a Windows environment.
  * **LINUX** if the user is running QB64PE in a Linux environment.
  * **MAC** or **MACOSX** if the user is running QB64PE in a macOS environment.
  * **32BIT** if the user is running a 32-bit version of qb64pe.
  * **64BIT** if the user is running a 64-bit version of qb64pe.
  * **VERSION**, which is set to the version of the QB64PE compiler.

## Example(s)

* See example 1 in [$IF]($IF).

## See Also

* [$IF]($IF)
* [$ELSE]($ELSE)
* [$ELSEIF]($ELSEIF)
* [$END IF]($END-IF)
* [Cavemen](Cavemen)
