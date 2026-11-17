import * as vscode from "vscode";
import { RitualMeshClient } from "./client/mesh-client.js";
import { configureMcpServer } from "./commands/mcp-config-commands.js";
import { SecretDiagnosticsManager } from "./dlp/secret-detector.js";
import { GitWhisperScmManager } from "./gitwhisper/gitwhisper-scm.js";
import { PolyRunner } from "./poly/poly-runner.js";
import {
  PolyHealthProvider,
  PolyWorkspaceProvider,
} from "./poly/poly-tree-providers.js";
import { ApprovalsViewProvider } from "./providers/approvals-view-provider.js";
import { DevShelfViewProvider } from "./providers/devshelf-view-provider.js";
import { MeshStatusTreeProvider } from "./providers/mesh-status-tree-provider.js";
import { TokenVisualizerProvider } from "./providers/token-visualizer-provider.js";
import { SandboxController } from "./sandbox/sandbox-controller.js";
import { RitualStatusBarController } from "./status-bar.js";
import type { DevShelfTool } from "./types.js";

let refreshTimer: NodeJS.Timeout | undefined;

export function activate(context: vscode.ExtensionContext): void {
  const config = vscode.workspace.getConfiguration("ritual");
  const dbshieldUrl = config.get<string>("dbshieldUrl") || "http://localhost:3100";
  const refreshInterval = config.get<number>("autoRefreshIntervalMs") || 3000;
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  // 1. Initialize client
  const meshClient = new RitualMeshClient(dbshieldUrl);

  // 2. Initialize Status Bar & Subsystems
  const statusBar = new RitualStatusBarController(context);
  const dlpManager = new SecretDiagnosticsManager(context);
  const sandboxController = new SandboxController(context);
  const gitWhisperManager = new GitWhisperScmManager(context);

  // 3. Initialize Side Panel & Tree Providers
  const approvalsProvider = new ApprovalsViewProvider(context.extensionUri, meshClient);
  const tokenVisualizerProvider = new TokenVisualizerProvider(context.extensionUri, meshClient);
  const devshelfProvider = new DevShelfViewProvider(context.extensionUri, meshClient);
  const meshStatusProvider = new MeshStatusTreeProvider(meshClient);
  const polyWorkspaceProvider = new PolyWorkspaceProvider(workspaceRoot);
  const polyHealthProvider = new PolyHealthProvider(workspaceRoot);

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
    vscode.window.registerTreeDataProvider(
      "ritual.polyWorkspaceView",
      polyWorkspaceProvider,
    ),
    vscode.window.registerTreeDataProvider(
      "ritual.polyHealthView",
      polyHealthProvider,
    ),
  );

  // 4. Register Commands
  const refreshAll = async () => {
    await statusBar.update(meshClient);
    approvalsProvider.refresh();
    tokenVisualizerProvider.render();
    devshelfProvider.render();
    meshStatusProvider.refresh();
    polyWorkspaceProvider.refresh();
    await polyHealthProvider.refresh();
  };

  const registerCommandWithAlias = (
    primary: string,
    alias: string,
    handler: (...args: any[]) => any,
  ) => {
    context.subscriptions.push(
      vscode.commands.registerCommand(primary, handler),
      vscode.commands.registerCommand(alias, handler),
    );
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

  // AgentShield Zero-Leak DLP & Sandbox Commands
  registerCommandWithAlias(
    "ritual.agentshield.scanActiveFile",
    "agentshield.scanActiveFile",
    () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage("AgentShield: No active file to scan.");
        return;
      }
      const count = dlpManager.scanDocument(editor.document);
      if (count === 0) {
        vscode.window.showInformationMessage("🛡️ AgentShield: No credential leaks found in active file.");
      } else {
        vscode.window.showWarningMessage(`⚠️ AgentShield: Intercepted ${count} unmasked secret(s) in this file!`);
      }
    },
  );

  registerCommandWithAlias(
    "ritual.agentshield.auditWorkspace",
    "agentshield.auditWorkspace",
    () => {
      const terminal = vscode.window.createTerminal("AgentShield Audit");
      terminal.show();
      terminal.sendText("npx @ritualdev-lab/agentshield ci --enforce");
    },
  );

  registerCommandWithAlias(
    "ritual.agentshield.switchSandboxProfile",
    "agentshield.switchSandboxProfile",
    () => sandboxController.promptSwitchProfile(),
  );

  registerCommandWithAlias(
    "ritual.agentshield.showStatusMenu",
    "agentshield.showStatusMenu",
    async () => {
      const leaks = dlpManager.getLeakCount();
      const selection = await vscode.window.showQuickPick(
        [
          { label: "$(shield) Scan Active File", detail: "Check current file for unmasked credentials" },
          { label: "$(search) Audit Entire Workspace", detail: "Scan all workspace files with AgentShield CLI" },
          { label: "$(lock) Switch Sandbox Profile", detail: `Current: ${sandboxController.getProfile()}` },
          { label: "$(verified) View Trust Center & SIG Lite", detail: "Inspect SOC 2 Type II and DPDP compliance" },
        ],
        { placeHolder: `AgentShield Defense Status: ${leaks === 0 ? "Guarded (Zero Leaks)" : `${leaks} Leaks Detected`}` },
      );
      if (selection) {
        if (selection.label.includes("Scan Active File")) {
          vscode.commands.executeCommand("ritual.agentshield.scanActiveFile");
        } else if (selection.label.includes("Audit Entire Workspace")) {
          vscode.commands.executeCommand("ritual.agentshield.auditWorkspace");
        } else if (selection.label.includes("Switch Sandbox Profile")) {
          vscode.commands.executeCommand("ritual.agentshield.switchSandboxProfile");
        } else if (selection.label.includes("Trust Center")) {
          vscode.env.openExternal(vscode.Uri.parse("https://ritualdev.in/trust"));
        }
      }
    },
  );

  // Poly Monorepo Commands
  registerCommandWithAlias("ritual.poly.refresh", "poly.refresh", () => {
    polyWorkspaceProvider.refresh();
    polyHealthProvider.refresh();
    vscode.window.showInformationMessage("Poly: Workspace and health state refreshed.");
  });

  registerCommandWithAlias("ritual.poly.install", "poly.install", () => {
    PolyRunner.runInTerminal(["install"]);
  });

  registerCommandWithAlias("ritual.poly.audit", "poly.audit", () => {
    PolyRunner.runInTerminal(["audit"]);
  });

  registerCommandWithAlias("ritual.poly.fix", "poly.fix", () => {
    PolyRunner.runInTerminal(["fix"]);
  });

  registerCommandWithAlias("ritual.poly.doctor", "poly.doctor", () => {
    PolyRunner.runInTerminal(["doctor"]);
  });

  registerCommandWithAlias("ritual.poly.graph", "poly.graph", () => {
    PolyRunner.runInTerminal(["graph"]);
  });

  registerCommandWithAlias("ritual.poly.cacheStatus", "poly.cacheStatus", () => {
    PolyRunner.runInTerminal(["cache", "status"]);
  });

  registerCommandWithAlias("ritual.poly.cachePurge", "poly.cachePurge", () => {
    PolyRunner.runInTerminal(["cache", "purge"]);
  });

  registerCommandWithAlias("ritual.poly.docker", "poly.docker", async () => {
    const choice = await vscode.window.showQuickPick(
      [
        { label: "Dockerfile + docker-compose.yml", description: "Multi-stage production build", devcontainer: false },
        { label: "Dockerfile + DevContainer", description: "Multi-stage build with .devcontainer", devcontainer: true },
      ],
      { placeHolder: "Select container artifact generator options" },
    );
    if (choice) {
      if (choice.devcontainer) {
        PolyRunner.runInTerminal(["docker", "--devcontainer"]);
      } else {
        PolyRunner.runInTerminal(["docker"]);
      }
    }
  });

  registerCommandWithAlias("ritual.poly.addDependency", "poly.addDependency", async () => {
    const input = await vscode.window.showInputBox({
      title: "Poly: Add Polyglot Dependency",
      prompt: "Enter package name with ecosystem prefix (e.g. npm:zod, pypi:fastapi, cargo:tokio)",
      placeHolder: "npm:zod@latest",
    });
    if (input) {
      PolyRunner.runInTerminal(["add", input.trim()]);
    }
  });

  registerCommandWithAlias("ritual.poly.verifyLockfile", "poly.verifyLockfile", () => {
    if (!workspaceRoot) {
      vscode.window.showErrorMessage("Poly: No active workspace folder.");
      return;
    }
    const result = PolyRunner.verifyLock(workspaceRoot);
    if (result.valid) {
      vscode.window.showInformationMessage(
        `✅ Poly: Lockfile valid! ${result.membersCount} members verified (Hash: ${result.hash}).`,
      );
    } else {
      vscode.window.showErrorMessage(`❌ Poly Lockfile Error: ${result.error || "Lockfile drift detected."}`);
    }
  });

  // GitWhisper AI Conventional Commit Intelligence Commands
  registerCommandWithAlias(
    "ritual.gitwhisper.generateCommit",
    "gitwhisper.generateCommit",
    (uri?: vscode.Uri) => gitWhisperManager.generateCommitMessage(uri),
  );

  registerCommandWithAlias(
    "ritual.gitwhisper.checkQuality",
    "gitwhisper.checkQuality",
    () => gitWhisperManager.checkQuality(),
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

  console.log("🛡️ [Ritual Agent Defense] Unified flagship extension active for Cursor, VS Code, and Windsurf.");
}

export function deactivate(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = undefined;
  }
}
