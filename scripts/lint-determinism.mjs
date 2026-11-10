#!/usr/bin/env node
/**
 * Static lint: block unseeded Math.random / Date.now / performance.now
 * in kit/ and composition sources. Use MAFIA.rand(seed) instead.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FORBIDDEN = [
  { name: "Math.random", re: /\bMath\.random\s*\(/g },
  { name: "Date.now", re: /\bDate\.now\s*\(/g },
  { name: "performance.now", re: /\bperformance\.now\s*\(/g },
];

const TEXT_EXT = new Set([".js", ".mjs", ".cjs", ".ts", ".tsx", ".html"]);
const SKIP_DIR_NAMES = new Set([
  "node_modules",
  "vendor",
  "dist",
  ".git",
  ".hyperframes",
  "renders",
]);

function shouldSkipDir(name) {
  return SKIP_DIR_NAMES.has(name) || name.startsWith(".");
}

function collectFiles(startDir) {
  const out = [];
  if (!fs.existsSync(startDir)) return out;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (shouldSkipDir(entry.name)) continue;
        walk(path.join(dir, entry.name));
        continue;
      }
      if (!entry.isFile()) continue;
      if (!TEXT_EXT.has(path.extname(entry.name))) continue;
      out.push(path.join(dir, entry.name));
    }
  };
  walk(startDir);
  return out;
}

/** Strip // and /* * / comments plus quoted strings so literals are ignored. */
function stripNoise(source) {
  let out = "";
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];
    if (ch === "/" && next === "/") {
      out += " ";
      i += 2;
      while (i < source.length && source[i] !== "\n") i += 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      out += " ";
      i += 2;
      while (i < source.length - 1 && !(source[i] === "*" && source[i + 1] === "/")) {
        out += source[i] === "\n" ? "\n" : " ";
        i += 1;
      }
      i += 2;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      const quote = ch;
      out += " ";
      i += 1;
      while (i < source.length) {
        if (source[i] === "\\") {
          i += 2;
          continue;
        }
        if (source[i] === quote) {
          i += 1;
          break;
        }
        out += source[i] === "\n" ? "\n" : " ";
        i += 1;
      }
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

function lineNumber(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function isAllowlisted(file, name, lineText) {
  // Explicit escape hatch for rare host-only probes (must be intentional).
  if (/\bdeterminism-ok\b/.test(lineText)) return true;
  // Seeded helper is the approved API; do not treat it as Date/Math.
  if (name !== "Math.random" && /\bMAFIA\.rand\b/.test(lineText)) return false;
  void file;
  return false;
}

function scanFile(file) {
  const source = fs.readFileSync(file, "utf8");
  const cleaned = stripNoise(source);
  const lines = source.split(/\r?\n/);
  const hits = [];
  for (const rule of FORBIDDEN) {
    rule.re.lastIndex = 0;
    let match;
    while ((match = rule.re.exec(cleaned))) {
      const line = lineNumber(source, match.index);
      const lineText = lines[line - 1] ?? "";
      if (isAllowlisted(file, rule.name, lineText)) continue;
      hits.push({ name: rule.name, line, lineText: lineText.trim() });
    }
  }
  return hits;
}

function compositionRoots() {
  const roots = [];
  // Default: kit + templates (CI-stable). Opt into ephemeral proyectos/ with
  // LINT_DETERMINISM_INCLUDE_PROYECTOS=1 for local full-tree scans.
  const bases = ["templates"];
  if (process.env.LINT_DETERMINISM_INCLUDE_PROYECTOS === "1") bases.push("proyectos");
  for (const base of bases) {
    const parent = path.join(ROOT, base);
    if (!fs.existsSync(parent)) continue;
    for (const entry of fs.readdirSync(parent, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith("_")) continue;
      const compositions = path.join(parent, entry.name, "compositions");
      if (fs.existsSync(compositions)) roots.push(compositions);
      // Also scan project/template index.html timelines (not under compositions/).
      const indexHtml = path.join(parent, entry.name, "index.html");
      if (fs.existsSync(indexHtml)) roots.push(indexHtml);
    }
  }
  return roots;
}

function scanFileSafe(file) {
  try {
    return scanFile(file);
  } catch (error) {
    if (error && error.code === "ENOENT") return [];
    throw error;
  }
}

const targets = [path.join(ROOT, "kit"), ...compositionRoots()];
const files = [];
for (const target of targets) {
  let stat;
  try {
    stat = fs.statSync(target);
  } catch (error) {
    if (error && error.code === "ENOENT") continue;
    throw error;
  }
  if (stat.isFile()) files.push(target);
  else files.push(...collectFiles(target));
}

const uniqueFiles = [...new Set(files)].sort();
const violations = [];
for (const file of uniqueFiles) {
  for (const hit of scanFileSafe(file)) {
    violations.push({ file: path.relative(ROOT, file).split(path.sep).join("/"), ...hit });
  }
}

if (violations.length) {
  console.error("Determinism lint failed — unseeded time/random APIs are not seek-safe in rendered video.");
  console.error("Use MAFIA.rand(seed) for randomness and derive state from composition time t.");
  console.error("To mark a rare intentional exception, add a `determinism-ok` comment on the same line.\n");
  for (const hit of violations) {
    console.error(`${hit.file}:${hit.line}: ${hit.name}  →  ${hit.lineText}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Determinism lint OK (${uniqueFiles.length} file(s) scanned).`);
}
