#!/usr/bin/env node
/**
 * Environment doctor: clone → first MP4 prerequisites in one command.
 * Exit 0 when the studio can run setup/check/render; non-zero with actionable fixes.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

const checks = [];
let failed = 0;

function record(ok, name, detail, fix = null) {
  checks.push({ ok, name, detail, fix });
  if (!ok) failed += 1;
  const mark = ok ? "ok" : "FAIL";
  console.log(`[${mark}] ${name}: ${detail}`);
  if (!ok && fix) console.log(`       → ${fix}`);
}

function run(command, args, opts = {}) {
  return spawnSync(command, args, { encoding: "utf8", shell: false, ...opts });
}

function firstLine(text) {
  return String(text || "").trim().split(/\r?\n/)[0] || "";
}

function parseNodeMajor(version) {
  const match = String(version).match(/^v?(\d+)/);
  return match ? Number(match[1]) : NaN;
}

function expectedPnpm() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
    const raw = pkg.packageManager || "";
    return raw.match(/^pnpm@([^+]+)/)?.[1] ?? null;
  } catch {
    return null;
  }
}

function commandExists(bin) {
  const result = run(bin, ["-version"]);
  if (result.error && result.error.code === "ENOENT") return { ok: false, detail: `${bin} not found on PATH` };
  if (result.status !== 0 && bin !== "ffmpeg" && bin !== "ffprobe") {
    // Some tools use -V; try common fallbacks below.
  }
  return { ok: result.status === 0 || !result.error, detail: firstLine(result.stdout || result.stderr), error: result.error };
}

// Node
{
  const major = parseNodeMajor(process.version);
  const ok = Number.isFinite(major) && major >= 22;
  record(
    ok,
    "Node.js",
    `${process.version} (need ≥ 22)`,
    ok ? null : "Install Node.js 22+ from https://nodejs.org/ and reopen the shell.",
  );
}

// pnpm
{
  const expected = expectedPnpm();
  const result = run("pnpm", ["--version"]);
  if (result.error?.code === "ENOENT") {
    record(false, "pnpm", "not found on PATH", "Run: corepack enable && corepack prepare pnpm@11.28.0 --activate");
  } else {
    const version = firstLine(result.stdout) || "unknown";
    const ok = !expected || version === expected || version.startsWith(`${expected}.`);
    record(
      result.status === 0 && ok,
      "pnpm",
      expected ? `${version} (need ${expected})` : version,
      ok ? null : `Run: corepack enable && corepack prepare pnpm@${expected} --activate`,
    );
  }
}

// ffmpeg / ffprobe
for (const bin of ["ffmpeg", "ffprobe"]) {
  const result = run(bin, ["-version"]);
  if (result.error?.code === "ENOENT") {
    record(false, bin, "not found on PATH", "Install ffmpeg (includes ffprobe), e.g. apt install ffmpeg / brew install ffmpeg.");
  } else {
    record(result.status === 0, bin, firstLine(result.stdout) || "found", result.status === 0 ? null : `Install or repair ${bin}.`);
  }
}

// Python 3
{
  const result = run("python3", ["--version"]);
  if (result.error?.code === "ENOENT") {
    record(false, "Python 3", "python3 not found on PATH", "Install Python 3 and ensure `python3` is on PATH.");
  } else {
    record(result.status === 0, "Python 3", firstLine(result.stdout) || "found", result.status === 0 ? null : "Install Python 3.");
  }
}

// node_modules / HyperFrames / GSAP
{
  const nm = path.join(ROOT, "node_modules");
  if (!fs.existsSync(nm)) {
    record(false, "dependencies", "node_modules missing", "From the repo root run: pnpm install --frozen-lockfile");
  } else {
    const hyperframes = path.join(nm, "hyperframes", "bin", "hyperframes.mjs");
    const gsap = path.join(nm, "gsap", "dist", "gsap.min.js");
    record(
      fs.existsSync(hyperframes),
      "HyperFrames",
      fs.existsSync(hyperframes) ? "bin/hyperframes.mjs present" : "missing",
      fs.existsSync(hyperframes) ? null : "Run: pnpm install --frozen-lockfile",
    );
    record(
      fs.existsSync(gsap),
      "GSAP",
      fs.existsSync(gsap) ? "dist/gsap.min.js present" : "missing",
      fs.existsSync(gsap) ? null : "Run: pnpm install --frozen-lockfile",
    );
  }
}

// Kit build artifacts (optional soft check — setup creates them)
{
  const kitJs = path.join(ROOT, "kit", "dist", "mafia-kit.js");
  const version = path.join(ROOT, "kit", "VERSION");
  const hasVersion = fs.existsSync(version);
  const hasDist = fs.existsSync(kitJs);
  if (!hasDist) {
    record(
      false,
      "kit build",
      "kit/dist/mafia-kit.js missing",
      "Run: pnpm run setup   (vendors deps, builds kit, copies into proyectos/)",
    );
  } else {
    record(true, "kit build", `mafia-kit.js present · VERSION ${hasVersion ? fs.readFileSync(version, "utf8").trim() : "unknown"}`);
  }
}

console.log("");
if (failed) {
  console.log(`Doctor found ${failed} issue(s). Fix the items above, then re-run: pnpm run doctor`);
  console.log("Happy path after green doctor: pnpm run setup → pnpm run new starter-9x16 my-video → pnpm run check my-video → pnpm run render my-video");
  process.exitCode = 1;
} else {
  console.log("Doctor OK — environment looks ready.");
  console.log("Next: pnpm run setup && pnpm run new starter-9x16 my-video && pnpm run check my-video");
}
