import { scanTextForSecrets } from "../dlp/secret-patterns.js";
import type {
  CommitGenerationResult,
  CommitPrivacyBadge,
  CommitVariant,
} from "./gitwhisper-types.js";

export function generateConventionalCommitVariants(
  stagedFiles: string[],
  diffSummary?: string,
): CommitGenerationResult {
  const secretMatches = diffSummary ? scanTextForSecrets(diffSummary) : [];
  const redactedCount = secretMatches.length;

  // Determine likely scope based on directory path
  let scope: string | undefined;
  if (stagedFiles.length > 0) {
    const first = stagedFiles[0];
    const parts = first.replace(/\\/g, "/").split("/");
    if (parts.length > 1) {
      scope = parts[parts.length - 2];
    } else {
      scope = parts[0].split(".")[0];
    }
  }

  const variants: CommitVariant[] = [];

  // Generate intelligent variants
  const scopePrefix = scope ? `(${scope})` : "";

  // 1. Feature variant
  variants.push({
    id: "var_feat",
    type: "feat",
    scope,
    subject: `feat${scopePrefix}: implement core capabilities across ${stagedFiles.length} file(s)`,
    body: stagedFiles.map((f) => `- update ${f}`).join("\n"),
  });

  // 2. Fix variant
  variants.push({
    id: "var_fix",
    type: "fix",
    scope,
    subject: `fix${scopePrefix}: resolve regressions and enforce validation logic`,
    body: `Addresses edge cases observed across staged changes in ${stagedFiles.join(", ")}.`,
  });

  // 3. Refactor variant
  variants.push({
    id: "var_refactor",
    type: "refactor",
    scope,
    subject: `refactor${scopePrefix}: modernize component boundaries and optimize throughput`,
    body: `Streamlines data flow and aligns with Ritual enterprise architecture standards.`,
  });

  // 4. Chore/CI variant
  variants.push({
    id: "var_chore",
    type: "chore",
    scope,
    subject: `chore${scopePrefix}: update configuration and package dependencies`,
  });

  const privacy: CommitPrivacyBadge = {
    mode: redactedCount > 0 ? "redacted" : "local_only",
    badge: redactedCount > 0 ? `[Redacted: ${redactedCount} secrets]` : "[Local-Only]",
    redactedSecretsCount: redactedCount,
  };

  return {
    variants,
    privacy,
    stagedFilesCount: stagedFiles.length,
  };
}

export interface CommitQualityCheck {
  valid: boolean;
  score: number; // 0 - 100
  issues: string[];
}

export function validateCommitQuality(message: string): CommitQualityCheck {
  const issues: string[] = [];
  const lines = message.trim().split("\n");
  const firstLine = lines[0] || "";

  const conventionalRegex =
    /^(feat|fix|refactor|perf|docs|style|test|chore|ci|build)(\([a-zA-Z0-9_\-./]+\))?(!)?:\s+(.+)$/;

  if (!conventionalRegex.test(firstLine)) {
    issues.push("Header does not adhere to Conventional Commits format '<type>(<scope>): <subject>'.");
  }

  if (firstLine.length > 72) {
    issues.push(`Header length exceeds 72 characters (${firstLine.length} chars).`);
  }

  if (firstLine.endsWith(".")) {
    issues.push("Header subject must not end with a period.");
  }

  const score = Math.max(0, 100 - issues.length * 30);

  return {
    valid: issues.length === 0,
    score,
    issues,
  };
}
