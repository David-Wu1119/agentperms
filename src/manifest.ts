import fs from "node:fs/promises";
import YAML from "yaml";
import type {
  AgentPermissionsManifest,
  PermissionDecision,
  PermissionRequest,
  ValidationResult,
} from "./types.js";

export async function loadManifest(
  file: string,
): Promise<AgentPermissionsManifest> {
  const raw = await fs.readFile(file, "utf8");
  const parsed = file.endsWith(".json") ? JSON.parse(raw) : YAML.parse(raw);
  return parsed as AgentPermissionsManifest;
}

export function validateManifest(
  manifest: AgentPermissionsManifest,
): ValidationResult {
  const errors: string[] = [];
  if (!isRecord(manifest))
    return { valid: false, errors: ["manifest must be an object"] };
  if (manifest.version !== "0.1") errors.push('version must be "0.1"');
  if (!isRecord(manifest.agent)) {
    errors.push("agent is required");
  } else {
    requireString(manifest.agent.name, "agent.name", errors);
    requireString(manifest.agent.owner, "agent.owner", errors);
    requireString(manifest.agent.purpose, "agent.purpose", errors);
    if (
      !["low", "medium", "high", "critical"].includes(
        String(manifest.agent.risk_tier),
      )
    ) {
      errors.push("agent.risk_tier must be low, medium, high, or critical");
    }
  }

  validateStringList(manifest.tools?.allow, "tools.allow", errors);
  validateStringList(manifest.tools?.deny, "tools.deny", errors);
  validateStringList(
    manifest.tools?.require_approval,
    "tools.require_approval",
    errors,
  );
  validateStringList(manifest.files?.allow_read, "files.allow_read", errors);
  validateStringList(manifest.files?.allow_write, "files.allow_write", errors);
  validateStringList(manifest.files?.deny, "files.deny", errors);
  validateStringList(manifest.models?.allow, "models.allow", errors);
  validateStringList(manifest.models?.deny, "models.deny", errors);
  validateStringList(
    manifest.data?.allow_exfiltration_to,
    "data.allow_exfiltration_to",
    errors,
  );
  validateStringList(
    manifest.data?.deny_exfiltration_to,
    "data.deny_exfiltration_to",
    errors,
  );
  validateNonNegativeNumber(
    manifest.budgets?.max_cost_usd_per_run,
    "budgets.max_cost_usd_per_run",
    errors,
  );
  validateNonNegativeNumber(
    manifest.budgets?.max_tool_calls_per_run,
    "budgets.max_tool_calls_per_run",
    errors,
  );

  return { valid: errors.length === 0, errors };
}

export function evaluateRequest(
  manifest: AgentPermissionsManifest,
  request: PermissionRequest,
): PermissionDecision {
  const validation = validateManifest(manifest);
  if (!validation.valid)
    return {
      action: "block",
      reasons: validation.errors.map((error) => `invalid_manifest:${error}`),
    };

  const reasons: string[] = [];
  let requiresApproval = false;

  if (request.tool) {
    if (matchesAny(request.tool, manifest.tools?.deny))
      reasons.push(`tool_denied:${request.tool}`);
    if (!matchesAny(request.tool, manifest.tools?.allow))
      reasons.push(`tool_not_allowed:${request.tool}`);
    if (matchesAny(request.tool, manifest.tools?.require_approval))
      requiresApproval = true;
  }

  if (request.file) {
    if (matchesAny(request.file, manifest.files?.deny))
      reasons.push(`file_denied:${request.file}`);
    const allowed =
      request.fileMode === "write"
        ? manifest.files?.allow_write
        : manifest.files?.allow_read;
    if (!matchesAny(request.file, allowed))
      reasons.push(
        `file_not_allowed:${request.fileMode ?? "read"}:${request.file}`,
      );
  }

  if (request.model) {
    if (matchesAny(request.model, manifest.models?.deny))
      reasons.push(`model_denied:${request.model}`);
    if (!matchesAny(request.model, manifest.models?.allow))
      reasons.push(`model_not_allowed:${request.model}`);
  }

  if (
    request.estimatedCostUsd !== undefined &&
    manifest.budgets?.max_cost_usd_per_run !== undefined
  ) {
    if (request.estimatedCostUsd > manifest.budgets.max_cost_usd_per_run) {
      reasons.push(`cost_exceeds_budget:${request.estimatedCostUsd}`);
    }
  }

  if (request.exfiltrationTarget) {
    if (
      matchesAny(
        request.exfiltrationTarget,
        manifest.data?.deny_exfiltration_to,
      )
    ) {
      reasons.push(`exfiltration_target_denied:${request.exfiltrationTarget}`);
    }
    if (
      !matchesAny(
        request.exfiltrationTarget,
        manifest.data?.allow_exfiltration_to,
      )
    ) {
      reasons.push(
        `exfiltration_target_not_allowed:${request.exfiltrationTarget}`,
      );
    }
  }

  if (reasons.length) return { action: "block", reasons };
  if (requiresApproval)
    return {
      action: "requires_approval",
      reasons: ["human_approval_required"],
    };
  return { action: "allow", reasons: ["all_constraints_satisfied"] };
}

export function exampleManifest(): AgentPermissionsManifest {
  return {
    version: "0.1",
    agent: {
      name: "code-review-agent",
      owner: "security@example.com",
      purpose: "Review pull requests and leave comments",
      risk_tier: "medium",
    },
    tools: {
      allow: [
        "github.pull_request.read",
        "github.pull_request.comment",
        "github.pull_request.merge",
        "filesystem.read",
      ],
      deny: ["github.repo.delete", "shell.exec"],
      require_approval: ["github.pull_request.merge"],
    },
    files: {
      allow_read: ["src/**", "tests/**", "package.json"],
      allow_write: ["reports/**"],
      deny: [".env", ".env.*", "**/.ssh/**", "**/.aws/**"],
    },
    models: {
      allow: ["gpt-4o", "claude-*"],
      deny: ["experimental-*"],
    },
    budgets: {
      max_cost_usd_per_run: 5,
      max_tool_calls_per_run: 50,
    },
    data: {
      allow_exfiltration_to: ["github.com/David-Wu1119/*"],
      deny_exfiltration_to: ["pastebin.com", "webhook.site"],
      redact_secrets: true,
    },
  };
}

function requireString(value: unknown, field: string, errors: string[]): void {
  if (typeof value !== "string" || !value.trim())
    errors.push(`${field} must be a non-empty string`);
}

function validateStringList(
  value: unknown,
  field: string,
  errors: string[],
): void {
  if (value === undefined) return;
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "string" || !item.trim())
  ) {
    errors.push(`${field} must be a list of non-empty strings`);
  }
}

function validateNonNegativeNumber(
  value: unknown,
  field: string,
  errors: string[],
): void {
  if (value === undefined) return;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    errors.push(`${field} must be a non-negative number`);
  }
}

function matchesAny(value: string, patterns: string[] | undefined): boolean {
  if (!patterns?.length) return false;
  return patterns.some((pattern) => matchesPattern(value, pattern));
}

function matchesPattern(value: string, pattern: string): boolean {
  if (pattern === value || pattern === "*") return true;
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`).test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
