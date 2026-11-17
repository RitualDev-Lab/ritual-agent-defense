import assert from "node:assert";
import test from "node:test";
import {
  generateConventionalCommitVariants,
  validateCommitQuality,
} from "../src/gitwhisper/commit-generator.js";

test("GitWhisper - Generates structured Conventional Commit variants with inferred scope", () => {
  const staged = ["src/proxy/wire-masker.ts", "tests/wire-masker.test.ts"];
  const result = generateConventionalCommitVariants(staged);

  assert.strictEqual(result.stagedFilesCount, 2);
  assert.strictEqual(result.privacy.mode, "local_only");
  assert.ok(result.variants.length >= 4);

  const featVariant = result.variants.find((v) => v.type === "feat");
  assert.ok(featVariant);
  assert.ok(featVariant.subject.includes("feat(proxy):"));
  assert.ok(featVariant.body?.includes("src/proxy/wire-masker.ts"));

  const fixVariant = result.variants.find((v) => v.type === "fix");
  assert.ok(fixVariant);
  assert.ok(fixVariant.subject.includes("fix(proxy):"));
});

test("GitWhisper - Automatically flags and redacts secrets in staged diff summary", () => {
  const staged = ["config/secrets.env"];
  const diffWithKey = `+OPENAI_API_KEY=sk-proj-123456789012345678901234567890`;
  const result = generateConventionalCommitVariants(staged, diffWithKey);

  assert.strictEqual(result.privacy.mode, "redacted");
  assert.strictEqual(result.privacy.redactedSecretsCount, 1);
  assert.ok(result.privacy.badge.includes("[Redacted: 1 secrets]"));
});

test("GitWhisper - Accurately validates commit quality and format scoring", () => {
  const validMsg = "feat(auth): add offline Ed25519 license verification";
  const validCheck = validateCommitQuality(validMsg);
  assert.strictEqual(validCheck.valid, true);
  assert.strictEqual(validCheck.score, 100);
  assert.strictEqual(validCheck.issues.length, 0);

  const invalidMsg = "fixed the broken stuff.";
  const invalidCheck = validateCommitQuality(invalidMsg);
  assert.strictEqual(invalidCheck.valid, false);
  assert.ok(invalidCheck.score < 100);
  assert.ok(invalidCheck.issues.length >= 2);
});
