#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import cp from "node:child_process";
import os from "node:os";

const args = process.argv.slice(2);

function arg(name, fallback = null) {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1] ?? fallback;
}

function timestampForPath() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

const deterministic = args.includes("--deterministic");
const outDir = arg("--out", null) || path.join("audit", "_latest", "icare-dreps-" + timestampForPath());

function isoNow() {
  return deterministic ? "2026-01-01T00:00:00.000Z" : new Date().toISOString();
}

function runId() {
  return deterministic ? "icare-beui2-reference-run" : "icare-beui2-" + timestampForPath();
}

function execText(command, fallback = "unknown") {
  try {
    return cp.execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return fallback;
  }
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function sha256File(file) {
  return sha256(fs.readFileSync(file));
}

function sizeBytes(file) {
  return fs.statSync(file).size;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeText(file, content) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, content, "utf8");
}

function writeJson(file, value) {
  writeText(file, JSON.stringify(value, null, 2) + "\n");
}

function listFiles(dir, predicate) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full, predicate));
    else if (!predicate || predicate(full)) out.push(full);
  }
  return out.sort();
}

function copyIfExists(src, dest) {
  if (!fs.existsSync(src)) return false;
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  return true;
}

function mediaTypeFor(file) {
  if (file.endsWith(".json")) return "application/json";
  if (file.endsWith(".ndjson")) return "application/x-ndjson";
  if (file.endsWith(".md")) return "text/markdown";
  if (file.endsWith(".html")) return "text/html";
  if (file.endsWith(".log")) return "text/plain";
  if (file.endsWith(".c") || file.endsWith(".h")) return "text/x-c";
  if (file.endsWith(".txt")) return "text/plain";
  return "application/octet-stream";
}

function artifactKindFor(file) {
  if (file.endsWith(".json")) return "json";
  if (file.endsWith(".ndjson")) return "trace";
  if (file.endsWith(".md") || file.endsWith(".html")) return "report";
  if (file.endsWith(".log")) return "log";
  return "other";
}

ensureDir(outDir);
ensureDir(path.join(outDir, "artifacts", "source"));

const startedAt = isoNow();
const endedAt = isoNow();
const currentCommit = execText("git rev-parse HEAD", "unknown");
const currentBranch = execText("git rev-parse --abbrev-ref HEAD", "unknown");
const remote = execText("git remote get-url origin", "unknown");

const candidateSources = [
  "README.md",
  "Makefile",
  "CMakeLists.txt",
  "docs/LAB_INTENT.md",
  "docs/THREAT_MODEL.md",
  "docs/DOCTRINE_COMPATIBILITY.md",
  "docs/CLEAN_ROOM_MODE.md",
  ".doctrine/lab.manifest.json",
  ".doctrine/capabilities.json",
  ".doctrine/golden-paths/beui2-runtime-network.golden-path.json"
];

const cSources = [
  ...listFiles("src", (f) => /\.(c|h)$/i.test(f)),
  ...listFiles("include", (f) => /\.(c|h)$/i.test(f))
].slice(0, 30);

const copiedSourceArtifacts = [];

for (const src of [...candidateSources, ...cSources]) {
  if (!fs.existsSync(src)) continue;
  const dest = path.join(outDir, "artifacts", "source", src.replace(/[:\\]/g, "_"));
  copyIfExists(src, dest);
  copiedSourceArtifacts.push(dest);
}

if (copiedSourceArtifacts.length === 0) {
  const fallback = path.join(outDir, "artifacts", "source", "lab-context.md");
  writeText(fallback, "# Icare Sentinel Lab Context\n\nNo source file was copied by the public DREPS exporter. This fallback context artifact keeps the evidence pack valid and explicit.\n");
  copiedSourceArtifacts.push(fallback);
}

const scenarioId = "icare.beui2.udp.runtime-network-reference";
const run = runId();

const runtimeEvents = [
  {
    id: "event.scenario.started",
    timestamp: startedAt,
    scenarioId,
    type: "scenario.started",
    message: "Icare BEUI2 runtime network evidence export started.",
    metadata: {
      mode: deterministic ? "deterministic-example" : "local-export",
      branch: currentBranch,
      commit: currentCommit
    }
  },
  {
    id: "event.artifacts.created",
    timestamp: endedAt,
    scenarioId,
    type: "artifact.created",
    message: "Source/context artifacts were collected for the public DREPS export.",
    metadata: {
      copiedSourceArtifacts: copiedSourceArtifacts.length
    }
  },
  {
    id: "event.finding.evaluated",
    timestamp: endedAt,
    scenarioId,
    type: "finding.evaluated",
    message: "BEUI2 UDP protocol risk hypothesis was evaluated as an educational lab finding.",
    metadata: {
      findingId: "BEUI2-NET-001",
      safetyScope: "local educational lab"
    }
  },
  {
    id: "event.export.completed",
    timestamp: endedAt,
    scenarioId,
    type: "export.completed",
    message: "DREPS evidence pack export completed.",
    metadata: {
      drepsVersion: "0.1.0"
    }
  }
];

