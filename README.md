# AgentPerms

AgentPerms is a small `agent.permissions.yaml` schema, validator, and evaluator for AI-agent permissions.

It defines what an agent may:

- call as tools
- read and write as files
- use as models
- spend per run
- expose to external destinations

## Install

```bash
corepack pnpm install
corepack pnpm build
node dist/cli.js --help
```

## CLI

```bash
node dist/cli.js init
node dist/cli.js validate agent.permissions.yaml
node dist/cli.js eval agent.permissions.yaml --tool github.pull_request.comment
node dist/cli.js eval agent.permissions.yaml --file .env --file-mode read
```

Blocked evaluations exit with code `2`, which makes the CLI useful in CI and runtime wrappers.

## Scope

AgentPerms is a manifest and policy evaluation layer. It does not enforce anything by itself. Pair it with MCPGuard, BrowserGuard, AgentPassport, or another runtime that actually blocks unsafe actions.

## Verification

```bash
corepack pnpm install
corepack pnpm format:check
corepack pnpm check
npm pack --dry-run
```
