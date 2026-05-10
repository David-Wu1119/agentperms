#!/usr/bin/env node
import fs from "node:fs/promises";
import { Command } from "commander";
import pc from "picocolors";
import YAML from "yaml";
import {
  evaluateRequest,
  exampleManifest,
  loadManifest,
  validateManifest,
} from "./index.js";

type ValidateOptions = {
  json?: boolean;
};

type EvalOptions = {
  tool?: string;
  file?: string;
  fileMode?: "read" | "write";
  model?: string;
  cost?: string;
  exfiltrationTarget?: string;
  json?: boolean;
};

async function main(): Promise<void> {
  const program = new Command()
    .name("agentperms")
    .description("Validate and evaluate AI-agent permission manifests.")
    .version("0.1.0");

  program
    .command("init")
    .description("Write an example agent.permissions.yaml manifest.")
    .argument("[path]", "Manifest path.", "agent.permissions.yaml")
    .action(async (target: string) => {
      await fs.writeFile(target, YAML.stringify(exampleManifest()), "utf8");
      console.log(pc.green("Wrote AgentPerms manifest"));
      console.log(target);
    });

  program
    .command("validate")
    .description("Validate an agent.permissions.yaml or JSON manifest.")
    .argument("[path]", "Manifest path.", "agent.permissions.yaml")
    .option("--json", "Print JSON result.", false)
    .action(async (target: string, options: ValidateOptions) => {
      const manifest = await loadManifest(target);
      const result = validateManifest(manifest);
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else if (result.valid) {
        console.log(pc.green("AgentPerms manifest valid"));
      } else {
        console.log(pc.red("AgentPerms manifest invalid"));
        for (const error of result.errors) console.log(`- ${error}`);
      }
      if (!result.valid) process.exitCode = 1;
    });

  program
    .command("eval")
    .description("Evaluate one permission request against a manifest.")
    .argument("[path]", "Manifest path.", "agent.permissions.yaml")
    .option("--tool <name>", "Tool name or scope.")
    .option("--file <path>", "File path.")
    .option("--file-mode <mode>", "read or write.", "read")
    .option("--model <name>", "Model name.")
    .option("--cost <usd>", "Estimated cost in USD.")
    .option(
      "--exfiltration-target <target>",
      "Destination for data leaving the runtime.",
    )
    .option("--json", "Print JSON result.", false)
    .action(async (target: string, options: EvalOptions) => {
      if (options.fileMode !== "read" && options.fileMode !== "write")
        throw new Error("--file-mode must be read or write.");
      const cost =
        options.cost === undefined
          ? undefined
          : Number.parseFloat(options.cost);
      if (cost !== undefined && (!Number.isFinite(cost) || cost < 0))
        throw new Error("--cost must be a non-negative number.");
      const decision = evaluateRequest(await loadManifest(target), {
        tool: options.tool,
        file: options.file,
        fileMode: options.fileMode,
        model: options.model,
        estimatedCostUsd: cost,
        exfiltrationTarget: options.exfiltrationTarget,
      });

      if (options.json) {
        console.log(JSON.stringify(decision, null, 2));
      } else {
        const color =
          decision.action === "allow"
            ? pc.green
            : decision.action === "block"
              ? pc.red
              : pc.yellow;
        console.log(color(`Decision: ${decision.action}`));
        for (const reason of decision.reasons) console.log(`- ${reason}`);
      }
      if (decision.action === "block") process.exitCode = 2;
    });

  await program.parseAsync(process.argv);
}

main().catch((error: unknown) => {
  console.error(pc.red(error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
});
