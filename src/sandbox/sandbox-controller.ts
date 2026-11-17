import * as os from "node:os";
import * as vscode from "vscode";
import {
  SANDBOX_PROFILES,
  type SandboxProfileName,
} from "./sandbox-profiles.js";

export * from "./sandbox-profiles.js";

export class SandboxController {
  private currentProfile: SandboxProfileName = "Standard";
  private sandboxStatusBarItem: vscode.StatusBarItem;
  private egressStatusBarItem: vscode.StatusBarItem;

  constructor(context: vscode.ExtensionContext) {
    this.sandboxStatusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      101,
    );
    this.sandboxStatusBarItem.command = "ritual.agentshield.switchSandboxProfile";
    this.updateSandboxStatusBar();
    this.sandboxStatusBarItem.show();

    this.egressStatusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100,
    );
    this.updateEgressStatusBar();
    this.egressStatusBarItem.show();

    context.subscriptions.push(this.sandboxStatusBarItem, this.egressStatusBarItem);
  }

  public getProfile(): SandboxProfileName {
    return this.currentProfile;
  }

  public setProfile(profile: SandboxProfileName): void {
    this.currentProfile = profile;
    this.updateSandboxStatusBar();
    this.updateEgressStatusBar();
  }

  public updateSandboxStatusBar(): void {
    const osType = os.platform();
    let label = "LowBox AppContainer";
    if (osType === "linux") label = "Bubblewrap";
    if (osType === "darwin") label = "Seatbelt";

    this.sandboxStatusBarItem.text = `$(lock) Sandbox: ${label} [${this.currentProfile}]`;
    this.sandboxStatusBarItem.tooltip = `AgentShield Kernel Sandbox: ${label} active with ${this.currentProfile} profile. Click to change.`;
  }

  public updateEgressStatusBar(): void {
    const profile = SANDBOX_PROFILES[this.currentProfile];
    this.egressStatusBarItem.text = `$(globe) Net: ${this.currentProfile === "Strict" ? "Air-Gapped" : this.currentProfile === "Standard" ? "Git Only" : "Localhost"}`;
    this.egressStatusBarItem.tooltip = `AgentShield Egress Filter: ${profile.networkEgress}. IMDS Isolation: ${profile.imdsIsolation ? "BLOCKED (169.254.169.254)" : "Allowed"}.`;
  }

  public async promptSwitchProfile(): Promise<void> {
    const selected = await vscode.window.showQuickPick(
      [
        {
          label: "$(shield) Strict (Zero Network)",
          detail: "Air-gapped filesystem jail with zero outbound network access.",
          profile: "Strict" as SandboxProfileName,
        },
        {
          label: "$(globe) Standard (Git Only)",
          detail: "Egress restricted strictly to GitHub/GitLab over Port 443/22.",
          profile: "Standard" as SandboxProfileName,
        },
        {
          label: "$(tools) Permissive (Dev/Localhost)",
          detail: "Allows localhost IPC and internal private corporate subnets.",
          profile: "Permissive" as SandboxProfileName,
        },
      ],
      { placeHolder: `Current Sandbox Profile: ${this.currentProfile}` },
    );

    if (selected) {
      this.setProfile(selected.profile);
      vscode.window.showInformationMessage(
        `🛡️ AgentShield: Activated OS Sandbox Profile: ${selected.label}`,
      );
    }
  }

  public dispose(): void {
    this.sandboxStatusBarItem.dispose();
    this.egressStatusBarItem.dispose();
  }
}
