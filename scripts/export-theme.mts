#!/usr/bin/env node
// scripts/export-theme.mts — regenerates theme/oneshot-block-theme/src/theme-tokens.css
// from theme/oneshot-block-theme/DESIGN.md using oneshot-theme's own
// `design.md export --format css-tailwind`, then repoints the output at the
// `--wp--custom--color--*` / `--wp--custom--font--*` names theme.json's
// `var(...)` references expect. Never hand-edit theme-tokens.css.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const themeDir = join(repoRoot, "theme", "oneshot-block-theme");
const designMdPath = join(themeDir, "DESIGN.md");
const outPath = join(themeDir, "src", "theme-tokens.css");
const cliEntry = resolve(repoRoot, "node_modules", ".bin", "design.md");

if (!existsSync(cliEntry)) {
  console.error("export-theme: design.md CLI not found — run `npm install` first.");
  process.exit(1);
}
if (!existsSync(designMdPath)) {
  console.error(`export-theme: no DESIGN.md at ${designMdPath}`);
  process.exit(1);
}

const css = execFileSync(cliEntry, ["export", designMdPath, "--format", "css-tailwind"], {
  encoding: "utf8",
});

// design.md's css-tailwind output declares --color-* / --font-* inside an
// @theme block; theme.json's var() calls reference --wp--custom--color-* /
// --wp--custom--font-* (WordPress's own custom-property naming for
// settings.custom). Rewrite the declared names, keep everything else.
const rewritten = css
  .replace(/--color-/g, "--wp--custom--color--")
  .replace(/--font-/g, "--wp--custom--font--");

const header = `/*
 * Generated stylesheet — DO NOT hand-edit hex values here.
 *
 * Regenerate with: npm run export:theme
 * Source of truth: theme/oneshot-block-theme/DESIGN.md
 */\n\n`;

writeFileSync(outPath, header + rewritten);
console.log(`export-theme: wrote ${outPath}`);
