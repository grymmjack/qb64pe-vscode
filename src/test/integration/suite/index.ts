import * as path from "path";
import Mocha = require("mocha");

export function run(): Promise<void> {
  const mocha = new Mocha({ ui: "bdd", color: true, timeout: 30000 });
  mocha.addFile(path.resolve(__dirname, "providers.test.js"));
  return new Promise((resolve, reject) => {
    try {
      mocha.run((failures) => (failures > 0 ? reject(new Error(`${failures} tests failed.`)) : resolve()));
    } catch (error) {
      reject(error);
    }
  });
}
