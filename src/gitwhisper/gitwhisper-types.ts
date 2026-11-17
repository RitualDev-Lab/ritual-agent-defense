export type CommitType =
  | "feat"
  | "fix"
  | "refactor"
  | "perf"
  | "docs"
  | "style"
  | "test"
  | "chore"
  | "ci";

export interface CommitVariant {
  id: string;
  type: CommitType;
  scope?: string;
  subject: string;
  body?: string;
  breaking?: boolean;
}

export interface CommitPrivacyBadge {
  mode: "local_only" | "redacted" | "vault";
  badge: string;
  redactedSecretsCount: number;
}

export interface CommitGenerationResult {
  variants: CommitVariant[];
  privacy: CommitPrivacyBadge;
  stagedFilesCount: number;
}