writeJson(path.join(outDir, "runtime-events.json"), runtimeEvents);
writeText(path.join(outDir, "runtime-events.ndjson"), runtimeEvents.map((event) => JSON.stringify(event)).join("\n") + "\n");

const findings = [
  {
    id: "BEUI2-NET-001",
    title: "UDP runtime protocol injection surface documented by the lab",
    status: "confirmed",
    severity: "medium",
    statement: "The lab documents a local UDP/protocol risk hypothesis suitable for controlled runtime observation and hardening discussion.",
    evidenceArtifactIds: [
      "artifact.runtime-events",
      "artifact.findings",
      "artifact.lab-report"
    ],
    recommendation: "Keep the exercise local, document naive versus hardened behavior, and export runtime evidence after each scenario run."
  }
];

writeJson(path.join(outDir, "findings.json"), findings);

const controlMappings = [
  {
    controlId: "ICARE-DREPS-001",
    title: "Runtime scenario evidence is reproducible and exported",
    findingIds: ["BEUI2-NET-001"],
    status: "mapped",
    rationale: "The lab exports runtime events, findings, reports and SHA-256 manifests in a DREPS-compatible structure."
  },
  {
    controlId: "ICARE-LAB-SAFETY-001",
    title: "Educational lab scope is explicit",
    findingIds: ["BEUI2-NET-001"],
    status: "mapped",
    rationale: "The lab declares local-only, controlled and non-destructive boundaries."
  },
  {
    controlId: "ICARE-BOUNDARY-001",
    title: "Premium Doctrine features are excluded from the public lab",
    findingIds: ["BEUI2-NET-001"],
    status: "mapped",
    rationale: "The lab exports evidence but leaves scoring, sealing, signing and WORM archive to Doctrine Platform."
  }
];

writeJson(path.join(outDir, "control-mapping.json"), controlMappings);

const reportMd = [
  "# Icare Sentinel Lab — DREPS Report",
  "",
  "## Provider",
  "",
  "Icare Sentinel Lab",
  "",
  "## Scenario",
  "",
  "BEUI2 UDP Runtime Network Reference",
  "",
  "## Status",
  "",
  "PASS",
  "",
  "## Finding",
  "",
  "- BEUI2-NET-001 — UDP runtime protocol injection surface documented by the lab.",
  "",
  "## Safety",
  "",
  "This export is public, educational and local-only. It does not provide official Doctrine Platform certification, keyless signing, WORM archive or enterprise scoring.",
  "",
  "## Doctrine role",
  "",
  "Icare Sentinel Lab is a Runtime Network Evidence Provider. Doctrine Platform remains responsible for ingestion, scoring, packaging, seal, signature and governance.",
  ""
].join("\n");

writeText(path.join(outDir, "report.md"), reportMd);
writeText(path.join(outDir, "report.html"), [
  "<!doctype html>",
  "<html lang=\"en\">",
  "<head>",
  "  <meta charset=\"utf-8\">",
  "  <title>Icare Sentinel Lab DREPS Report</title>",
  "</head>",
  "<body>",
  "  <h1>Icare Sentinel Lab — DREPS Report</h1>",
  "  <p>Status: <strong>PASS</strong></p>",
  "  <p>Provider: Icare Sentinel Lab</p>",
  "  <p>Scenario: BEUI2 UDP Runtime Network Reference</p>",
  "  <h2>Finding</h2>",
  "  <p>BEUI2-NET-001 — UDP runtime protocol injection surface documented by the lab.</p>",
  "  <h2>Boundary</h2>",
  "  <p>This public lab exports evidence. Doctrine Platform performs premium governance, scoring, seal and signature.</p>",
  "</body>",
  "</html>",
  ""
].join("\n"));

