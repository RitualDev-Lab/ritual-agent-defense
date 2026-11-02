import * as vscode from "vscode";
import type { RitualMeshClient } from "../client/mesh-client.js";

export class MeshStatusItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly descriptionText?: string,
    public readonly icon?: string,
    public readonly children?: MeshStatusItem[],
  ) {
    super(label, collapsibleState);
    if (descriptionText) {
      this.description = descriptionText;
    }
    if (icon) {
      this.iconPath = new vscode.ThemeIcon(icon);
    }
  }
}

export class MeshStatusTreeProvider implements vscode.TreeDataProvider<MeshStatusItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<MeshStatusItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly meshClient: RitualMeshClient) {}

  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  public getTreeItem(element: MeshStatusItem): vscode.TreeItem {
    return element;
  }

  public async getChildren(element?: MeshStatusItem): Promise<MeshStatusItem[]> {
    if (element) {
      return element.children || [];
    }

    // Root nodes
    const agentStatus = this.meshClient.getAgentShieldStatus();
    const dbStatus = await this.meshClient.getDBShieldStatus();
    const prismMetrics = this.meshClient.getSkillPrismMetrics();

    // 1. AgentShield Node
    const agentNode = new MeshStatusItem(
      "AgentShield Kernel Sandbox",
      vscode.TreeItemCollapsibleState.Expanded,
      agentStatus.active ? "ACTIVE" : "OFFLINE",
      "shield",
      [
        new MeshStatusItem(
          "Sandbox Profile",
          vscode.TreeItemCollapsibleState.None,
          agentStatus.engine,
          "gear",
        ),
        new MeshStatusItem(
          "Active Micro-Jails",
          vscode.TreeItemCollapsibleState.None,
          `${agentStatus.activeMicroJails} isolates running`,
          "layers",
        ),
        new MeshStatusItem(
          "Blocked Syscalls",
          vscode.TreeItemCollapsibleState.None,
          `${agentStatus.blockedSyscalls} blocked in flight`,
          "stop",
        ),
        new MeshStatusItem(
          "Egress CIDR Firewall",
          vscode.TreeItemCollapsibleState.None,
          "Enforcing (Metadata & C2 blocked)",
          "lock",
        ),
      ],
    );

    // 2. DBShield Node
    const dbNode = new MeshStatusItem(
      "DBShield Guardrail & Proxy",
      vscode.TreeItemCollapsibleState.Expanded,
      dbStatus.connected ? `CONNECTED (${dbStatus.safetyTier})` : "OFFLINE",
      "database",
      [
        new MeshStatusItem(
          "Dialect & Wire Proxy",
          vscode.TreeItemCollapsibleState.None,
          `PostgreSQL wire protocol (:5433)`,
          "server",
        ),
        new MeshStatusItem(
          "Safety Tier",
          vscode.TreeItemCollapsibleState.None,
          dbStatus.safetyTier,
          "verified",
        ),
        new MeshStatusItem(
          "Virtual Schema Masking",
          vscode.TreeItemCollapsibleState.None,
          "ENABLED (credentials, admin_* hidden)",
          "eye-closed",
        ),
        new MeshStatusItem(
          "Dynamic PII Redactions",
          vscode.TreeItemCollapsibleState.None,
          `${dbStatus.piiRedactions} literals masked`,
          "check",
        ),
      ],
    );

    // 3. SkillPrism Node
    const prismNode = new MeshStatusItem(
      "SkillPrism Context Optimizer",
      vscode.TreeItemCollapsibleState.Expanded,
      `${prismMetrics.compressionRatio.toFixed(0)}% Reduction`,
      "zap",
      [
        new MeshStatusItem(
          "Tokens Saved",
          vscode.TreeItemCollapsibleState.None,
          `${prismMetrics.tokensSaved.toLocaleString()} tokens`,
          "graph-line",
        ),
        new MeshStatusItem(
          "Est. Dollar Savings",
          vscode.TreeItemCollapsibleState.None,
          `$${prismMetrics.estimatedDollarsSaved.toFixed(2)} USD`,
          "symbol-numeric",
        ),
        new MeshStatusItem(
          "Federation Cache",
          vscode.TreeItemCollapsibleState.None,
          "Connected (Shared Multi-Agent)",
          "cloud",
        ),
      ],
    );

    // 4. WebSecAuditor Node
    const auditorNode = new MeshStatusItem(
      "WebSecAuditor CI/CD Gate",
      vscode.TreeItemCollapsibleState.Collapsed,
      "READY",
      "pass",
      [
        new MeshStatusItem(
          "Inter-File AST Taint Tracking",
          vscode.TreeItemCollapsibleState.None,
          "Cross-module data flow active",
          "git-commit",
        ),
        new MeshStatusItem(
          "AI Secret Scanning",
          vscode.TreeItemCollapsibleState.None,
          "Live verification active (OpenAI, Gemini, Anthropic)",
          "key",
        ),
      ],
    );

    return [agentNode, dbNode, prismNode, auditorNode];
  }
}
