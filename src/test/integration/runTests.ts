import * as path from "path";
import { runTests } from "@vscode/test-electron";

// Launches a VS Code Extension Development Host on test/fixtures and runs
// suite/index.js inside it. `npm run test:integration` (add `xvfb-run -a`
// on a headless machine).
async function main(): Promise<void> {
  // Set by VS Code's integrated terminal; it would make the test VS Code run
  // as plain Node and `require()` the workspace path instead of opening it.
  delete process.env.ELECTRON_RUN_AS_NODE;

  const extensionDevelopmentPath = path.resolve(__dirname, "../../..");
  const extensionTestsPath = path.resolve(__dirname, "./suite/index");
  const workspace = path.resolve(extensionDevelopmentPath, "test/fixtures");
  try {
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [workspace, "--disable-extensions", "--disable-gpu", "--disable-workspace-trust"],
    });
  } catch (error) {
    console.error("Integration tests failed:", error);
    process.exit(1);
  }
}

main();
