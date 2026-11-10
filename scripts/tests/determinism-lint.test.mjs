import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const LINT = path.join(ROOT, "scripts/lint-determinism.mjs");

test("determinism lint passes on the repository tree", () => {
  const output = execFileSync(process.execPath, [LINT], { cwd: ROOT, encoding: "utf8" });
  assert.match(output, /Determinism lint OK/);
});

test("determinism lint catches Math.random in a template composition", () => {
  // Must not start with "_" — lint skips underscore template folders (e.g. _common).
  const plant = path.join(ROOT, "templates", "lint-fixture-tmp");
  fs.rmSync(plant, { recursive: true, force: true });
  fs.mkdirSync(path.join(plant, "compositions"), { recursive: true });
  fs.writeFileSync(
    path.join(plant, "compositions", "bad.html"),
    `<script>const x = Math.random();</script>\n`,
  );
  try {
    let failed = false;
    let combined = "";
    try {
      execFileSync(process.execPath, [LINT], {
        cwd: ROOT,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (error) {
      failed = true;
      combined = `${error.stdout || ""}${error.stderr || ""}`;
    }
    assert.equal(failed, true, "expected lint to fail on Math.random");
    assert.match(combined, /Math\.random/);
  } finally {
    fs.rmSync(plant, { recursive: true, force: true });
  }
});
