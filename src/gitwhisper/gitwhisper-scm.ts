import * as vscode from "vscode";
import {
  generateConventionalCommitVariants,
  validateCommitQuality,
} from "./commit-generator.js";

interface GitExtensionAPI {
  repositories: Array<{
    rootUri: vscode.Uri;
    inputBox: { value: string };
    state: {
      indexChanges: Array<{ uri: vscode.Uri }>;
      workingTreeChanges: Array<{ uri: vscode.Uri }>;
    };
  }>;
}

export class GitWhisperScmManager {
  private statusBarItem: vscode.StatusBarItem;

  constructor(context: vscode.ExtensionContext) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      10,
    );
    this.statusBarItem.name = "GitWhisper Status";
    this.statusBarItem.text = "$(shield) GitWhisper: Local-Only";
    this.statusBarItem.tooltip =
      "GitWhisper — AI Conventional Commit Intelligence\nPrivacy: Local-Only / Redacted\nClick to generate commit message";
    this.statusBarItem.command = "ritual.gitwhisper.generateCommit";
    this.statusBarItem.show();

    context.subscriptions.push(this.statusBarItem);
  }

  private getGitApi(): GitExtensionAPI | undefined {
    const gitExt = vscode.extensions.getExtension("vscode.git");
    if (!gitExt) return undefined;
    return gitExt.exports?.getAPI ? gitExt.exports.getAPI(1) : undefined;
  }

  public async generateCommitMessage(sourceControlUri?: vscode.Uri): Promise<void> {
    const gitApi = this.getGitApi();
    let targetRepo = gitApi?.repositories?.[0];

    if (sourceControlUri && gitApi) {
      const match = gitApi.repositories.find(
        (r) => r.rootUri.fsPath === sourceControlUri.fsPath,
      );
      if (match) targetRepo = match;
    }

    const stagedFiles: string[] = [];
    if (targetRepo) {
      for (const change of targetRepo.state.indexChanges) {
        stagedFiles.push(vscode.workspace.asRelativePath(change.uri));
      }
    }

    if (stagedFiles.length === 0) {
      vscode.window.showWarningMessage(
        "GitWhisper: No staged changes found. Please stage files using 'git add' or the SCM panel (+).",
      );
      return;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "GitWhisper: Generating conventional commit proposals...",
        cancellable: false,
      },
      async () => {
        const result = generateConventionalCommitVariants(stagedFiles);

        this.statusBarItem.text = `$(shield) GitWhisper: ${result.privacy.badge.replace(/[\[\]]/g, "")}`;

        const items = result.variants.map((v) => ({
          label: v.subject,
          description: v.scope ? `[${v.scope}]` : undefined,
          detail: v.body,
          variant: v,
        }));

        const selected = await vscode.window.showQuickPick(items, {
          title: "GitWhisper — Select Conventional Commit Variant",
          placeHolder: "Choose a commit message variant to insert into SCM input box",
        });

        if (selected) {
          const fullMessage = selected.variant.body
            ? `${selected.variant.subject}\n\n${selected.variant.body}`
            : selected.variant.subject;

          if (targetRepo) {
            targetRepo.inputBox.value = fullMessage;
            vscode.commands.executeCommand("workbench.view.scm");
          } else {
            await vscode.env.clipboard.writeText(fullMessage);
            vscode.window.showInformationMessage(
              "GitWhisper: Copied generated commit message to clipboard!",
            );
          }
        }
      },
    );
  }

  public checkQuality(): void {
    const gitApi = this.getGitApi();
    const repo = gitApi?.repositories?.[0];
    const message = repo?.inputBox.value;

    if (!message || message.trim().length === 0) {
      vscode.window.showInformationMessage(
        "GitWhisper: Commit input box is empty. Write or generate a message first.",
      );
      return;
    }

    const check = validateCommitQuality(message);
    if (check.valid) {
      vscode.window.showInformationMessage(
        `✅ GitWhisper: Commit quality score is 100/100! Fully conforms to Conventional Commits.`,
      );
    } else {
      vscode.window.showWarningMessage(
        `⚠️ GitWhisper: Commit quality score is ${check.score}/100.\nIssues:\n- ${check.issues.join("\n- ")}`,
      );
    }
  }

  public dispose(): void {
    this.statusBarItem.dispose();
  }
}
