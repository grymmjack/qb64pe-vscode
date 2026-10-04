/**
 * Keep the debuggee's window above other windows ("Keep Above Others").
 *
 * QB64PE has no always-on-top statement, so:
 *
 *  - Linux, from outside, keyed on the child's PID (QB64PE's window publishes
 *    it via _NET_WM_PID):
 *    - KDE Plasma (X11 or Wayland): a tiny KWin script, loaded over D-Bus, sets
 *      `keepAbove` on the window with that PID as soon as it appears. KWin
 *      scripting is the only route that works on a Wayland session.
 *    - Other desktops: `wmctrl` (EWMH) — covers X11 and the XWayland window a
 *      QB64PE program opens, when wmctrl is installed.
 *  - macOS and Windows, from inside: macOS lets no app float another app's
 *    window, so {@link KEEP_ABOVE_HEADER} is compiled into the debug build (a
 *    `DECLARE LIBRARY` block appended to the flattened source; its static
 *    initializer runs before the program's first line, so stepping never
 *    sees it). It waits for the program's own window and raises it:
 *    `NSWindow setLevel:NSFloatingWindowLevel` on the main queue (macOS),
 *    `SetWindowPos(HWND_TOPMOST)` from a helper thread (Windows).
 *
 * Everything is best-effort: failures are reported, never fatal.
 */
import * as cp from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export type Report = (message: string) => void;

/** Undo/cleanup handle (unloads the KWin script). */
export interface KeepAboveHandle {
  dispose(): void;
}

const NOOP: KeepAboveHandle = { dispose() {} };

/** How long to keep looking for the window after launch. */
const WAIT_MS = 20000;

export function keepWindowAbove(pid: number, report: Report): KeepAboveHandle {
  try {
    if (process.platform === "linux") {
      if (/KDE/i.test(process.env.XDG_CURRENT_DESKTOP ?? "") && has("dbus-send")) {
        return kwin(pid, report);
      }
      if (has("wmctrl")) return wmctrl(pid, report);
      report("keep on top: needs KDE Plasma (KWin) or `wmctrl` on this desktop");
      return NOOP;
    }
    // macOS / Windows: handled inside the program (compiledKeepAbove).
  } catch (err) {
    report(`keep on top failed: ${err}`);
  }
  return NOOP;
}

function has(cmd: string): boolean {
  return cp.spawnSync("sh", ["-c", `command -v ${cmd}`]).status === 0;
}

// ---- KDE Plasma -------------------------------------------------------------

function dbusKWin(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    cp.execFile(
      "dbus-send",
      ["--session", "--print-reply", "--dest=org.kde.KWin", ...args],
      { timeout: 5000 },
      (err, stdout) => (err ? reject(err) : resolve(stdout))
    );
  });
}

function kwin(pid: number, report: Report): KeepAboveHandle {
  const plugin = `qb64pe-keepabove-${pid}`;
  const file = path.join(os.tmpdir(), `${plugin}.js`);
  // KWin 6 names it windowList/windowAdded; Plasma 5 used clientList/clientAdded.
  fs.writeFileSync(
    file,
    `const PID = ${pid};
function apply(w) {
  if (w && w.pid === PID && w.normalWindow && !w.keepAbove) w.keepAbove = true;
}
const list = workspace.windowList ? workspace.windowList() : workspace.clientList();
for (const w of list) apply(w);
(workspace.windowAdded || workspace.clientAdded).connect(apply);
`
  );

  let disposed = false;
  const unload = () =>
    dbusKWin(["/Scripting", "org.kde.kwin.Scripting.unloadScript", `string:${plugin}`])
      .catch(() => undefined)
      .finally(() => fs.rm(file, { force: true }, () => undefined));

  dbusKWin(["/Scripting", "org.kde.kwin.Scripting.loadScript", `string:${file}`, `string:${plugin}`])
    .then((out) => {
      const id = /int32\s+(-?\d+)/.exec(out)?.[1];
      if (id === undefined || id === "-1") throw new Error("KWin refused the script");
      // KWin 6 exposes /Scripting/Script<N>; Plasma 5 used /<N>.
      return dbusKWin([`/Scripting/Script${id}`, "org.kde.kwin.Script.run"]).catch(() =>
        dbusKWin([`/${id}`, "org.kde.kwin.Script.run"])
      );
    })
    .then(() => {
      if (disposed) unload();
    })
    .catch((err) => {
      report(`keep on top (KWin) failed: ${err.message ?? err}`);
      unload();
    });

  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      unload();
    },
  };
}

// ---- other X11 / XWayland ---------------------------------------------------

function wmctrl(pid: number, report: Report): KeepAboveHandle {
  let stopped = false;
  const deadline = Date.now() + WAIT_MS;
  const tick = () => {
    if (stopped) return;
    cp.execFile("wmctrl", ["-lp"], { timeout: 3000 }, (err, stdout) => {
      if (stopped) return;
      // <id> <desktop> <pid> <host> <title>
      const id = err
        ? undefined
        : stdout
            .split("\n")
            .map((l) => l.trim().split(/\s+/))
            .find((cols) => cols[2] === String(pid))?.[0];
      if (id) {
        cp.execFile("wmctrl", ["-i", "-r", id, "-b", "add,above"], (e) => {
          if (e) report(`keep on top (wmctrl) failed: ${e.message}`);
        });
      } else if (Date.now() < deadline) {
        setTimeout(tick, 250);
      }
    });
  };
  tick();
  return { dispose: () => void (stopped = true) };
}

