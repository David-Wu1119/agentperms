import { describe, expect, it } from "vitest";
import {
  evaluateRequest,
  loadManifest,
  validateManifest,
} from "../src/index.js";

describe("AgentPerms manifest", () => {
  it("validates and evaluates a permission manifest", async () => {
    const manifest = await loadManifest(
      "tests/fixtures/agent.permissions.yaml",
    );
    expect(validateManifest(manifest)).toEqual({ valid: true, errors: [] });

    expect(
      evaluateRequest(manifest, { tool: "github.pull_request.comment" }),
    ).toEqual({
      action: "allow",
      reasons: ["all_constraints_satisfied"],
    });

    expect(
      evaluateRequest(manifest, { tool: "github.pull_request.merge" }),
    ).toEqual({
      action: "requires_approval",
      reasons: ["human_approval_required"],
    });

    expect(
      evaluateRequest(manifest, { file: ".env", fileMode: "read" }),
    ).toEqual({
      action: "block",
      reasons: ["file_denied:.env", "file_not_allowed:read:.env"],
    });

    expect(evaluateRequest(manifest, { model: "claude-sonnet-4.5" })).toEqual({
      action: "allow",
      reasons: ["all_constraints_satisfied"],
    });

    expect(evaluateRequest(manifest, { estimatedCostUsd: 6 })).toEqual({
      action: "block",
      reasons: ["cost_exceeds_budget:6"],
    });
  });
});