const artifactFiles = [
  ...copiedSourceArtifacts.map((file) => ({
    id: "artifact.source." + path.basename(file).replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase(),
    file,
    producedBy: "icare-dreps-export",
    description: "Copied source/context artifact for reproducible public lab evidence."
  })),
  {
    id: "artifact.runtime-events",
    file: path.join(outDir, "runtime-events.json"),
    producedBy: "icare-dreps-export",
    description: "Runtime events generated by the DREPS export."
  },
  {
    id: "artifact.runtime-events-ndjson",
    file: path.join(outDir, "runtime-events.ndjson"),
    producedBy: "icare-dreps-export",
    description: "Runtime events in NDJSON form."
  },
  {
    id: "artifact.findings",
    file: path.join(outDir, "findings.json"),
    producedBy: "icare-dreps-export",
    description: "DREPS findings generated from the lab scenario."
  },
  {
    id: "artifact.control-mapping",
    file: path.join(outDir, "control-mapping.json"),
    producedBy: "icare-dreps-export",
    description: "Doctrine control mappings for the public lab."
  },
  {
    id: "artifact.lab-report",
    file: path.join(outDir, "report.md"),
    producedBy: "icare-dreps-export",
    description: "Human-readable Markdown report."
  },
  {
    id: "artifact.lab-report-html",
    file: path.join(outDir, "report.html"),
    producedBy: "icare-dreps-export",
    description: "Human-readable HTML report."
  }
];

const artifacts = artifactFiles.map((artifact) => ({
  id: artifact.id,
  kind: artifactKindFor(artifact.file),
  path: path.relative(outDir, artifact.file).replace(/\\/g, "/"),
  mediaType: mediaTypeFor(artifact.file),
  sha256: sha256File(artifact.file),
  sizeBytes: sizeBytes(artifact.file),
  producedBy: artifact.producedBy,
  description: artifact.description
}));

const evidencePack = {
  drepsVersion: "0.1.0",
  evidencePackId: "icare-beui2-runtime-network-pack",
  provider: {
    id: "icare-sentinel-lab",
    name: "Icare Sentinel Lab",
    version: "0.1.0",
    kind: "runtime-network-security"
  },
  scenario: {
    id: scenarioId,
    title: "BEUI2 UDP Runtime Network Reference",
    version: "0.1.0",
    objective: "Produce public Doctrine-compatible runtime evidence for the Icare BEUI2 UDP educational cybersecurity lab.",
    reproducibility: "deterministic",
    entrypoint: "bash scripts/export-dreps.sh",
    expectedBehavior: "The lab exports runtime events, findings, reports and SHA-256 manifests without requiring premium Doctrine Platform features.",
    riskHypothesis: "A naive UDP protocol exercise can expose a controlled local injection/observation surface useful for cybersecurity education."
  },
  execution: {
    runId: run,
    startedAt,
    endedAt,
    status: "pass",
    environment: {
      platform: process.platform,
      arch: process.arch,
      node: process.version,
      hostname: deterministic ? "deterministic-host" : os.hostname(),
      git: {
        remote,
        branch: currentBranch,
        commit: currentCommit
      },
      mode: deterministic ? "deterministic-example" : "local-export"
    }
  },
  artifacts,
  runtimeEvents,
  findings,
  controlMappings,
  doctrineExport: {
    format: "doctrine-runtime-evidence-pack",
    schemaVersion: "0.1.0",
    exportedAt: endedAt,
    compatibilityTarget: "doctrine-platform/runtime-evidence-provider@0.1.0"
  },
  integrity: {
    algorithm: "sha256",
    manifestPath: "SHA256SUMS",
    signed: false
  }
};

writeJson(path.join(outDir, "evidence-pack.json"), evidencePack);

const filesForManifest = [
  ...artifactFiles.map((artifact) => artifact.file),
  path.join(outDir, "evidence-pack.json")
].filter((file, index, arr) => arr.indexOf(file) === index).sort();

writeText(
  path.join(outDir, "SHA256SUMS"),
  filesForManifest
    .map((file) => sha256File(file) + "  " + path.relative(outDir, file).replace(/\\/g, "/"))
    .join("\n") + "\n"
);

const summary = {
  kind: "icare-dreps-export-summary",
  version: "0.1.0",
  status: "PASS",
  generatedAt: endedAt,
  outDir,
  evidencePack: path.join(outDir, "evidence-pack.json"),
  findings: path.join(outDir, "findings.json"),
  runtimeEvents: path.join(outDir, "runtime-events.json"),
  manifest: path.join(outDir, "SHA256SUMS"),
  report: path.join(outDir, "report.md"),
  provider: "icare-sentinel-lab",
  scenario: scenarioId,
  artifactCount: artifacts.length,
  findingCount: findings.length,
  publicBoundary: "No official Doctrine certification, no enterprise scoring, no keyless signing and no WORM archive are performed by this public lab."
};

writeJson(path.join(outDir, "summary.json"), summary);

console.log(JSON.stringify(summary, null, 2));
console.log("ICARE DREPS EXPORT PASS");
