# AgentPerms Manifest

The default manifest path is `agent.permissions.yaml`.

Key sections:

- `agent`: name, owner, purpose, and risk tier
- `tools`: allowed, denied, and approval-required tool scopes
- `files`: read/write allowlists and deny patterns
- `models`: allowed and denied model patterns
- `budgets`: cost and tool-call caps
- `data`: allowed and denied exfiltration destinations

Patterns support `*` wildcards.
