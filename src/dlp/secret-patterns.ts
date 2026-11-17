export interface SecretDetectorPattern {
  id: string;
  name: string;
  regex: RegExp;
}

export interface DetectedSecretMatch {
  id: string;
  name: string;
  value: string;
  start: number;
  end: number;
}

export const SECRET_DETECTORS: SecretDetectorPattern[] = [
  { id: "OPENAI_KEY", name: "OpenAI Secret Key", regex: /\b(sk-[a-zA-Z0-9_\-]{20,80})\b/g },
  { id: "AWS_ACCESS_KEY", name: "AWS Access Key", regex: /\b(AKIA[0-9A-Z]{16})\b/g },
  {
    id: "ANTHROPIC_KEY",
    name: "Anthropic API Key",
    regex: /\b(sk-ant-[a-zA-Z0-9_\-]{20,80})\b/g,
  },
  {
    id: "GITHUB_PAT",
    name: "GitHub Personal Access Token",
    regex: /\b(ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59})\b/g,
  },
  { id: "SLACK_TOKEN", name: "Slack Bot Token", regex: /\b(xox[baprs]-[0-9a-zA-Z]{10,48})\b/g },
  { id: "STRIPE_KEY", name: "Stripe Live Secret Key", regex: /\b(sk_live_[0-9a-zA-Z]{24,34})\b/g },
  { id: "GOOGLE_API_KEY", name: "Google API Key", regex: /\b(AIza[0-9A-Za-z-_]{35})\b/g },
  {
    id: "PRIVATE_KEY_HEADER",
    name: "Private Cryptographic Key",
    regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g,
  },
  {
    id: "PROC_ENVIRON",
    name: "/proc/self/environ Inspection",
    regex: /(?:\/proc\/(?:self|\d+)\/environ|\.e["']?n["']?v)/gi,
  },
];

export function scanTextForSecrets(text: string): DetectedSecretMatch[] {
  const matches: DetectedSecretMatch[] = [];

  for (const detector of SECRET_DETECTORS) {
    detector.regex.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = detector.regex.exec(text)) !== null) {
      matches.push({
        id: detector.id,
        name: detector.name,
        value: match[0],
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }

  return matches;
}

export function generateRedactedMask(detectorId: string): string {
  const salt = Math.random().toString(36).substring(2, 8);
  return `[AGENTSHIELD_REDACTED:${detectorId}:${salt}]`;
}
