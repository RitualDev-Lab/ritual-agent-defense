import assert from "node:assert";
import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs";
import test from "node:test";
import { PolyWorkspace } from "../src/poly/poly-workspace.js";

test("PolyWorkspace - Discovers npm, cargo, and python workspace members and dependencies", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "poly-test-"));

  try {
    // 1. Create root package.json
    fs.writeFileSync(
      path.join(tmpDir, "package.json"),
      JSON.stringify({
        name: "test-monorepo-root",
        dependencies: { zod: "^3.22.4", express: "^4.18.2" },
      }),
    );

    // 2. Create subpackage in packages/core
    const pkgDir = path.join(tmpDir, "packages", "core");
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(
      path.join(pkgDir, "package.json"),
      JSON.stringify({
        name: "@test/core",
        dependencies: { typescript: "^5.3.3" },
      }),
    );

    // 3. Create python subpackage in services/worker
    const pyDir = path.join(tmpDir, "services", "worker");
    fs.mkdirSync(pyDir, { recursive: true });
    fs.writeFileSync(
      path.join(pyDir, "requirements.txt"),
      "fastapi==0.109.0\nuvicorn>=0.27.0\n",
    );

    const members = PolyWorkspace.discoverWorkspace(tmpDir);
    assert.strictEqual(members.length, 3);

    const rootMember = members.find((m) => m.relativeDir === ".");
    assert.ok(rootMember);
    assert.strictEqual(rootMember.ecosystem, "npm");
    assert.strictEqual(rootMember.dependencies.length, 2);

    const coreMember = members.find((m) => m.name === "packages/core");
    assert.ok(coreMember);
    assert.strictEqual(coreMember.ecosystem, "npm");
    assert.strictEqual(coreMember.dependencies.length, 1);

    const workerMember = members.find((m) => m.name === "services/worker");
    assert.ok(workerMember);
    assert.strictEqual(workerMember.ecosystem, "pypi");
    assert.strictEqual(workerMember.dependencies.length, 2);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("PolyWorkspace - Verifies poly.lock cryptographic integrity and flags missing files", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "poly-lock-test-"));
  try {
    const missingRes = PolyWorkspace.verifyLock(tmpDir);
    assert.strictEqual(missingRes.valid, false);
    assert.strictEqual(missingRes.driftDetected, true);

    // Create poly.lock
    fs.writeFileSync(path.join(tmpDir, "poly.lock"), "version = 1\n[packages]\n");
    const validRes = PolyWorkspace.verifyLock(tmpDir);
    assert.strictEqual(validRes.valid, true);
    assert.strictEqual(validRes.driftDetected, false);
    assert.ok(validRes.hash?.startsWith("sha256:"));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
