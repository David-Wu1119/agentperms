# Security

AgentPerms v0.1 validates and evaluates local agent permission manifests.

## Protected In v0.1

- Catches malformed permission manifests.
- Evaluates tool, file, model, cost, and exfiltration requests.
- Returns explicit allow, block, or requires-approval decisions.
- Uses nonzero exit codes for invalid manifests and blocked requests.

## Not Protected In v0.1

- Runtime enforcement.
- Identity proofing.
- Secret redaction.
- Cloud IAM or browser permission control.
- Complete path sandboxing.

Use AgentPerms as a policy input to an enforcing runtime. A manifest alone is documentation, not security.
