/**
 * Core symbol model for QB64PE source.
 *
 * This module is deliberately free of any `vscode` import so it can be
 * unit-tested with plain mocha and reused by every language provider.
 */

export type QB64SymbolType = "SUB" | "FUNCTION" | "VARIABLE" | "TYPE" | "CONST";

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
}

export interface Parameter {
  name: string;
  type?: string;
  optional?: boolean;
  byRef?: boolean;
  description?: string; // Parameter-specific documentation
}
