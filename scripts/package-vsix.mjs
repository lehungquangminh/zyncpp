import { execSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
try {
  rmSync("dist", { recursive: true, force: true });
  mkdirSync("dist", { recursive: true });
  const exts = [
    { dir: "suite", out: "zyncpp-suite" },
    { dir: "core", out: "zyn-cpp-core" },
    { dir: "build", out: "zyn-cpp-build" },
    { dir: "debug", out: "zyn-cpp-debug" },
    { dir: "intellisense", out: "zyn-cpp-intellisense" },
    { dir: "test", out: "zyn-cpp-test" },
    { dir: "pkg", out: "zyn-cpp-pkg" },
    { dir: "profiler", out: "zyn-cpp-profiler" },
    { dir: "templates", out: "zyn-cpp-templates" },
    { dir: "bootstrap", out: "zyn-cpp-bootstrap" }
  ];
  for (const { dir, out } of exts) {
    execSync(`pnpm --filter ./packages/${dir} run build`, { stdio: "inherit" });
    execSync(`npx vsce package --allow-missing-repository --yarn -o ../../dist/${out}.vsix`, { cwd: `packages/${dir}`, stdio: "inherit" });
  }
  console.log("VSIX packaged to dist/");
} catch (e) { console.error(e); process.exit(1); }


