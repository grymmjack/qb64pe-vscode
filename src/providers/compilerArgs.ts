import * as vscode from "vscode";
import * as os from "os";

/**
 * Per-launch overrides for the QB64PE compiler settings. A launch config may
 * carry any of these to override the corresponding `qb64pe.debug.*` setting for
 * one run. Tri-state strings are "default" | "on" | "off".
 */
export interface CompilerArgOverrides {
  maxCompilerProcesses?: number;
  optimizeCppProgram?: string;
  stripDebugSymbols?: string;
  absoluteDebugPaths?: string;
  extraCppFlags?: string;
  extraLinkerFlags?: string;
}

/**
 * The `-f:` compiler-setting flags shared by the F5 debug build and the Ctrl+F5
 * build & run, read from `qb64pe.debug.*` (per-launch overrides win). Mirrors
 * the QB64PE IDE's Compiler Settings dialog. Each boolean is tri-state:
 * "default" leaves QB64PE's own saved setting alone; only "on"/"off" emit a
 * `-f:` override. Free-form flag strings pass through when non-empty.
 *
 * Returns the resolved `procs` (so callers can report it) and the flag list,
 * which always begins with `-f:MaxCompilerProcesses=<procs>`.
 */
export function compilerSettingArgs(overrides?: CompilerArgOverrides): { procs: number; args: string[] } {
  const cfg = vscode.workspace.getConfiguration("qb64pe");
  let procs = overrides?.maxCompilerProcesses ?? cfg.get<number>("debug.maxCompilerProcesses", 0);
  if (!procs || procs < 1) procs = os.cpus().length || 1;
  const args = [`-f:MaxCompilerProcesses=${procs}`];

  const tri = (v: string | undefined, cfgKey: string, name: string) => {
    const s = v ?? cfg.get<string>(cfgKey, "default");
    if (s === "on") args.push(`-f:${name}=true`);
    else if (s === "off") args.push(`-f:${name}=false`);
  };
  tri(overrides?.optimizeCppProgram, "debug.optimizeCppProgram", "OptimizeCppProgram");
  tri(overrides?.stripDebugSymbols, "debug.stripDebugSymbols", "StripDebugSymbols");
  tri(overrides?.absoluteDebugPaths, "debug.absoluteDebugPaths", "AbsoluteDebugPaths");
  const cppFlags = (overrides?.extraCppFlags ?? cfg.get<string>("debug.extraCppFlags", "")).trim();
  if (cppFlags) args.push(`-f:ExtraCppFlags=${cppFlags}`);
  const linkFlags = (overrides?.extraLinkerFlags ?? cfg.get<string>("debug.extraLinkerFlags", "")).trim();
  if (linkFlags) args.push(`-f:ExtraLinkerFlags=${linkFlags}`);
  return { procs, args };
}

/**
 * The output-executable extension for the current OS, from
 * `qb64pe.run.{windows,mac,linux}ExecutableExtension`. Defaults: `.exe` on
 * Windows, `.run` on macOS/Linux — matching the common QB64PE tasks.json
 * convention, which also lets you `.gitignore *.run`. A leading dot is optional
 * in the setting; an empty value means no extension. Shared by the F5 debug
 * build and the Ctrl+F5 build & run so every produced binary is named the same.
 */
export function executableExtension(): string {
  const cfg = vscode.workspace.getConfiguration("qb64pe");
  const raw = (
    process.platform === "win32"
      ? cfg.get<string>("run.windowsExecutableExtension", ".exe")
      : process.platform === "darwin"
        ? cfg.get<string>("run.macExecutableExtension", ".run")
        : cfg.get<string>("run.linuxExecutableExtension", ".run")
  ).trim();
  if (!raw) return "";
  return raw.startsWith(".") ? raw : "." + raw;
}
