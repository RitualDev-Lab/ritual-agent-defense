import * as vscode from "vscode";
import { PolyRunner } from "./poly-runner.js";
import type {
  DependencyInfo,
  DiagnosticCheckItem,
  SystemHealthReport,
  WorkspaceMemberInfo,
} from "./poly-types.js";

export class PolyTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly member?: WorkspaceMemberInfo,
    public readonly dependency?: DependencyInfo,
  ) {
    super(label, collapsibleState);

    if (member) {
      this.contextValue = "workspaceMember";
      this.tooltip = `Ecosystem: ${member.ecosystem.toUpperCase()} | Path: ${member.relativeDir}`;
      this.description = member.ecosystem;

      switch (member.ecosystem) {
        case "npm":
          this.iconPath = new vscode.ThemeIcon(
            "symbol-class",
            new vscode.ThemeColor("terminal.ansiCyan"),
          );
          break;
        case "pypi":
          this.iconPath = new vscode.ThemeIcon(
            "symbol-method",
            new vscode.ThemeColor("terminal.ansiGreen"),
          );
          break;
        case "cargo":
          this.iconPath = new vscode.ThemeIcon(
            "package",
            new vscode.ThemeColor("terminal.ansiYellow"),
          );
          break;
        case "go":
          this.iconPath = new vscode.ThemeIcon(
            "file-code",
            new vscode.ThemeColor("terminal.ansiBlue"),
          );
          break;
      }
    } else if (dependency) {
      this.contextValue = "dependency";
      this.description = dependency.version;
      this.tooltip = `${dependency.name} (${dependency.version}) [${dependency.ecosystem}]`;

      if (dependency.hasVulnerability) {
        this.iconPath = new vscode.ThemeIcon("alert", new vscode.ThemeColor("errorForeground"));
        this.tooltip = `⚠️ Vulnerable dependency: ${dependency.name}`;
      } else {
        this.iconPath = new vscode.ThemeIcon("symbol-variable");
      }
    }
  }
}

export class PolyWorkspaceProvider implements vscode.TreeDataProvider<PolyTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<PolyTreeItem | undefined | null | void> =
    new vscode.EventEmitter<PolyTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<PolyTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private members: WorkspaceMemberInfo[] = [];

  constructor(private workspaceRoot: string | undefined) {
    this.refresh();
  }

  refresh(): void {
    if (this.workspaceRoot) {
      this.members = PolyRunner.discoverWorkspace(this.workspaceRoot);
    } else {
      this.members = [];
    }
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: PolyTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: PolyTreeItem): Thenable<PolyTreeItem[]> {
    if (!this.workspaceRoot) {
      return Promise.resolve([]);
    }

    if (!element) {
      if (this.members.length === 0) {
        return Promise.resolve([
          new PolyTreeItem("No Poly members detected", vscode.TreeItemCollapsibleState.None),
        ]);
      }
      return Promise.resolve(
        this.members.map(
          (m) =>
            new PolyTreeItem(
              m.name,
              m.dependencies.length > 0
                ? vscode.TreeItemCollapsibleState.Collapsed
                : vscode.TreeItemCollapsibleState.None,
              m,
            ),
        ),
      );
    }

    if (element.member) {
      return Promise.resolve(
        element.member.dependencies.map(
          (d) =>
            new PolyTreeItem(
              d.name,
              vscode.TreeItemCollapsibleState.None,
              undefined,
              d,
            ),
        ),
      );
    }

    return Promise.resolve([]);
  }
}

export class HealthTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly item?: DiagnosticCheckItem,
  ) {
    super(label, collapsibleState);

    if (item) {
      this.contextValue = "healthCheck";
      this.description =
        item.version || (item.latencyMs ? `${item.latencyMs}ms` : item.message || "OK");
      this.tooltip = `${item.name}: ${this.description}`;

      if (item.status === "ok") {
        this.iconPath = new vscode.ThemeIcon("check", new vscode.ThemeColor("terminal.ansiGreen"));
      } else if (item.status === "warn") {
        this.iconPath = new vscode.ThemeIcon(
          "warning",
          new vscode.ThemeColor("terminal.ansiYellow"),
        );
      } else {
        this.iconPath = new vscode.ThemeIcon("error", new vscode.ThemeColor("errorForeground"));
      }
    }
  }
}

export class PolyHealthProvider implements vscode.TreeDataProvider<HealthTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<HealthTreeItem | undefined | null | void> =
    new vscode.EventEmitter<HealthTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<HealthTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private report: SystemHealthReport | undefined;

  constructor(private workspaceRoot: string | undefined) {
    this.refresh();
  }

  async refresh(): Promise<void> {
    if (this.workspaceRoot) {
      try {
        this.report = await PolyRunner.getDoctorReport(this.workspaceRoot);
      } catch {
        this.report = undefined;
      }
    }
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: HealthTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: HealthTreeItem): Thenable<HealthTreeItem[]> {
    if (!this.workspaceRoot || !this.report) {
      return Promise.resolve([
        new HealthTreeItem("Diagnostics: Standby", vscode.TreeItemCollapsibleState.None),
      ]);
    }

    if (!element) {
      const items: HealthTreeItem[] = [
        new HealthTreeItem(this.report.node.name, vscode.TreeItemCollapsibleState.None, this.report.node),
        new HealthTreeItem(this.report.python.name, vscode.TreeItemCollapsibleState.None, this.report.python),
        new HealthTreeItem(this.report.rust.name, vscode.TreeItemCollapsibleState.None, this.report.rust),
        new HealthTreeItem(this.report.go.name, vscode.TreeItemCollapsibleState.None, this.report.go),
        new HealthTreeItem(this.report.nativeCompiler.name, vscode.TreeItemCollapsibleState.None, this.report.nativeCompiler),
        new HealthTreeItem("Registries Latency", vscode.TreeItemCollapsibleState.Collapsed),
        new HealthTreeItem(this.report.lockfileIntegrity.name, vscode.TreeItemCollapsibleState.None, this.report.lockfileIntegrity),
      ];
      return Promise.resolve(items);
    }

    if (element.label === "Registries Latency") {
      return Promise.resolve(
        this.report.registries.map(
          (r) => new HealthTreeItem(r.name, vscode.TreeItemCollapsibleState.None, r),
        ),
      );
    }

    return Promise.resolve([]);
  }
}
