import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { vendor } from "./vendor.mjs";
import { buildKit } from "./lib/kit-build.mjs";
import { copyKit } from "./kit-copy.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");

function fail(message, fix) {
  console.error(`setup failed: ${message}`);
  if (fix) console.error(`→ ${fix}`);
  console.error("Tip: run `pnpm run doctor` to see every missing prerequisite.");
  process.exitCode = 1;
}

try {
  if (!fs.existsSync(path.join(ROOT, "node_modules"))) {
    fail("node_modules is missing.", "pnpm install --frozen-lockfile");
  } else {
    vendor();
    const r = buildKit();
    const projects = path.join(ROOT, "proyectos");
    if (fs.existsSync(projects)) {
      for (const name of fs.readdirSync(projects).sort()) {
        if (fs.existsSync(path.join(projects, name, "index.html"))) copyKit(path.join("proyectos", name));
      }
    }
    console.log(`Code to Video Studio ready · kit ${r.version}`);
    console.log("Next: pnpm run new starter-9x16 my-video && pnpm run check my-video");
  }
} catch (error) {
  const message = error?.message || String(error);
  let fix = "pnpm run doctor";
  if (/GSAP not installed|Three\.js not installed|lottie-web not installed|not installed\. Run pnpm install/i.test(message)) {
    fix = "pnpm install --frozen-lockfile && pnpm run setup";
  } else if (/Expected pinned gsap|MorphSVGPlugin is missing/i.test(message)) {
    fix = "pnpm install --frozen-lockfile   # restores pinned gsap@3.15.0 with MorphSVGPlugin";
  } else if (/HyperFrames/i.test(message)) {
    fix = "pnpm install --frozen-lockfile   # HyperFrames is a root devDependency";
  }
  fail(message, fix);
}
