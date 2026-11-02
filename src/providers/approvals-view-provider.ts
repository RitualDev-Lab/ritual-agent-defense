import * as vscode from "vscode";
import type { RitualMeshClient } from "../client/mesh-client.js";
import type { ApprovalItem } from "../types.js";

export class ApprovalsViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "ritual.approvalsView";
  private view?: vscode.WebviewView;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly meshClient: RitualMeshClient,
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case "approve": {
          const success = await this.meshClient.approve(message.id);
          if (success) {
            vscode.window.showInformationMessage(
              `✅ [Ritual Agent Defense] Approved mutation: ${message.id}`,
            );
          } else {
            vscode.window.showErrorMessage(
              `❌ Failed to approve mutation: ${message.id}`,
            );
          }
          this.refresh();
          break;
        }

        case "reject": {
          const success = await this.meshClient.reject(message.id, message.reason);
          if (success) {
            vscode.window.showWarningMessage(
              `🛑 [Ritual Agent Defense] Rejected mutation: ${message.id}`,
            );
          } else {
            vscode.window.showErrorMessage(
              `❌ Failed to reject mutation: ${message.id}`,
            );
          }
          this.refresh();
          break;
        }

        case "openDashboard": {
          vscode.commands.executeCommand("ritual.openDashboard");
          break;
        }

        case "refresh": {
          this.refresh();
          break;
        }
      }
    });

    this.refresh();
  }

  public async refresh(): Promise<void> {
    if (!this.view) return;
    const approvals = await this.meshClient.getApprovals();
    this.view.webview.html = this.renderHtml(approvals);
  }

  private renderHtml(approvals: ApprovalItem[]): string {
    const pending = approvals.filter((a) => a.status === "PENDING");
    const decided = approvals.filter((a) => a.status !== "PENDING").slice(0, 5);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root {
      --bg: var(--vscode-editor-background);
      --card-bg: var(--vscode-sideBar-background);
      --card-border: var(--vscode-widget-border, #2d3748);
      --text: var(--vscode-editor-foreground);
      --text-muted: var(--vscode-descriptionForeground, #a0aec0);
      --critical: #ef4444;
      --warning: #f59e0b;
      --success: #10b981;
      --accent: #8b5cf6;
      --code-bg: var(--vscode-textCodeBlock-background, #1a202c);
    }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--text);
      background: var(--bg);
      margin: 0;
      padding: 12px;
      box-sizing: border-box;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--card-border);
    }
    .header h3 {
      margin: 0;
      font-size: 13px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .badge-count {
      background: rgba(245, 158, 11, 0.2);
      color: var(--warning);
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 700;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
    }
    .card.pending {
      border-left: 4px solid var(--warning);
    }
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .origin-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(139, 92, 246, 0.2);
      color: var(--accent);
    }
    .risk-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .risk-CRITICAL { background: rgba(239, 68, 68, 0.2); color: var(--critical); }
    .risk-CAUTION { background: rgba(245, 158, 11, 0.2); color: var(--warning); }
    .risk-SAFE { background: rgba(16, 185, 129, 0.2); color: var(--success); }
    
    .code-preview {
      background: var(--code-bg);
      border-radius: 6px;
      padding: 8px 10px;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 11px;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-all;
      margin-bottom: 10px;
      color: #e2e8f0;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .meta-line {
      font-size: 11px;
      color: var(--text-muted);
      margin-bottom: 10px;
    }
    .actions {
      display: flex;
      gap: 8px;
    }
    button {
      flex: 1;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: opacity 0.15s;
    }
    button:hover { opacity: 0.85; }
    .btn-approve {
      background: var(--success);
      color: white;
    }
    .btn-reject {
      background: var(--critical);
      color: white;
    }
    .empty-state {
      text-align: center;
      padding: 24px 12px;
      color: var(--text-muted);
      font-size: 12px;
      border: 1px dashed var(--card-border);
      border-radius: 8px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h3>🛡️ Pending Approvals <span class="badge-count">${pending.length}</span></h3>
    <button onclick="refresh()" style="flex: 0; background: none; color: var(--text-muted); font-size: 12px; padding: 2px;">↻</button>
  </div>

  ${
    pending.length === 0
      ? `<div class="empty-state">
          No pending mutations or destructive commands awaiting approval. Agents are operating safely within sandbox boundaries.
        </div>`
      : pending
          .map(
            (item) => `
      <div class="card pending">
        <div class="card-top">
          <span class="origin-badge">${item.origin} · ${item.operation}</span>
          <span class="risk-badge risk-${item.riskLevel}">Risk: ${item.riskScore}/100</span>
        </div>
        <div class="code-preview">${escapeHtml(item.commandOrQuery)}</div>
        <div class="meta-line">
          Target: <strong>${(item.targetTables || []).join(", ") || "Filesystem/OS"}</strong><br>
          Agent: ${item.agentId || "Agent-Runtime"} · ${new Date(item.timestamp).toLocaleTimeString()}
        </div>
        <div class="actions">
          <button class="btn-approve" onclick="approve('${item.id}')">✓ 1-Click Approve</button>
          <button class="btn-reject" onclick="reject('${item.id}')">✕ Reject</button>
        </div>
      </div>
    `,
          )
          .join("")
  }

  ${
    decided.length > 0
      ? `
    <div style="margin-top: 20px; font-size: 11px; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Recent Decisions</div>
    <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 6px;">
      ${decided
        .map(
          (d) => `
        <div style="font-size: 11px; display: flex; justify-content: space-between; padding: 6px; background: var(--card-bg); border-radius: 4px;">
          <span>${d.id} (${d.operation})</span>
          <span style="font-weight: 700; color: ${d.status === "APPROVED" ? "var(--success)" : "var(--critical)"}">${d.status}</span>
        </div>
      `,
        )
        .join("")}
    </div>
  `
      : ""
  }

  <script>
    const vscode = acquireVsCodeApi();

    function approve(id) {
      vscode.postMessage({ type: 'approve', id });
    }

    function reject(id) {
      vscode.postMessage({ type: 'reject', id });
    }

    function refresh() {
      vscode.postMessage({ type: 'refresh' });
    }
  </script>
</body>
</html>`;
  }
}

function escapeHtml(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
