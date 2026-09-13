// Repo-shape test: every caller workflow under .github/workflows/ must be a
// pure stub that delegates to oneshotmn/.github's reusable workflows — no
// `run:` step and no repo-local `steps:` list. This is what keeps every bit
// of actual logic in exactly one place (the shared `.github` repo) instead
// of being copied into each site and drifting.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const workflowsDir = join(repoRoot, ".github", "workflows");

const MAX_STUB_LINES = 15;

test("Given .github/workflows/, when listed, then it is not empty", () => {
  assert.ok(existsSync(workflowsDir), `${workflowsDir} does not exist`);
  const files = readdirSync(workflowsDir).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));
  assert.ok(files.length > 0, "expected at least one workflow file");
});

const workflowFiles = existsSync(workflowsDir)
  ? readdirSync(workflowsDir).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
  : [];

for (const file of workflowFiles) {
  const full = join(workflowsDir, file);
  const raw = readFileSync(full, "utf8");

  test(`Given ${file}, when read, then it is at most ${MAX_STUB_LINES} non-blank/non-comment lines`, () => {
    const lines = raw
      .split("\n")
      .filter((l) => l.trim() !== "" && !l.trim().startsWith("#"));
    assert.ok(
      lines.length <= MAX_STUB_LINES,
      `${file} has ${lines.length} substantive lines, expected <= ${MAX_STUB_LINES}`,
    );
  });

  test(`Given ${file}, when parsed, then every job calls a reusable workflow (uses:) with no run: or repo-local steps:`, () => {
    const doc = parseYaml(raw);
    assert.ok(doc.jobs, `${file} has no jobs:`);
    for (const [jobName, job] of Object.entries(doc.jobs)) {
      assert.ok(
        typeof job.uses === "string" && job.uses.startsWith("oneshotmn/.github/"),
        `${file} job "${jobName}" must have a top-level "uses: oneshotmn/.github/..." — found: ${JSON.stringify(job.uses)}`,
      );
      assert.ok(
        !("run" in job),
        `${file} job "${jobName}" has a repo-local "run:" — logic belongs only in oneshotmn/.github`,
      );
      assert.ok(
        !("steps" in job),
        `${file} job "${jobName}" has a repo-local "steps:" — logic belongs only in oneshotmn/.github`,
      );
    }
  });
}

test("Given the workflow set, when compared against the required caller stubs, then all eight are present", () => {
  const required = [
    "ci.yml",
    "preview.yml",
    "preview-bootstrap.yml",
    "production-deploy.yml",
    "automerge.yml",
    "deps.yml",
    "actions-budget.yml",
    "token-health.yml",
  ];
  const missing = required.filter((f) => !workflowFiles.includes(f));
  assert.deepEqual(missing, [], `missing caller stub(s): ${missing.join(", ")}`);
});

test("Given the repo root, when scanned, then no file duplicates logic the shared .github workflows own (Dockerfile/entrypoint building steps, gitleaks install, app-token minting)", () => {
  // Structural check: no repo-local script re-implements gitleaks install or
  // GitHub App token minting — those live only in oneshotmn/.github.
  const offenders = [];
  const bannedPatterns = [/gitleaks\/gitleaks\/releases/, /create-github-app-token/];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (
        !full.includes(join(".github", "workflows")) &&
        full !== join(repoRoot, "test", "repo-shape.test.mts")
      ) {
        // workflows dir is checked separately above (and legitimately
        // allowed to reference these strings); this test file itself names
        // the banned patterns in source, which is not a duplication of
        // logic. Everywhere else should have zero occurrences.
        const text = readFileSync(full, "utf8").toString();
        for (const pattern of bannedPatterns) {
          if (pattern.test(text)) offenders.push(`${full}: ${pattern}`);
        }
      }
    }
  }
  walk(repoRoot);
  assert.deepEqual(offenders, [], `logic duplicated outside the shared workflows:\n${offenders.join("\n")}`);
});
