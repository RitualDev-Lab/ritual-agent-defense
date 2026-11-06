import * as vscode from "vscode";
import { RitualMeshClient } from "./client/mesh-client.js";
import { configureMcpServer } from "./commands/mcp-config-commands.js";
import { ApprovalsViewProvider } from "./providers/approvals-view-provider.js";
import { DevShelfViewProvider } from "./providers/devshelf-view-provider.js";
import { MeshStatusTreeProvider } from "./providers/mesh-status-tree-provider.js";
import { TokenVisualizerProvider } from "./providers/token-visualizer-provider.js";
import { RitualStatusBarController } from "./status-bar.js";
import type { DevShelfTool } from "./types.js";

let refreshTimer: NodeJS.Timeout | undefined;

export function activate(context: vscode.ExtensionContext): void {
  const config = vscode.workspace.getConfiguration("ritual");
  const dbshieldUrl = config.get<string>("dbshieldUrl") || "http://localhost:3100";
  const refreshInterval = config.get<number>("autoRefreshIntervalMs") || 3000;

  // 1. Initialize client
  const meshClient = new RitualMeshClient(dbshieldUrl);

  // 2. Initialize Status Bar
  const statusBar = new RitualStatusBarController(context);

  // 3. Initialize Side Panel Providers
  const approvalsProvider = new ApprovalsViewProvider(context.extensionUri, meshClient);
  const tokenVisualizerProvider = new TokenVisualizerProvider(context.extensionUri, meshClient);
  const devshelfProvider = new DevShelfViewProvider(context.extensionUri, meshClient);
  const meshStatusProvider = new MeshStatusTreeProvider(meshClient);

  // Register Webviews and Tree Data Providers
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ApprovalsViewProvider.viewType,
      approvalsProvider,
    ),
    vscode.window.registerWebviewViewProvider(
      TokenVisualizerProvider.viewType,
      tokenVisualizerProvider,
    ),
    vscode.window.registerWebviewViewProvider(
      DevShelfViewProvider.viewType,
      devshelfProvider,
    ),
    vscode.window.registerTreeDataProvider(
      "ritual.meshStatusView",
      meshStatusProvider,
    ),
  );

  // 4. Register Commands
  const refreshAll = async () => {
    await statusBar.update(meshClient);
    approvalsProvider.refresh();
    tokenVisualizerProvider.render();
    devshelfProvider.render();
    meshStatusProvider.refresh();
  };

  context.subscriptions.push(
    vscode.commands.registerCommand("ritual.refreshAll", async () => {
      await refreshAll();
      vscode.window.showInformationMessage("🔄 [Ritual Mesh] Telemetry refreshed.");
    }),

    vscode.commands.registerCommand("ritual.openDashboard", () => {
      const targetUrl = vscode.workspace
        .getConfiguration("ritual")
        .get<string>("dbshieldUrl") || "http://localhost:3100";
      vscode.env.openExternal(vscode.Uri.parse(targetUrl));
    }),

    vscode.commands.registerCommand("ritual.approveMutation", async (id?: string) => {
      if (!id) {
        const approvals = await meshClient.getApprovals();
        const pending = approvals.filter((a) => a.status === "PENDING");
        if (pending.length === 0) {
          vscode.window.showInformationMessage("No pending mutations to approve.");
          return;
        }
        const pick = await vscode.window.showQuickPick(
          pending.map((p) => ({
            label: `${p.operation} on ${p.targetTables.join(", ") || "Filesystem"}`,
            description: p.id,
            detail: p.commandOrQuery,
            id: p.id,
          })),
        );
        if (!pick) return;
        id = pick.id;
      }

      const success = await meshClient.approve(id);
      if (success) {
        vscode.window.showInformationMessage(`✅ Approved mutation: ${id}`);
        await refreshAll();
      } else {
        vscode.window.showErrorMessage(`Failed to approve mutation: ${id}`);
      }
    }),

    vscode.commands.registerCommand("ritual.rejectMutation", async (id?: string) => {
      if (!id) {
        const approvals = await meshClient.getApprovals();
        const pending = approvals.filter((a) => a.status === "PENDING");
        if (pending.length === 0) {
          vscode.window.showInformationMessage("No pending mutations to reject.");
          return;
        }
        const pick = await vscode.window.showQuickPick(
          pending.map((p) => ({
            label: `${p.operation} on ${p.targetTables.join(", ") || "Filesystem"}`,
            description: p.id,
            detail: p.commandOrQuery,
            id: p.id,
          })),
        );
        if (!pick) return;
        id = pick.id;
      }

      const success = await meshClient.reject(id);
      if (success) {
        vscode.window.showWarningMessage(`🛑 Rejected mutation: ${id}`);
        await refreshAll();
      } else {
        vscode.window.showErrorMessage(`Failed to reject mutation: ${id}`);
      }
    }),

    vscode.commands.registerCommand("ritual.browseDevShelf", () => {
      vscode.commands.executeCommand("workbench.view.extension.ritual-mesh");
    }),

    vscode.commands.registerCommand("ritual.configureMcp", async (tool?: DevShelfTool) => {
      if (!tool) {
        const tools = meshClient.getDevShelfCatalog();
        const pick = await vscode.window.showQuickPick(
          tools.map((t) => ({
            label: t.name,
            description: `[${t.category}] ★ ${t.stars}`,
            detail: t.description,
            tool: t,
          })),
        );
        if (!pick) return;
        tool = pick.tool;
      }
      await configureMcpServer(tool);
    }),

    vscode.commands.registerCommand("ritual.dbshield.startProxy", () => {
      const term = vscode.window.createTerminal("DBShield Wire Proxy");
      term.show();
      term.sendText("npx @ritualdev-lab/dbshield proxy --port 5433");
      vscode.window.showInformationMessage("🚀 [DBShield] PostgreSQL Wire Proxy started on port 5433.");
    }),

    vscode.commands.registerCommand("ritual.dbshield.topMonitor", () => {
      const term = vscode.window.createTerminal("DBShield Top Monitor");
      term.show();
      term.sendText("npx @ritualdev-lab/dbshield top");
    }),

    vscode.commands.registerCommand("ritual.dbshield.auditWorkspace", () => {
      const term = vscode.window.createTerminal("DBShield Audit");
      term.show();
      term.sendText("npx @ritualdev-lab/dbshield audit .");
    }),

    vscode.commands.registerCommand("ritual.dbshield.openSimulator", () => {
      vscode.env.openExternal(vscode.Uri.parse("https://ritualdev.in/dbshield/#simulator"));
    }),

    vscode.commands.registerCommand("ritual.dbshield.configureMcp", async () => {
      const pick = await vscode.window.showQuickPick(
        [
          "Cursor IDE (.cursor/mcp.json in Workspace)",
          "Google Antigravity (.antigravity/mcp.json in Workspace)",
          "Claude Desktop (claude_desktop_config.json)",
        ],
        { placeHolder: "Select target IDE to configure DBShield MCP server:" },
      );
      if (!pick) return;
      const term = vscode.window.createTerminal("DBShield Configurator");
      term.show();
      if (pick.includes("Cursor")) {
        term.sendText("npx @ritualdev-lab/dbshield install-cursor");
      } else if (pick.includes("Antigravity")) {
        term.sendText("npx @ritualdev-lab/dbshield install-antigravity");
      } else {
        term.sendText("npx @ritualdev-lab/dbshield install-claude");
      }
    }),
  );

  // Initial update
  refreshAll();

  // Periodic polling for status bar & approvals
  refreshTimer = setInterval(() => {
    refreshAll().catch(() => {});
  }, refreshInterval);

  // Configuration change listener
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("ritual")) {
        const newUrl =
          vscode.workspace.getConfiguration("ritual").get<string>("dbshieldUrl") ||
          "http://localhost:3100";
        meshClient.updateConfig(newUrl);
        refreshAll();
      }
    }),
  );

  console.log("🛡️ [Ritual Agent Defense] Extension active for Cursor, VS Code, and Windsurf.");
}

export function deactivate(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = undefined;
  }
}
