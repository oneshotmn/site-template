// Shared theme contract test — copy this single file into a consuming site's
// test suite (or run it here against `themes/*`) to enforce CONTRACT.md.
//
// Self-contained: zero dependencies outside Node's stdlib (WCAG relative
// luminance/contrast math is inlined below), so a site can drop this one
// file into its test directory with nothing extra to install. Locates
// DESIGN.md files and a `src/` tree either from environment variables or
// from sane defaults relative to this file, so it works unmodified whether
// it lives in `oneshot-theme/test/` (checking every theme in `themes/*`) or
// copied into `some-site/test/theme-contract.test.mts` (checking that
// site's single active theme + its `src/`).
//
// Env vars (all optional):
//   THEME_CONTRACT_THEME_GLOB  glob-ish: a directory containing DESIGN.md
//                              files one level down (default: themes/*)
//   THEME_CONTRACT_SRC_DIR     a site's src/ dir to scan for raw-hex and
//                              stray --color-* violations (default: src, if
//                              it exists next to the nearest package.json)
//
// Args: `node --test theme-contract.test.mts -- <themeDir> [srcDir]` also
// works — the first two positional argv entries after `--` override the env
// vars, so a site can wire it into a single-theme check without exporting
// anything.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Locate inputs
// ---------------------------------------------------------------------------

function parseArgs() {
  const dashIdx = process.argv.indexOf("--");
  return dashIdx === -1 ? [] : process.argv.slice(dashIdx + 1);
}

function resolveThemeDirs() {
  const [argThemeDir] = parseArgs();
  const explicit = argThemeDir || process.env.THEME_CONTRACT_THEME_GLOB;
  if (explicit) {
    const abs = resolve(explicit);
    if (!existsSync(abs)) {
      throw new Error(`theme dir not found: ${abs}`);
    }
    // A single theme dir (has its own DESIGN.md) vs. a parent of many.
    if (existsSync(join(abs, "DESIGN.md"))) return [abs];
    return readdirSync(abs, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => join(abs, e.name))
      .filter((dir) => existsSync(join(dir, "DESIGN.md")));
  }
  // Default: themes/* relative to the repo this file lives in.
  const repoRoot = resolve(__dirname, "..");
  const themesRoot = join(repoRoot, "themes");
  if (!existsSync(themesRoot)) {
    throw new Error(
      `no theme dir given and no themes/ directory found at ${themesRoot}. ` +
        `Set THEME_CONTRACT_THEME_GLOB or pass a theme dir as the first arg.`,
    );
  }
  return readdirSync(themesRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => join(themesRoot, e.name))
    .filter((dir) => existsSync(join(dir, "DESIGN.md")));
}

