export type AgentPermissionsManifest = {
  version: "0.1";
  agent: {
    name: string;
    owner: string;
    purpose: string;
    risk_tier: "low" | "medium" | "high" | "critical";
  };
  tools?: {
    allow?: string[];
    deny?: string[];
    require_approval?: string[];
  };
  files?: {
    allow_read?: string[];
    allow_write?: string[];
    deny?: string[];
  };
  models?: {
    allow?: string[];
    deny?: string[];
  };
  budgets?: {
    max_cost_usd_per_run?: number;
    max_tool_calls_per_run?: number;
  };
  data?: {
    allow_exfiltration_to?: string[];
    deny_exfiltration_to?: string[];
    redact_secrets?: boolean;
  };
};

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

export type PermissionRequest = {
  tool?: string;
  file?: string;
  fileMode?: "read" | "write";
  model?: string;
  estimatedCostUsd?: number;
  exfiltrationTarget?: string;
};

export type PermissionDecision = {
  action: "allow" | "block" | "requires_approval";
  reasons: string[];
};
