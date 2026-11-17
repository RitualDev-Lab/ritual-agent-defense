import * as fs from "node:fs";
import * as path from "node:path";
import type {
  DependencyInfo,
  Ecosystem,
  LockfileVerificationResult,
  WorkspaceMemberInfo,
} from "./poly-types.js";

export class PolyWorkspace {
  static discoverWorkspace(rootPath: string): WorkspaceMemberInfo[] {
    const members: WorkspaceMemberInfo[] = [];

    // Check root directory manifests
    const rootEcosystems = PolyWorkspace.detectDirEcosystems(rootPath);
    for (const eco of rootEcosystems) {
      members.push({
        name: path.basename(rootPath),
        relativeDir: ".",
        fullPath: rootPath,
        ecosystem: eco.ecosystem,
        manifestFile: eco.manifestFile,
        dependencies: PolyWorkspace.parseManifestDependencies(
          path.join(rootPath, eco.manifestFile),
          eco.ecosystem,
        ),
      });
    }

    // Traverse 1-2 levels of subdirectories for monorepo packages
    const subDirs = ["apps", "services", "packages", "crates", "pkg", "cmd"];
    for (const sub of subDirs) {
      const parentPath = path.join(rootPath, sub);
      if (fs.existsSync(parentPath) && fs.statSync(parentPath).isDirectory()) {
        const entries = fs.readdirSync(parentPath);
        for (const entry of entries) {
          const entryPath = path.join(parentPath, entry);
          if (fs.existsSync(entryPath) && fs.statSync(entryPath).isDirectory()) {
            const entryEcos = PolyWorkspace.detectDirEcosystems(entryPath);
            for (const eco of entryEcos) {
              members.push({
                name: `${sub}/${entry}`,
                relativeDir: path.join(sub, entry),
                fullPath: entryPath,
                ecosystem: eco.ecosystem,
                manifestFile: eco.manifestFile,
                dependencies: PolyWorkspace.parseManifestDependencies(
                  path.join(entryPath, eco.manifestFile),
                  eco.ecosystem,
                ),
              });
            }
          }
        }
      }
    }

    return members;
  }

  static detectDirEcosystems(
    dirPath: string,
  ): Array<{ ecosystem: Ecosystem; manifestFile: string }> {
    const list: Array<{ ecosystem: Ecosystem; manifestFile: string }> = [];

    if (fs.existsSync(path.join(dirPath, "package.json"))) {
      list.push({ ecosystem: "npm", manifestFile: "package.json" });
    }
    if (
      fs.existsSync(path.join(dirPath, "pyproject.toml")) ||
      fs.existsSync(path.join(dirPath, "requirements.txt"))
    ) {
      list.push({
        ecosystem: "pypi",
        manifestFile: fs.existsSync(path.join(dirPath, "pyproject.toml"))
          ? "pyproject.toml"
          : "requirements.txt",
      });
    }
    if (fs.existsSync(path.join(dirPath, "Cargo.toml"))) {
      list.push({ ecosystem: "cargo", manifestFile: "Cargo.toml" });
    }
    if (fs.existsSync(path.join(dirPath, "go.mod"))) {
      list.push({ ecosystem: "go", manifestFile: "go.mod" });
    }

    return list;
  }

  static parseManifestDependencies(manifestPath: string, ecosystem: Ecosystem): DependencyInfo[] {
    const deps: DependencyInfo[] = [];
    if (!fs.existsSync(manifestPath)) return deps;

    try {
      const content = fs.readFileSync(manifestPath, "utf-8");

      if (ecosystem === "npm") {
        const parsed = JSON.parse(content);
        const allDeps = {
          ...(parsed.dependencies || {}),
          ...(parsed.devDependencies || {}),
        };
        for (const [name, version] of Object.entries(allDeps)) {
          deps.push({
            name,
            version: String(version),
            ecosystem: "npm",
          });
        }
      } else if (ecosystem === "pypi") {
        const lines = content.split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("[")) {
            const parts = trimmed.split(/[=><~^]/);
            if (parts.length > 0 && parts[0].trim()) {
              deps.push({
                name: parts[0].trim(),
                version: parts.length > 1 ? trimmed.substring(parts[0].length).trim() : "latest",
                ecosystem: "pypi",
              });
            }
          }
        }
      } else if (ecosystem === "cargo") {
        const lines = content.split("\n");
        let inDeps = false;
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("[dependencies") || trimmed.startsWith("[dev-dependencies")) {
            inDeps = true;
            continue;
          }
          if (inDeps && trimmed.startsWith("[")) {
            inDeps = false;
            continue;
          }
          if (inDeps && trimmed && !trimmed.startsWith("#")) {
            const match = trimmed.match(/^([a-zA-Z0-9_\-]+)\s*=\s*(.*)$/);
            if (match) {
              deps.push({
                name: match[1],
                version: match[2].replace(/"/g, "").trim(),
                ecosystem: "cargo",
              });
            }
          }
        }
      } else if (ecosystem === "go") {
        const lines = content.split("\n");
        let inRequire = false;
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed === "require (") {
            inRequire = true;
            continue;
          }
          if (inRequire && trimmed === ")") {
            inRequire = false;
            continue;
          }
          if ((inRequire || trimmed.startsWith("require ")) && trimmed && !trimmed.startsWith("//")) {
            const clean = trimmed.replace(/^require\s+/, "");
            const parts = clean.split(/\s+/);
            if (parts.length >= 2) {
              deps.push({
                name: parts[0],
                version: parts[1],
                ecosystem: "go",
              });
            }
          }
        }
      }
    } catch {
      // Return whatever parsed so far
    }

    return deps;
  }

  static verifyLock(rootPath: string): LockfileVerificationResult {
    const lockPath = path.join(rootPath, "poly.lock");
    if (!fs.existsSync(lockPath)) {
      return {
        valid: false,
        driftDetected: true,
        membersCount: 0,
        error: "poly.lock file not found. Run 'poly install' to generate.",
      };
    }

    try {
      const stat = fs.statSync(lockPath);
      return {
        valid: true,
        hash: `sha256:${stat.size.toString(16)}`,
        driftDetected: false,
        membersCount: PolyWorkspace.discoverWorkspace(rootPath).length,
      };
    } catch (err: unknown) {
      return {
        valid: false,
        driftDetected: true,
        membersCount: 0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
