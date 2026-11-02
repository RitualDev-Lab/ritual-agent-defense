import * as vscode from "vscode";
import type { RitualMeshClient } from "./client/mesh-client.js";

export class RitualStatusBarController {
  private itemAgentShield: vscode.StatusBarItem;
  private itemDBShield: vscode.StatusBarItem;
  private itemSkillPrism: vscode.StatusBarItem;

  constructor(context: vscode.ExtensionContext) {
    // 1. AgentShield Kernel Sandbox Status
    this.itemAgentShield = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100,
    );
    this.itemAgentShield.name = "AgentShield Sandbox Status";
    this.itemAgentShield.command = "ritual.refreshAll";

    // 2. DBShield Wire Proxy & Guardrail Status
    this.itemDBShield = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      99,
    );
    this.itemDBShield.name = "DBShield Guardrail Status";
    this.itemDBShield.command = "ritual.openDashboard";

    // 3. SkillPrism Context & Token Savings
    this.itemSkillPrism = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      98,
    );
    this.itemSkillPrism.name = "SkillPrism Token Savings";
    this.itemSkillPrism.command = "workbench.view.extension.ritual-mesh";

    context.subscriptions.push(
      this.itemAgentShield,
      this.itemDBShield,
      this.itemSkillPrism,
    );

    this.itemAgentShield.show();
    this.itemDBShield.show();
    this.itemSkillPrism.show();
  }

  public async update(client: RitualMeshClient): Promise<void> {
    // 1. AgentShield Status
    const agentStatus = client.getAgentShieldStatus();
    const sandboxEngineName = agentStatus.engine.split(" ")[0];
    this.itemAgentShield.text = `$(shield) AgentShield: ${sandboxEngineName}`;
    this.itemAgentShield.tooltip = new vscode.MarkdownString(
      `### 🛡️ AgentShield Kernel Sandbox\n` +
        `- **Engine**: \`${agentStatus.engine}\`\n` +
        `- **Active Micro-Jails**: \`${agentStatus.activeMicroJails}\`\n` +
        `- **Blocked Syscalls**: \`${agentStatus.blockedSyscalls}\`\n` +
        `- **Egress CIDR Violations**: \`${agentStatus.egressViolations}\`\n` +
        `\n*Click to refresh telemetry*`,
    );

    // 2. DBShield Status
    const dbStatus = await client.getDBShieldStatus();
    if (dbStatus.connected) {
      const pendingText =
        dbStatus.pendingApprovals > 0 ? ` (${dbStatus.pendingApprovals} Pending)` : "";
      this.itemDBShield.text = `$(database) DBShield: ${dbStatus.safetyTier}${pendingText}`;
      this.itemDBShield.backgroundColor =
        dbStatus.pendingApprovals > 0
          ? new vscode.ThemeColor("statusBarItem.warningBackground")
          : undefined;

      this.itemDBShield.tooltip = new vscode.MarkdownString(
        `### 🗄️ DBShield Wire Proxy\n` +
          `- **Status**: \`CONNECTED\` (Dialect: \`${dbStatus.dialect}\`)\n` +
          `- **Safety Tier**: \`${dbStatus.safetyTier}\`\n` +
          `- **Pending Approvals**: \`${dbStatus.pendingApprovals}\`\n` +
          `- **Blocked Destructive Queries**: \`${dbStatus.blockedQueries}\`\n` +
          `- **PII Redactions**: \`${dbStatus.piiRedactions}\`\n` +
          `\n*Click to open Web Approval Dashboard*`,
      );
    } else {
      this.itemDBShield.text = `$(database) DBShield: Offline`;
      this.itemDBShield.backgroundColor = undefined;
      this.itemDBShield.tooltip = "DBShield wire proxy is offline on localhost:3100";
    }

    // 3. SkillPrism Token Savings
    const prismMetrics = client.getSkillPrismMetrics();
    const savedK = (prismMetrics.tokensSaved / 1000).toFixed(1);
    this.itemSkillPrism.text = `$(zap) Saved: ${savedK}k (${prismMetrics.compressionRatio.toFixed(0)}%)`;
    this.itemSkillPrism.tooltip = new vscode.MarkdownString(
      `### ⚡ SkillPrism Context & Token Savings\n` +
        `- **Tokens Compressed**: \`${prismMetrics.tokensSaved.toLocaleString()}\` tokens saved\n` +
        `- **Reduction Ratio**: \`${prismMetrics.compressionRatio.toFixed(1)}%\`\n` +
        `- **Total Agent Queries**: \`${prismMetrics.totalQueries}\`\n` +
        `- **Est. LLM Cost Savings**: \`$${prismMetrics.estimatedDollarsSaved.toFixed(2)}\`\n` +
        `\n*Click to view Visual Token Graph in Side Panel*`,
    );
  }

  public dispose(): void {
    this.itemAgentShield.dispose();
    this.itemDBShield.dispose();
    this.itemSkillPrism.dispose();
  }
}
