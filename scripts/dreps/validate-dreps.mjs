#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const evidencePackPath = process.argv[2] || "examples/dreps/evidence-pack.json";
const root = path.dirname(evidencePackPath);

function fail(message) {
  console.error("[ERROR] " + message);
  process.exit(1);
}

function ensure(condition, message) {
  if (!condition) fail(message);
}

function sha256File(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

ensure(fs.existsSync(evidencePackPath), "Missing evidence pack: " + evidencePackPath);

const pack = JSON.parse(fs.readFileSync(evidencePackPath, "utf8"));

for (const key of [
  "drepsVersion",
  "evidencePackId",
  "provider",
  "scenario",
  "execution",
  "artifacts",
  "runtimeEvents",
  "findings",
  "controlMappings",
  "doctrineExport",
  "integrity"
]) {
  ensure(Object.prototype.hasOwnProperty.call(pack, key), "Missing required key: " + key);
}

ensure(pack.drepsVersion === "0.1.0", "drepsVersion must be 0.1.0");
ensure(pack.provider.id === "icare-sentinel-lab", "provider.id must be icare-sentinel-lab");
ensure(pack.provider.kind === "runtime-network-security", "provider.kind must be runtime-network-security");
ensure(pack.execution.status === "pass", "execution.status must be pass");
ensure(Array.isArray(pack.artifacts) && pack.artifacts.length >= 1, "artifacts must not be empty");
ensure(Array.isArray(pack.runtimeEvents) && pack.runtimeEvents.length >= 1, "runtimeEvents must not be empty");
ensure(pack.doctrineExport.format === "doctrine-runtime-evidence-pack", "Invalid doctrineExport.format");
ensure(pack.integrity.algorithm === "sha256", "integrity.algorithm must be sha256");
ensure(pack.integrity.signed === false, "public lab must not claim signed integrity");

const artifactIds = new Set();

for (const artifact of pack.artifacts) {
  ensure(artifact.id && artifact.id.length >= 3, "artifact.id is invalid");
  ensure(artifact.path, "artifact.path is required for " + artifact.id);
  ensure(/^[a-fA-F0-9]{64}$/.test(artifact.sha256), "artifact.sha256 invalid for " + artifact.id);
  const artifactPath = path.join(root, artifact.path);
  ensure(fs.existsSync(artifactPath), "artifact file missing: " + artifact.path);
  ensure(sha256File(artifactPath) === artifact.sha256, "artifact sha256 mismatch: " + artifact.path);
  artifactIds.add(artifact.id);
}

for (const event of pack.runtimeEvents) {
  ensure(event.id, "runtime event id missing");
  ensure(event.timestamp, "runtime event timestamp missing");
  ensure(event.scenarioId === pack.scenario.id, "runtime event scenarioId mismatch");
}

for (const finding of pack.findings) {
  ensure(finding.id, "finding id missing");
  ensure(["confirmed", "invalidated", "not_observed", "inconclusive"].includes(finding.status), "invalid finding status: " + finding.id);
  ensure(["info", "low", "medium", "high", "critical"].includes(finding.severity), "invalid finding severity: " + finding.id);
  ensure(Array.isArray(finding.evidenceArtifactIds) && finding.evidenceArtifactIds.length >= 1, "finding evidenceArtifactIds missing: " + finding.id);
  for (const artifactId of finding.evidenceArtifactIds) {
    ensure(artifactIds.has(artifactId), "finding references unknown artifact: " + artifactId);
  }
}

const manifestPath = path.join(root, pack.integrity.manifestPath);
ensure(fs.existsSync(manifestPath), "Missing integrity manifest: " + pack.integrity.manifestPath);

console.log(JSON.stringify({
  kind: "icare-dreps-validation",
  status: "PASS",
  evidencePack: evidencePackPath,
  provider: pack.provider.id,
  scenario: pack.scenario.id,
  artifactCount: pack.artifacts.length,
  findingCount: pack.findings.length
}, null, 2));

console.log("ICARE DREPS VALIDATION PASS");
