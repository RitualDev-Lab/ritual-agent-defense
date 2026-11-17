export type Ecosystem = "npm" | "pypi" | "cargo" | "go";

export interface DependencyInfo {
  name: string;
  version: string;
  ecosystem: Ecosystem;
  license?: string;
  hasVulnerability?: boolean;
  advisories?: string[];
}

export interface WorkspaceMemberInfo {
  name: string;
  relativeDir: string;
  fullPath: string;
  ecosystem: Ecosystem;
  manifestFile: string;
  dependencies: DependencyInfo[];
}

export interface DiagnosticCheckItem {
  name: string;
  status: "ok" | "warn" | "error";
  version?: string;
  latencyMs?: number;
  message?: string;
}

export interface SystemHealthReport {
  ok: boolean;
  node: DiagnosticCheckItem;
  python: DiagnosticCheckItem;
  rust: DiagnosticCheckItem;
  go: DiagnosticCheckItem;
  nativeCompiler: DiagnosticCheckItem;
  registries: DiagnosticCheckItem[];
  lockfileIntegrity: DiagnosticCheckItem;
}

export interface LockfileVerificationResult {
  valid: boolean;
  hash?: string;
  driftDetected: boolean;
  membersCount: number;
  error?: string;
}
