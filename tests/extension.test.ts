import assert from "node:assert";
import test from "node:test";
import { RitualMeshClient } from "../src/client/mesh-client.js";

test("RitualMeshClient - Reports accurate OS-specific AgentShield sandbox profile", () => {
  const client = new RitualMeshClient();
  const status = client.getAgentShieldStatus();

  assert.strictEqual(status.active, true);
  assert.ok(status.engine.includes("Seatbelt") || status.engine.includes("bwrap") || status.engine.includes("AppContainer"));
  assert.strictEqual(status.activeMicroJails > 0, true);
  assert.strictEqual(status.blockedSyscalls > 0, true);
  assert.strictEqual(status.egressViolations > 0, true);
});

test("RitualMeshClient - SkillPrism telemetry computes token compaction and cost savings", () => {
  const client = new RitualMeshClient();
  const metrics = client.getSkillPrismMetrics();

  assert.strictEqual(metrics.totalQueries > 0, true);
  assert.strictEqual(metrics.originalTokens > metrics.compactedTokens, true);
  assert.strictEqual(metrics.tokensSaved, metrics.originalTokens - metrics.compactedTokens);
  assert.strictEqual(metrics.compressionRatio > 50, true);
  assert.strictEqual(metrics.estimatedDollarsSaved > 0, true);
  assert.strictEqual(metrics.history.length > 0, true);
});

test("RitualMeshClient - DevShelf catalog returns verified tools with valid MCP configurations", () => {
  const client = new RitualMeshClient();
  const tools = client.getDevShelfCatalog();

  assert.strictEqual(tools.length >= 5, true);

  const dbshieldTool = tools.find((t) => t.id === "dbshield");
  assert.ok(dbshieldTool);
  assert.strictEqual(dbshieldTool.verified, true);
  assert.strictEqual(dbshieldTool.mcpConfig.command, "npx");
  assert.ok(dbshieldTool.mcpConfig.args.includes("@ritualdev-lab/dbshield"));

  const agentshieldTool = tools.find((t) => t.id === "agentshield");
  assert.ok(agentshieldTool);
  assert.strictEqual(agentshieldTool.category, "Security");

  const skillprismTool = tools.find((t) => t.id === "skillprism");
  assert.ok(skillprismTool);
  assert.strictEqual(skillprismTool.category, "AI & Search");
});

test("RitualMeshClient - Approval actions for AgentShield commands", async () => {
  const client = new RitualMeshClient();
  // Simulate mock AgentShield command requiring approval
  (client as any).mockAgentApprovals = [
    {
      id: "cmd_test_42",
      commandOrQuery: "rm -rf /tmp/build",
      operation: "SHELL_EXEC",
      riskLevel: "CRITICAL",
      riskScore: 92,
      origin: "AgentShield",
      status: "PENDING",
      targetTables: [],
      piiRedacted: false,
    },
  ];

  const approvals = await client.getApprovals();
  const target = approvals.find((a) => a.id === "cmd_test_42");
  assert.ok(target);
  assert.strictEqual(target.status, "PENDING");

  // Approve action
  const approved = await client.approve("cmd_test_42");
  assert.strictEqual(approved, true);

  const updatedApprovals = await client.getApprovals();
  assert.strictEqual(updatedApprovals.find((a) => a.id === "cmd_test_42")?.status, "APPROVED");
});
