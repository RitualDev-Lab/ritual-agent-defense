import * as vscode from "vscode";
import {
  generateRedactedMask,
  scanTextForSecrets,
} from "./secret-patterns.js";

export * from "./secret-patterns.js";

export class SecretDiagnosticsManager {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private statusBarItem: vscode.StatusBarItem;
  private totalLeakCount = 0;

  constructor(context: vscode.ExtensionContext) {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection("agentshield");
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 102);
    this.statusBarItem.command = "ritual.agentshield.showStatusMenu";
    this.updateStatusBar(0);
    this.statusBarItem.show();

    context.subscriptions.push(this.diagnosticCollection, this.statusBarItem);

    if (vscode.window.activeTextEditor) {
      this.scanDocument(vscode.window.activeTextEditor.document);
    }

    context.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument((event) => this.scanDocument(event.document)),
      vscode.workspace.onDidOpenTextDocument((doc) => this.scanDocument(doc)),
      vscode.workspace.onDidCloseTextDocument((doc) => this.diagnosticCollection.delete(doc.uri)),
    );

    // Register 1-Click Redact Quick-Fix Provider
    context.subscriptions.push(
      vscode.languages.registerCodeActionsProvider(
        { scheme: "file" },
        new SecretRedactionActionProvider(),
        { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] },
      ),
    );
  }

  public scanDocument(document: vscode.TextDocument): number {
    if (document.uri.scheme !== "file" && document.uri.scheme !== "untitled") {
      return 0;
    }

    const text = document.getText();
    const matches = scanTextForSecrets(text);
    const diagnostics: vscode.Diagnostic[] = [];

    for (const match of matches) {
      const startPos = document.positionAt(match.start);
      const endPos = document.positionAt(match.end);
      const range = new vscode.Range(startPos, endPos);

      const diagnostic = new vscode.Diagnostic(
        range,
        `[AgentShield Zero-Leak Guard] Unmasked ${match.name} detected. Avoid committing or passing raw credentials to AI coding agents.`,
        vscode.DiagnosticSeverity.Warning,
      );
      diagnostic.source = "AgentShield";
      diagnostic.code = match.id;
      diagnostics.push(diagnostic);
    }

    this.diagnosticCollection.set(document.uri, diagnostics);
    this.updateStatusBar(diagnostics.length);
    return diagnostics.length;
  }

  public updateStatusBar(count: number): void {
    this.totalLeakCount = count;
    if (count === 0) {
      this.statusBarItem.text = "$(shield) AgentShield: Guarded";
      this.statusBarItem.tooltip = "AgentShield: Zero-leak secret defense active. Workspace safe.";
      this.statusBarItem.backgroundColor = undefined;
    } else {
      this.statusBarItem.text = `$(alert) AgentShield: ${count} Leaks!`;
      this.statusBarItem.tooltip = `AgentShield: Detected ${count} unredacted secret(s)! Click to review findings.`;
      this.statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground");
    }
  }

  public getLeakCount(): number {
    return this.totalLeakCount;
  }

  public dispose(): void {
    this.diagnosticCollection.clear();
    this.diagnosticCollection.dispose();
    this.statusBarItem.dispose();
  }
}

export class SecretRedactionActionProvider implements vscode.CodeActionProvider {
  provideCodeActions(
    document: vscode.TextDocument,
    _range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source === "AgentShield") {
        const action = new vscode.CodeAction(
          "🛡️ Redact Secret with AgentShield",
          vscode.CodeActionKind.QuickFix,
        );
        action.isPreferred = true;
        action.diagnostics = [diagnostic];
        const edit = new vscode.WorkspaceEdit();
        const mask = generateRedactedMask(String(diagnostic.code || "SECRET"));
        edit.replace(document.uri, diagnostic.range, mask);
        action.edit = edit;
        actions.push(action);
      }
    }

    return actions;
  }
}
