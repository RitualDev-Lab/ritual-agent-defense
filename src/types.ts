export interface ApprovalItem {
  id: string;
  timestamp: string;
  sql: string;
  operation: string;
  riskLevel: "CRITICAL" | "BLOCKED" | "CAUTION" | "SAFE";
  riskScore: number;
  targetTables: string[];
  piiRedacted: boolean;
  status: "PENDING" | "APPROVED" | "REJECTED";
  origin: "DBShield" | "AgentShield";
  agentId?: string;
  commandOrQuery: string;
}

export interface AgentShieldStatus {
  engine: "Seatbelt (macOS)" | "bwrap (Linux)" | "AppContainer (Windows)" | "Auto";
  active: boolean;
  activeMicroJails: number;
  blockedSyscalls: number;
  egressViolations: number;
  cpuCeilingPercent: number;
  memoryCeilingMb: number;
}

export interface DBShieldStatus {
  connected: boolean;
  dialect: "sqlite" | "postgres" | "mysql";
  safetyTier: "STRICT" | "BALANCED" | "PERMISSIVE";
  pendingApprovals: number;
  blockedQueries: number;
  piiRedactions: number;
  dashboardUrl: string;
}

export interface SkillPrismMetrics {
  totalQueries: number;
  originalTokens: number;
  compactedTokens: number;
  tokensSaved: number;
  compressionRatio: number;
  estimatedDollarsSaved: number;
  history: Array<{
    timestamp: string;
    toolName: string;
    original: number;
    compacted: number;
  }>;
}

export interface DevShelfTool {
  id: string;
  name: string;
  category: "Databases" | "DevTools" | "Cloud" | "Security" | "Productivity" | "AI & Search";
  description: string;
  author: string;
  stars: number;
  verified: boolean;
  uptime: string;
  mcpConfig: {
    command: string;
    args: string[];
    env?: Record<string, string>;
  };
}
