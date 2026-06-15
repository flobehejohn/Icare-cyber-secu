# DREPS Export

This repository can export a Doctrine Runtime Evidence Pack.

## Local command

```bash
bash scripts/export-dreps.sh
```

## Deterministic example

```bash
node scripts/dreps/export-dreps.mjs --out examples/dreps --deterministic
node scripts/dreps/validate-dreps.mjs examples/dreps/evidence-pack.json
```

## Output

The export creates:

- evidence-pack.json
- runtime-events.json
- runtime-events.ndjson
- findings.json
- control-mapping.json
- report.md
- report.html
- SHA256SUMS
- summary.json

## Doctrine Platform flow

```text
Icare Sentinel Lab
  -> evidence-pack.json
  -> Doctrine Platform ingestion
  -> reporting
  -> indexes
  -> lab dashboard
  -> audit pack
  -> seal/signature/WORM
```
