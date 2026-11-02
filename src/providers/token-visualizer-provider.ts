import * as vscode from "vscode";
import type { RitualMeshClient } from "../client/mesh-client.js";
import type { SkillPrismMetrics } from "../types.js";

export class TokenVisualizerProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "ritual.tokenVisualizerView";
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

    webviewView.webview.onDidReceiveMessage((message) => {
      if (message.type === "refresh") {
        this.render();
      }
    });

    this.render();
  }

  public render(): void {
    if (!this.view) return;
    const metrics = this.meshClient.getSkillPrismMetrics();
    this.view.webview.html = this.renderHtml(metrics);
  }

  private renderHtml(m: SkillPrismMetrics): string {
    const savedK = (m.tokensSaved / 1000).toFixed(1);
    const origK = (m.originalTokens / 1000).toFixed(1);
    const compK = (m.compactedTokens / 1000).toFixed(1);

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
      --accent: #8b5cf6;
      --success: #10b981;
      --warning: #f59e0b;
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
    .kpi-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 16px;
    }
    .kpi-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 10px;
    }
    .kpi-label {
      font-size: 10px;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .kpi-val {
      font-size: 18px;
      font-weight: 800;
    }
    .progress-bar-container {
      background: var(--code-bg);
      border-radius: 6px;
      height: 12px;
      overflow: hidden;
      margin-bottom: 6px;
      display: flex;
    }
    .progress-compacted {
      background: var(--accent);
      height: 100%;
    }
    .progress-saved {
      background: var(--success);
      height: 100%;
    }
    .legend {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: var(--text-muted);
      margin-bottom: 16px;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--text-muted);
      margin-bottom: 8px;
    }
    .history-row {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 6px;
      padding: 8px;
      margin-bottom: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
    }
    .tool-chip {
      font-family: monospace;
      font-weight: 600;
      color: var(--accent);
    }
  </style>
</head>
<body>
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Tokens Saved</div>
      <div class="kpi-val" style="color: var(--success);">${savedK}k</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Compaction Ratio</div>
      <div class="kpi-val" style="color: var(--accent);">${m.compressionRatio.toFixed(1)}%</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Est. Cost Saved</div>
      <div class="kpi-val" style="color: var(--warning);">$${m.estimatedDollarsSaved.toFixed(2)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Queries Optimized</div>
      <div class="kpi-val">${m.totalQueries}</div>
    </div>
  </div>

  <div class="section-title">Context Window Payload Ratio</div>
  <div class="progress-bar-container">
    <div class="progress-compacted" style="width: ${(100 - m.compressionRatio).toFixed(1)}%;"></div>
    <div class="progress-saved" style="width: ${m.compressionRatio.toFixed(1)}%;"></div>
  </div>
  <div class="legend">
    <div class="legend-item"><div class="dot" style="background: var(--accent);"></div>Sent to LLM (${compK}k)</div>
    <div class="legend-item"><div class="dot" style="background: var(--success);"></div>Trimmed (${savedK}k of ${origK}k)</div>
  </div>

  <div class="section-title">Recent Invocations & Token Savings</div>
  <div>
    ${m.history
      .map((h) => {
        const saved = h.original - h.compacted;
        const pct = Math.round((saved / h.original) * 100);
        return `
        <div class="history-row">
          <div>
            <span class="tool-chip">${h.toolName}</span><br>
            <span style="font-size: 10px; color: var(--text-muted);">${h.timestamp} · Raw: ${h.original.toLocaleString()}</span>
          </div>
          <div style="text-align: right;">
            <span style="color: var(--success); font-weight: 700;">-${pct}%</span><br>
            <span style="font-size: 10px; color: var(--text-muted);">${h.compacted.toLocaleString()} tokens</span>
          </div>
        </div>
      `;
      })
      .join("")}
  </div>
</body>
</html>`;
  }
}
