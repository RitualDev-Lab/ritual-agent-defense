import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import * as vscode from "vscode";
import type { DevShelfTool } from "../types.js";

export async function configureMcpServer(tool: DevShelfTool): Promise<void> {
  const options = [
    "Cursor IDE (.cursor/mcp.json in Workspace)",
    "Claude Desktop (claude_desktop_config.json)",
    "Global User Cursor (~/.cursor/mcp.json)",
  ];

  const selection = await vscode.window.showQuickPick(options, {
    placeHolder: `Select target IDE to register '${tool.name}' MCP server:`,
  });

  if (!selection) return;

  let targetPath = "";

  if (selection.startsWith("Cursor IDE (.cursor/mcp.json in Workspace)")) {
    const wsFolders = vscode.workspace.workspaceFolders;
    if (!wsFolders || wsFolders.length === 0) {
      vscode.window.showErrorMessage(
        "No open workspace folder found. Open a workspace folder or choose Global User Cursor.",
      );
      return;
    }
    targetPath = path.join(wsFolders[0].uri.fsPath, ".cursor", "mcp.json");
  } else if (selection.startsWith("Global User Cursor")) {
    targetPath = path.join(os.homedir(), ".cursor", "mcp.json");
  } else {
    // Claude Desktop configuration
    const isMac = process.platform === "darwin";
    const isWin = process.platform === "win32";

    if (isMac) {
      targetPath = path.join(
        os.homedir(),
        "Library",
        "Application Support",
        "Claude",
        "claude_desktop_config.json",
      );
    } else if (isWin) {
      targetPath = path.join(
        process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"),
        "Claude",
        "claude_desktop_config.json",
      );
    } else {
      targetPath = path.join(os.homedir(), ".config", "Claude", "claude_desktop_config.json");
    }
  }

  try {
    await fs.mkdir(path.dirname(targetPath), { recursive: true });

    let existingConfig: { mcpServers?: Record<string, unknown> } = { mcpServers: {} };

    try {
      const raw = await fs.readFile(targetPath, "utf8");
      existingConfig = JSON.parse(raw);
      if (!existingConfig.mcpServers) {
        existingConfig.mcpServers = {};
      }
    } catch {
      // New file creation
      existingConfig = { mcpServers: {} };
    }

    // Add or update the server configuration
    existingConfig.mcpServers![tool.id] = tool.mcpConfig;

    await fs.writeFile(targetPath, JSON.stringify(existingConfig, null, 2), "utf8");

    const action = await vscode.window.showInformationMessage(
      `🎉 Successfully added '${tool.name}' to ${path.basename(targetPath)}!`,
      "Open Config File",
    );

    if (action === "Open Config File") {
      const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(targetPath));
      await vscode.window.showTextDocument(doc);
    }
  } catch (err) {
    vscode.window.showErrorMessage(
      `Failed to update MCP configuration: ${(err as Error).message}`,
    );
  }
}
