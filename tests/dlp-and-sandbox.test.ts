import assert from "node:assert";
import test from "node:test";
import {
  SECRET_DETECTORS,
  generateRedactedMask,
  scanTextForSecrets,
} from "../src/dlp/secret-patterns.js";
import {
  SANDBOX_PROFILES,
  detectKernelSandboxEngine,
} from "../src/sandbox/sandbox-profiles.js";

test("DLP SecretDetector - Detects OpenAI, AWS, and GitHub tokens with zero false positives", () => {
  const sample = `
    const apiKey = "sk-proj-abc123456789012345678901234567890";
    const awsKey = "AKIA1234567890ABCDEF";
    const ghPat = "ghp_123456789012345678901234567890123456";
    const safeVar = "hello_world_variable";
  `;

  const matches = scanTextForSecrets(sample);
  assert.strictEqual(matches.length, 3);

  const openaiMatch = matches.find((m) => m.id === "OPENAI_KEY");
  assert.ok(openaiMatch);
  assert.ok(openaiMatch.value.startsWith("sk-proj-"));

  const awsMatch = matches.find((m) => m.id === "AWS_ACCESS_KEY");
  assert.ok(awsMatch);
  assert.strictEqual(awsMatch.value, "AKIA1234567890ABCDEF");

  const ghMatch = matches.find((m) => m.id === "GITHUB_PAT");
  assert.ok(ghMatch);
  assert.ok(ghMatch.value.startsWith("ghp_"));
});

test("DLP SecretDetector - Detects /proc/self/environ unauthorized inspection attempts", () => {
  const sample = "const envDump = fs.readFileSync('/proc/self/environ', 'utf8');";
  const matches = scanTextForSecrets(sample);
  assert.strictEqual(matches.length, 1);
  assert.strictEqual(matches[0].id, "PROC_ENVIRON");
});

test("DLP SecretDetector - Generates valid salt-redacted masks", () => {
  const mask1 = generateRedactedMask("OPENAI_KEY");
  const mask2 = generateRedactedMask("OPENAI_KEY");

  assert.ok(mask1.startsWith("[AGENTSHIELD_REDACTED:OPENAI_KEY:"));
  assert.ok(mask1.endsWith("]"));
  // Ensure salts are high-entropy and distinct
  assert.notStrictEqual(mask1, mask2);
});

test("SandboxController - Returns accurate host kernel engine and profile matrix", () => {
  const engine = detectKernelSandboxEngine();
  assert.ok(
    engine.includes("Seatbelt") ||
      engine.includes("Bubblewrap") ||
      engine.includes("LowBox AppContainer"),
  );

  assert.ok(SANDBOX_PROFILES.Strict.imdsIsolation);
  assert.strictEqual(SANDBOX_PROFILES.Strict.networkEgress, "Zero Network (Air-Gapped)");
  assert.ok(SANDBOX_PROFILES.Standard.imdsIsolation);
  assert.strictEqual(SANDBOX_PROFILES.Permissive.imdsIsolation, false);
});
