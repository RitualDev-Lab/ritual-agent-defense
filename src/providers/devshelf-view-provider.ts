import * as vscode from "vscode";
import type { RitualMeshClient } from "../client/mesh-client.js";
import type { DevShelfTool } from "../types.js";

export class DevShelfViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "ritual.devshelfView";
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
        case "installMcp": {
          const tool = message.tool as DevShelfTool;
          await vscode.commands.executeCommand("ritual.configureMcp", tool);
          break;
        }

        case "openDevShelfWeb": {
          vscode.env.openExternal(
            vscode.Uri.parse("https://github.com/RitualDev-Lab/DevShelf"),
          );
          break;
        }

        case "runPlayground": {
          const toolName = message.toolName;
          const query = message.query;
          vscode.window.showInformationMessage(
            `🚀 [DevShelf Playground] Simulated response from ${toolName} for '${query}': {"status": "SUCCESS", "simulatedLatencyMs": 42}`,
          );
          break;
        }
      }
    });

    this.render();
  }

  public render(): void {
    if (!this.view) return;
    const tools = this.meshClient.getDevShelfCatalog();
    this.view.webview.html = this.renderHtml(tools);
  }

  private renderHtml(tools: DevShelfTool[]): string {
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
    .search-box {
      width: 100%;
      padding: 6px 10px;
      border-radius: 4px;
      background: var(--code-bg);
      border: 1px solid var(--card-border);
      color: var(--text);
      font-size: 12px;
      margin-bottom: 12px;
      box-sizing: border-box;
    }
    .categories {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .tag {
      background: rgba(139, 92, 246, 0.15);
      color: var(--accent);
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }
    .tool-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
    }
    .tool-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .tool-title {
      font-size: 12px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .badge-verified {
      background: rgba(16, 185, 129, 0.15);
      color: var(--success);
      font-size: 9px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 4px;
    }
    .tool-desc {
      font-size: 11px;
      color: var(--text-muted);
      margin-bottom: 10px;
      line-height: 1.4;
    }
    .tool-meta {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: var(--text-muted);
      margin-bottom: 10px;
    }
    .actions {
      display: flex;
      gap: 6px;
    }
    button {
      flex: 1;
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: opacity 0.15s;
    }
    button:hover { opacity: 0.85; }
    .btn-install {
      background: var(--accent);
      color: white;
    }
    .btn-try {
      background: var(--code-bg);
      border: 1px solid var(--card-border);
      color: var(--text);
    }
  </style>
</head>
<body>
  <input type="text" id="searchInput" class="search-box" placeholder="Search 500+ MCP tools & APIs..." oninput="filterTools()">
  
  <div class="categories">
    <span class="tag" onclick="filterCategory('')">All</span>
    <span class="tag" onclick="filterCategory('Security')">Security</span>
    <span class="tag" onclick="filterCategory('Databases')">Databases</span>
    <span class="tag" onclick="filterCategory('DevTools')">DevTools</span>
    <span class="tag" onclick="filterCategory('AI & Search')">AI & Search</span>
  </div>

  <div id="toolsList">
    ${tools
      .map(
        (tool) => `
      <div class="tool-card" data-name="${tool.name.toLowerCase()}" data-cat="${tool.category}">
        <div class="tool-header">
          <div class="tool-title">
            <span>${tool.name}</span>
            ${tool.verified ? '<span class="badge-verified">✓ CI Verified</span>' : ""}
          </div>
          <span style="font-size: 10px; color: var(--text-muted);">★ ${tool.stars}</span>
        </div>
        <div class="tool-desc">${tool.description}</div>
        <div class="tool-meta">
          <span>By ${tool.author}</span>
          <span>Uptime: ${tool.uptime}</span>
        </div>
        <div class="actions">
          <button class="btn-install" onclick='installMcp(${JSON.stringify(tool)})'>⚡ Add to Cursor/Claude</button>
          <button class="btn-try" onclick="tryPlayground('${tool.name}')">▶ Playground</button>
        </div>
      </div>
    `,
      )
      .join("")}
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    function installMcp(tool) {
      vscode.postMessage({ type: 'installMcp', tool });
    }

    function tryPlayground(toolName) {
      const query = prompt('Enter a test argument or sample query for ' + toolName + ':', 'SELECT count(*) FROM users;');
      if (query) {
        vscode.postMessage({ type: 'runPlayground', toolName, query });
      }
    }

    function filterTools() {
      const q = document.getElementById('searchInput').value.toLowerCase();
      const cards = document.querySelectorAll('.tool-card');
      cards.forEach(card => {
        const name = card.getAttribute('data-name');
        card.style.display = name.includes(q) ? 'block' : 'none';
      });
    }

    function filterCategory(cat) {
      const cards = document.querySelectorAll('.tool-card');
      cards.forEach(card => {
        if (!cat || card.getAttribute('data-cat') === cat) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    }
  </script>
</body>
</html>`;
  }
}