// ---- macOS / Windows (compiled in) ---------------------------------------------

/** True where keep-on-top is compiled into the program instead of applied from outside. */
export function keepAboveIsCompiledIn(platform = process.platform): boolean {
  return platform === "darwin" || platform === "win32";
}

/**
 * C/C++ header compiled into the debug build on macOS / Windows. Pure C APIs
 * (objc runtime + libdispatch, Win32) so it builds as part of QB64PE's C++
 * translation unit without an Objective-C compiler. Polls for up to ~20 s.
 */
export const KEEP_ABOVE_HEADER = `// Generated by the QB64PE VS Code extension (qb64pe.debug.keepWindowOnTop).
// Keeps the debugged program's window above other windows. Safe to delete.
#ifndef QB64PE_VSCODE_KEEPABOVE_H
#define QB64PE_VSCODE_KEEPABOVE_H
#if defined(__APPLE__)
#include <dlfcn.h>
#include <dispatch/dispatch.h>
#include <objc/message.h>
#include <objc/runtime.h>
static int qb64pe_ka_tries = 0;
static void qb64pe_ka_tick(void *) {
    bool done = false;
    // NSApp is created by the windowing backend; never create it ourselves.
    id *nsapp = (id *)dlsym(RTLD_DEFAULT, "NSApp");
    if (nsapp && *nsapp) {
        id wins = ((id(*)(id, SEL))objc_msgSend)(*nsapp, sel_registerName("windows"));
        unsigned long n = wins ? ((unsigned long (*)(id, SEL))objc_msgSend)(wins, sel_registerName("count")) : 0;
        for (unsigned long i = 0; i < n; i++) {
            id w = ((id(*)(id, SEL, unsigned long))objc_msgSend)(wins, sel_registerName("objectAtIndex:"), i);
            if (!((BOOL(*)(id, SEL))objc_msgSend)(w, sel_registerName("isVisible"))) continue;
            ((void (*)(id, SEL, long))objc_msgSend)(w, sel_registerName("setLevel:"), 3L); // NSFloatingWindowLevel
            done = true;
        }
    }
    if (!done && ++qb64pe_ka_tries < 200)
        dispatch_after_f(dispatch_time(DISPATCH_TIME_NOW, 100 * NSEC_PER_MSEC), dispatch_get_main_queue(), NULL, qb64pe_ka_tick);
}
struct qb64pe_ka_init {
    qb64pe_ka_init() { dispatch_async_f(dispatch_get_main_queue(), NULL, qb64pe_ka_tick); }
};
static qb64pe_ka_init qb64pe_ka_init_instance;
#elif defined(_WIN32)
#include <windows.h>
static BOOL CALLBACK qb64pe_ka_enum(HWND h, LPARAM found) {
    DWORD pid = 0;
    GetWindowThreadProcessId(h, &pid);
    if (pid != GetCurrentProcessId()) return TRUE;
    // The program window by class (GLFW, or freeglut before QB64PE 4.7) even
    // while still hidden; otherwise any visible top-level window of ours.
    char cls[32] = {0};
    GetClassNameA(h, cls, sizeof(cls) - 1);
    bool program = !lstrcmpA(cls, "GLFW30") || !lstrcmpA(cls, "FREEGLUT");
    if (program || (IsWindowVisible(h) && !GetWindow(h, GW_OWNER) && lstrcmpA(cls, "GLFW3 Helper"))) {
        SetWindowPos(h, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE);
        *(int *)found = 1;
    }
    return TRUE;
}
static DWORD WINAPI qb64pe_ka_thread(LPVOID) {
    for (int i = 0; i < 200; i++) {
        int found = 0;
        EnumWindows(qb64pe_ka_enum, (LPARAM)&found);
        if (found) return 0;
        Sleep(100);
    }
    return 0;
}
struct qb64pe_ka_init {
    qb64pe_ka_init() {
        HANDLE t = CreateThread(NULL, 0, qb64pe_ka_thread, NULL, 0, NULL);
        if (t) CloseHandle(t);
    }
};
static qb64pe_ka_init qb64pe_ka_init_instance;
#endif
#endif
`;

/**
 * Write {@link KEEP_ABOVE_HEADER} to the temp dir and return the lines that
 * pull it into the program. Append them after the program text (DECLARE
 * LIBRARY is accepted after SUBs), so flattened line numbers don't move.
 */
export function keepAboveDeclareLines(): string[] {
  const file = path.join(os.tmpdir(), "qb64pe-vscode-keepabove.h");
  if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== KEEP_ABOVE_HEADER) {
    fs.writeFileSync(file, KEEP_ABOVE_HEADER);
  }
  const spec = file.replace(/\\/g, "/").replace(/\.h$/, "");
  return [`DECLARE LIBRARY "${spec}"`, "END DECLARE"];
}
