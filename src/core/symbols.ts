/**
 * Core symbol model for QB64PE source.
 *
 * This module is deliberately free of any `vscode` import so it can be
 * unit-tested with plain mocha and reused by every language provider.
 */

export type QB64SymbolType =
  | "SUB"
  | "FUNCTION"
  | "VARIABLE"
  | "TYPE"
  | "CONST"
  | "LABEL"
  | "FIELD"; // a TYPE member; lives on the TYPE symbol's `members`

export type QB64SymbolScope = "LOCAL" | "MODULE" | "GLOBAL";

export interface QB64Symbol {
  name: string;
  type: QB64SymbolType;
  dataType?: string;
  parameters?: Parameter[];
  scope: QB64SymbolScope;
  line: number;
  file: string;
  documentation?: string;
  parameterDescriptions?: Map<string, string>; // Parameter name -> description
  isArray?: boolean;
  isShared?: boolean;
  value?: string; // For constants - the actual value
  members?: QB64Symbol[]; // TYPE fields (type "FIELD")
  parent?: string; // For FIELDs - the enclosing TYPE name
  isStatic?: boolean; // SUB/FUNCTION declared with a trailing STATIC
  isExternal?: boolean; // declared inside DECLARE LIBRARY
  library?: string; // DECLARE LIBRARY name ("" when unnamed)
  isImplicit?: boolean; // variable created by first assignment / FOR, no DIM
  endLine?: number; // SUB/FUNCTION/TYPE: line of the matching END …
  isParameter?: boolean; // synthesized from a routine's parameter list; `parent` is the routine
}

export interface Parameter {
  name: string;
  type?: string;
  optional?: boolean;
  byRef?: boolean;
  isArray?: boolean; // declared as `name()`
  description?: string; // Parameter-specific documentation
}