function resolveSrcDir() {
  const [, argSrcDir] = parseArgs();
  const explicit = argSrcDir || process.env.THEME_CONTRACT_SRC_DIR;
  if (explicit) return resolve(explicit);
  // Best-effort default: a sibling `src/` of the nearest package.json above
  // this test file. In this repo that directory does not exist, which is
  // fine — the raw-hex / stray-role scan is a no-op when there is no site
  // source to scan (this repo's own hex values live only inside DESIGN.md,
  // which the scan deliberately skips).
  let dir = __dirname;
  for (let i = 0; i < 6; i += 1) {
    const candidate = join(dir, "src");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

// ---------------------------------------------------------------------------
// DESIGN.md front matter parsing (colors: only — minimal, dependency-free)
// ---------------------------------------------------------------------------

function parseColorsFrontMatter(designMdPath) {
  const text = readFileSync(designMdPath, "utf8");
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    throw new Error(`${designMdPath}: no YAML front matter found`);
  }
  const yaml = match[1];
  const colorsMatch = yaml.match(/^colors:\n((?:[ \t]+.+\n?)+)/m);
  if (!colorsMatch) {
    throw new Error(`${designMdPath}: no "colors:" key in front matter`);
  }
  const colors = {};
  for (const line of colorsMatch[1].split("\n")) {
    const kv = line.match(/^\s+([A-Za-z0-9_-]+):\s*["']?(#[0-9a-fA-F]{3,8})["']?\s*$/);
    if (kv) colors[kv[1]] = kv[2];
  }
  return colors;
}

// ---------------------------------------------------------------------------
// Colour math (sRGB relative luminance / WCAG contrast — inlined, no deps)
// ---------------------------------------------------------------------------

function hexToRgb(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3 || h.length === 4) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function srgbToLinear(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(srgbToLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function wcagContrast(fgHex, bgHex) {
  const l1 = relativeLuminance(fgHex);
  const l2 = relativeLuminance(bgHex);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

// ---------------------------------------------------------------------------
// Contract data
// ---------------------------------------------------------------------------

const REQUIRED_ROLES = [
  "surface",
  "surface-raised",
  "surface-inverse",
  "surface-inverse-raised",
  "surface-inverse-well",
  "text",
  "text-body",
  "text-muted",
  "text-on-inverse",
  "text-on-inverse-muted",
  "primary",
  "primary-on-inverse",
  "accent",
  "accent-tint",
  "primary-tint",
  "line",
  "line-soft",
  "error",
  "error-text",
  "error-surface",
  "disabled",
  "disabled-text",
];

const GATED_PAIRS = [
  ["text", "surface"],
  ["text-body", "surface"],
  ["text-muted", "surface"],
  ["text-on-inverse", "surface-inverse"],
  ["text-on-inverse-muted", "surface-inverse"],
  ["primary", "surface"],
  ["primary-on-inverse", "surface-inverse"],
  ["error-text", "surface"],
  ["error-text", "error-surface"],
  ["disabled-text", "disabled"],
];

const WCAG_AA_MIN = 4.5;

const themeDirs = resolveThemeDirs();

assert.ok(
  themeDirs.length > 0,
  "expected at least one themes/<name>/DESIGN.md to check",
);

for (const themeDir of themeDirs) {
  const themeName = themeDir.split(/[\\/]/).pop();
  const designMdPath = join(themeDir, "DESIGN.md");

  test(`Given ${themeName}'s DESIGN.md, when parsed, then every contract role and its -dark counterpart is present`, () => {
    const colors = parseColorsFrontMatter(designMdPath);
    const missing = [];
    for (const role of REQUIRED_ROLES) {
      if (!colors[role]) missing.push(role);
      if (!colors[`${role}-dark`]) missing.push(`${role}-dark`);
    }
    assert.deepEqual(
      missing,
      [],
      `${themeName} is missing role(s): ${missing.join(", ")}`,
    );
  });

  for (const suffix of ["", "-dark"]) {
    const schemeLabel = suffix === "-dark" ? "dark" : "light";
    for (const [fgRole, bgRole] of GATED_PAIRS) {
      test(`Given ${themeName} ${schemeLabel} scheme, when checking ${fgRole}${suffix} on ${bgRole}${suffix}, then WCAG contrast is >= ${WCAG_AA_MIN}:1`, () => {
        const colors = parseColorsFrontMatter(designMdPath);
        const fg = colors[`${fgRole}${suffix}`];
        const bg = colors[`${bgRole}${suffix}`];
        assert.ok(fg, `missing ${fgRole}${suffix} in ${themeName}`);
        assert.ok(bg, `missing ${bgRole}${suffix} in ${themeName}`);
        const ratio = wcagContrast(fg, bg);
        assert.ok(
          ratio >= WCAG_AA_MIN,
          `${themeName} ${fgRole}${suffix} (${fg}) on ${bgRole}${suffix} (${bg}) is ${ratio.toFixed(2)}:1, needs >= ${WCAG_AA_MIN}:1`,
        );
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Invariant: no raw hex, and every --color-* is a contract role, in a site's
// src/ tree (skipped entirely when no src dir is configured/found — that is
// expected when this file runs inside oneshot-theme itself).
// ---------------------------------------------------------------------------

const srcDir = resolveSrcDir();

function walkFiles(dir, exts) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(full, exts));
    } else if (exts.some((ext) => entry.name.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

const ALL_ROLE_NAMES = new Set(
  REQUIRED_ROLES.flatMap((role) => [role, `${role}-dark`]),
);
const HEX_LITERAL = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
const CSS_COLOR_VAR = /--color-([a-z0-9-]+)\s*:/g;

test("Given a site's src/ tree (when configured), when scanned, then it contains no raw hex color literals", (t) => {
  if (!srcDir || !existsSync(srcDir)) {
    t.skip("no src/ dir configured (THEME_CONTRACT_SRC_DIR unset and none found) — nothing to scan");
    return;
  }
  const files = walkFiles(srcDir, [".css", ".ts", ".tsx", ".js", ".jsx", ".mts"]);
  const offenders = [];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    const matches = text.match(HEX_LITERAL);
    if (matches) offenders.push(`${file}: ${matches.join(", ")}`);
  }
  assert.deepEqual(
    offenders,
    [],
    `raw hex literal(s) found outside DESIGN.md:\n${offenders.join("\n")}`,
  );
});

test("Given a site's src/ tree (when configured), when scanned for --color-* declarations, then every suffix is a contract role", (t) => {
  if (!srcDir || !existsSync(srcDir)) {
    t.skip("no src/ dir configured (THEME_CONTRACT_SRC_DIR unset and none found) — nothing to scan");
    return;
  }
  const files = walkFiles(srcDir, [".css"]);
  const offenders = [];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(CSS_COLOR_VAR)) {
      const roleName = match[1];
      if (roleName.startsWith("font-") || roleName.startsWith("breakpoint-")) continue;
      if (!ALL_ROLE_NAMES.has(roleName)) {
        offenders.push(`${file}: --color-${roleName}`);
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `--color-* declaration(s) that are not contract roles:\n${offenders.join("\n")}`,
  );
});
