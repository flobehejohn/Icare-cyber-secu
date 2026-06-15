#!/usr/bin/env node
import fs from "node:fs";

function fail(message) {
  console.error("[ERROR] " + message);
  process.exit(1);
}

function ensure(condition, message) {
  if (!condition) fail(message);
}

function readJson(file) {
  ensure(fs.existsSync(file), "Missing file: " + file);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

const manifest = readJson(".doctrine/lab.manifest.json");
const capabilities = readJson(".doctrine/capabilities.json");

ensure(manifest.visibility === "public", "manifest.visibility must be public");
ensure(manifest.scope?.educational === true, "manifest.scope.educational must be true");
ensure(manifest.scope?.productionTarget === false, "manifest.scope.productionTarget must be false");
ensure(manifest.scope?.premiumFeatures === false, "manifest.scope.premiumFeatures must be false");

const publicCaps = manifest.publicCapabilities || {};
const communityCaps = capabilities.capabilities || {};

for (const [key, expected] of Object.entries({
  premiumScoring: false,
  officialDoctrineCertification: false,
  keylessSigning: false,
  wormArchive: false,
  enterpriseDashboard: false
})) {
  ensure(publicCaps[key] === expected, "manifest.publicCapabilities." + key + " must be false");
}

for (const [key, expected] of Object.entries({
  technicalDebtProfiler: false,
  enterpriseScoring: false,
  officialDoctrineSeal: false,
  keylessSigning: false,
  wormArchive: false,
  multiLabDashboard: false
})) {
  ensure(communityCaps[key] === expected, "capabilities." + key + " must be false");
}

ensure(communityCaps.exportDreps === true, "capabilities.exportDreps must be true");
ensure(communityCaps.validateDreps === true, "capabilities.validateDreps must be true");
ensure(communityCaps.generateLocalReport === true, "capabilities.generateLocalReport must be true");
ensure(communityCaps.generateSha256Manifest === true, "capabilities.generateSha256Manifest must be true");

console.log(JSON.stringify({
  kind: "icare-public-boundary-check",
  status: "PASS",
  labId: manifest.labId,
  mode: capabilities.mode,
  publicProvider: true,
  premiumFeaturesExcluded: true
}, null, 2));

console.log("ICARE PUBLIC BOUNDARY PASS");
