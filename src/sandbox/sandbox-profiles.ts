import * as os from "node:os";

export type SandboxProfileName = "Strict" | "Standard" | "Permissive";

export interface SandboxProfileDetails {
  name: SandboxProfileName;
  description: string;
  networkEgress: string;
  imdsIsolation: boolean;
  filesystemJail: string;
}

export const SANDBOX_PROFILES: Record<SandboxProfileName, SandboxProfileDetails> = {
  Strict: {
    name: "Strict",
    description: "Air-gapped filesystem jail with zero outbound network access.",
    networkEgress: "Zero Network (Air-Gapped)",
    imdsIsolation: true,
    filesystemJail: "Workspace Directory Only (Read-Only outside)",
  },
  Standard: {
    name: "Standard",
    description: "Egress restricted strictly to GitHub/GitLab over Port 443/22.",
    networkEgress: "Allow Git Only (Port 22/443)",
    imdsIsolation: true,
    filesystemJail: "Workspace Directory Only (r/w)",
  },
  Permissive: {
    name: "Permissive",
    description: "Allows localhost IPC and internal private corporate subnets.",
    networkEgress: "Localhost + Private Subnets",
    imdsIsolation: false,
    filesystemJail: "Workspace + Temp Directories",
  },
};

export function detectKernelSandboxEngine(): string {
  const osType = os.platform();
  if (osType === "darwin") return "Seatbelt (Apple Sandbox API)";
  if (osType === "linux") return "Bubblewrap (Linux Namespaces)";
  if (osType === "win32") return "Windows LowBox AppContainer";
  return "Posix Sandbox Jail";
}
