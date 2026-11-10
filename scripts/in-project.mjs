import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { renderProject } from "./lib/render-pipeline.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const [action,project,...rest]=process.argv.slice(2);

function fail(message, fix) {
  console.error(`Error: ${message}`);
  if (fix) console.error(`→ ${fix}`);
  process.exit(1);
}

if (!action || !project) {
  fail(
    "Usage: node scripts/in-project.mjs <dev|check|render|snapshot> <project> [...args]",
    "Example: pnpm run check demo   or   pnpm run render my-video \"first pass\"",
  );
}
let dir=path.join(ROOT,"proyectos",project);
if (!fs.existsSync(path.join(dir,"index.html"))) dir=path.resolve(ROOT,project);
if (!fs.existsSync(path.join(dir,"index.html"))) {
  fail(
    `Project not found: ${project}`,
    `Create one with: pnpm run new starter-9x16 ${project}   (or list templates under templates/)`,
  );
}
const hyperframesEntry=path.join(ROOT,"node_modules","hyperframes","bin","hyperframes.mjs");
if (!fs.existsSync(hyperframesEntry)) {
  fail(
    "HyperFrames not installed.",
    "pnpm install --frozen-lockfile && pnpm run doctor",
  );
}

if (action==="render") {
  let note="";
  if (rest.length && !rest[0].startsWith("-")) note=rest.shift();
  try {
    const result=renderProject({projectDir:dir,hyperframesBin:[process.execPath,hyperframesEntry],hyperframesArgs:rest,note});
    if (result.status !== 0) {
      console.error(`render failed with exit ${result.status}.`);
      console.error("→ Confirm ffmpeg works (`ffmpeg -version`), then: pnpm run doctor && pnpm run check " + project);
    } else {
      console.log("Next visual gates: contact-sheet → qa → REVIEW.md → pnpm run status " + project);
    }
    process.exitCode=result.status;
  } catch (error) {
    const message = error?.message || String(error);
    let fix = "pnpm run doctor";
    if (/Falta ffmpeg|ffmpeg/i.test(message)) fix = "Install ffmpeg/ffprobe, then re-run: pnpm run render " + project;
    else if (/HyperFrames/i.test(message)) fix = "pnpm install --frozen-lockfile";
    else if (/index\.html/i.test(message)) fix = "Open the project folder and confirm index.html exists.";
    console.error(`Error: ${message}`);
    console.error(`→ ${fix}`);
    process.exitCode = 1;
  }
} else {
  const args=action==="dev" ? ["preview",...rest] : [action,...rest];
  const result=spawnSync(process.execPath,[hyperframesEntry,...args],{cwd:dir,stdio:"inherit",shell:false});
  if ((result.status ?? 1) !== 0) {
    console.error(`${action} failed with exit ${result.status ?? 1}.`);
    console.error(`→ pnpm run doctor   then   pnpm run check ${project}`);
  }
  process.exit(result.status ?? 1);
}
