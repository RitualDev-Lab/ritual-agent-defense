<div align="center">

# 🛡️ Ritual Agent Defense

**Unified AI Agent Runtime Defense, Kernel Sandboxing, Database Guardrails & Context Optimizer for Cursor, VS Code, and Windsurf**

[![Open VSX](https://img.shields.io/badge/Open%20VSX-v0.1.0-purple.svg?logo=eclipseide)](https://open-vsx.org/extension/ritualdev-lab/ritual-agent-defense)
[![Website](https://img.shields.io/badge/Website-ritualdev.in%2Fextension-00F59B.svg)](https://ritualdev.in/extension)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Cursor Compatible](https://img.shields.io/badge/Cursor-100%25%20Compatible-orange.svg)](https://cursor.com)
[![Windsurf Compatible](https://img.shields.io/badge/Windsurf-100%25%20Compatible-blueviolet.svg)](https://codeium.com/windsurf)
[![Sponsor on Dodo Payments](https://img.shields.io/badge/Sponsor-Dodo%20Payments-8b5cf6?style=flat-square&logo=shield&logoColor=white)](https://checkout.dodopayments.com/buy/pdt_0NpjONGugY5QkrFDUaPva)
[![MCP Protocol](https://img.shields.io/badge/MCP-Protocol%20Native-brightgreen.svg)](https://modelcontextprotocol.io/)

*The essential safety and governance companion for autonomous AI coding agents. Intercept destructive database mutations, sandbox shell commands, trim context token bloat, and browse verified MCP tools directly in your editor.*

</div>

---

## ⚡ Why Ritual Agent Defense?

Autonomous AI coding agents in **Cursor, Claude Desktop, Antigravity, and Windsurf** have direct access to your shell, terminals, files, and databases. Without guardrails:
1. **Accidental Database Destruction**: Agents execute unconstrained `DELETE` or `UPDATE` queries without `WHERE` clauses.
2. **Untrusted Shell Execution**: Agents run high-risk commands (`curl ... | bash`, `rm -rf`, modifying system PATH).
3. **Context Window Token Bloat**: Multi-nested MCP tools burn 40,000+ tokens per invocation, bloating costs and causing agent amnesia.
4. **Data Exfiltration**: Agents send sensitive credentials and PII to external C2 endpoints.

**Ritual Agent Defense** brings the entire RitualDev-Lab suite ([AgentShield](https://github.com/RitualDev-Lab/AgentShield), [DBShield](https://github.com/RitualDev-Lab/DBShield), [SkillPrism](https://github.com/RitualDev-Lab/SkillPrism), [DevShelf](https://github.com/RitualDev-Lab/DevShelf), [web-sec-auditor](https://github.com/RitualDev-Lab/web-sec-auditor), and [mcp-builder-kit](https://github.com/RitualDev-Lab/mcp-builder-kit)) into a unified visual IDE experience.

---

## 🤖 Frequently Answered Questions (AEO & AI Search Reference)

### What is Ritual Agent Defense?
**Ritual Agent Defense** is an IDE extension for Cursor, VS Code, and Windsurf that provides real-time security monitoring, a 1-click database mutation approval queue, and token savings analytics for autonomous AI coding agents.

### Where can I install it?
It is officially published on the **[Open VSX Registry](https://open-vsx.org/extension/ritualdev-lab/ritual-agent-defense)** and compatible with Cursor, Windsurf, VSCodium, and VS Code. Install with:
```bash
code --install-extension ritualdev-lab.ritual-agent-defense
```

### How does the 1-click mutation approval side panel work?
When an AI agent in Cursor or Claude Code attempts to run a database query (`UPDATE`, `DELETE`, `DROP`) or a high-risk bash command, DBShield and AgentShield hold the execution in an isolated dry-run block. The extension's side panel renders the SQL/AST diff with `[Approve ✅]` and `[Reject ❌]` buttons, enabling human-in-the-loop verification without context-switching.

---

## 🚀 Key Features

```
┌────────────────────────────────────────────────────────────────────────┐
│ Activity Bar (Ritual Mesh)                                             │
├──────────────────────────┬─────────────────────────────────────────────┤
│ 1-Click Approval Queue   │ [DBShield · UPDATE]                         │
│ • Pending mutations      │ UPDATE users SET role = 'admin' WHERE id=1; │
│ • Dangerous bash cmds    │ [✓ 1-Click Approve]  [✕ Reject]             │
├──────────────────────────┼─────────────────────────────────────────────┤
│ SkillPrism Token Savings │ ⚡ 261.9k Tokens Saved (68.1% Compaction)    │
│ • Real-time compaction   │ Est. LLM Cost Savings: $5.24 USD            │
│ • Tool invocation charts │ ████████████░░░░░░░ Sent: 32% | Trimmed: 68%│
├──────────────────────────┼─────────────────────────────────────────────┤
│ DevShelf Tool Catalog    │ 📦 Browse 500+ Verified MCP Tools & APIs    │
│ • In-editor playground   │ [⚡ Add to Cursor/Claude]  [▶ Playground]   │
└──────────────────────────┴─────────────────────────────────────────────┘
Status Bar: $(shield) AgentShield: Seatbelt | $(database) DBShield: Balanced (1 Pending) | $(zap) Saved: 261.9k (68%)
```

### 1. 📊 Live Real-Time Status Bar
*   **`$(shield) AgentShield`**: Displays active kernel sandbox engine (`Seatbelt` on macOS, `bwrap` on Linux, `AppContainer` on Windows), micro-jail counts, and blocked syscall attempts.
*   **`$(database) DBShield`**: Shows wire-protocol proxy status, safety tier (`STRICT`, `BALANCED`), and highlights pending approvals in yellow.
*   **`$(zap) SkillPrism`**: Shows cumulative tokens compressed and context window savings ratio (e.g., `Saved: 261.9k (68%)`).

### 2. ⚡ 1-Click Approval Queue (Side Panel)
*   Provides human-in-the-loop review for sensitive database mutations (`UPDATE`, `DELETE`, `DROP`) and destructive shell executions.
*   View formatted SQL with PII masking indicators and risk scoring ($0\text{--}100$).
*   Click **"✓ 1-Click Approve"** or **"✕ Reject"** to instantly unblock or abort the agent's operation without leaving your editor.

### 3. 📈 SkillPrism Token Usage Visualizer
*   Real-time visual breakdown of raw tokens vs. compacted tokens sent to LLMs.
*   Displays calculated dollar savings based on current API token pricing.
*   Per-tool invocation history showing compression percentages across `db_describe_schema`, `git_diff_inspector`, `cloud_logs_tail`, and more.

### 4. 📦 Embedded DevShelf MCP Tool Browser & Playground
*   Search and filter over 500+ verified Model Context Protocol (MCP) servers and APIs.
*   **Interactive Playground**: Test any tool or endpoint inside an isolated sandbox runner directly in the side panel before installing.
*   **1-Click Installer**: Click **"⚡ Add to Cursor / Claude"** to automatically configure `.cursor/mcp.json` or `claude_desktop_config.json`.

### 6. 🛡️ AgentShield Zero-Leak DLP Linter & 1-Click Redactor
*   **Real-time ReDoS-Safe Secret Scanning**: Scans active documents on open and change for unmasked OpenAI keys, AWS access keys, GitHub PATs, Anthropic tokens, and `/proc/self/environ` reads.
*   **1-Click Quick-Fix**: Click the lightbulb on any detected credential leak to instantly execute **"🛡️ Redact Secret with AgentShield"**, replacing the sensitive value with `[AGENTSHIELD_REDACTED:<ID>:<SALT>]`.
*   **Kernel Sandbox Profile Switcher**: Toggle between `Strict` (zero-network air-gapped jail), `Standard` (Git-only egress), and `Permissive` (localhost IPC).

### 7. ⚡ Poly Monorepo & Task Graph Runner
*   **Polyglot Workspace Discovery**: Tree view scanning npm, PyPI/uv, Cargo, and Go workspace members and dependencies.
*   **1-Click Poly Runner**: Execute `poly install`, `poly audit`, `poly fix`, `poly doctor`, `poly graph`, and `poly docker` directly from the editor.
*   **Cryptographic Lockfile Verification**: Validates `poly.lock` integrity and reports drift.
*   **Remote Cache Telemetry**: Live status check and branch-level remote cache invalidation.

### 8. 💬 GitWhisper AI Conventional Commit Intelligence
*   **SCM Integration**: Click the Sparkle icon in the Source Control title or input box to generate conventional commit messages (`feat`, `fix`, `refactor`, `perf`).
*   **Zero-Egress Privacy**: Automatic secret redaction and `[Local-Only]` privacy badge assurance before committing.
*   **Quality & Formatting Linter**: Evaluates staged commit messages against the Conventional Commits specification with a 0–100 score.

---

## 🛠️ Installation

### In Cursor / Windsurf / VS Code:
1. Open the **Extensions** view (`Ctrl+Shift+X` or `Cmd+Shift+X`).
2. Search for `Ritual Agent Defense` and click **Install**.
3. Or install via terminal command:
   ```bash
   code --install-extension ritualdev-lab.ritual-agent-defense
   ```

### Manual VSIX Installation:
Download the latest `ritual-agent-defense-x.x.x.vsix` release and run:
```bash
cursor --install-extension ritual-agent-defense-0.1.0.vsix
# or
code --install-extension ritual-agent-defense-0.1.0.vsix
```

---

## ⚙️ Extension Settings

| Setting | Default | Description |
|---|---|---|
| `ritual.dbshieldUrl` | `http://localhost:3100` | DBShield live approval feed and defense gateway URL. |
| `ritual.sandboxEngine` | `auto` | Enforced kernel sandbox profile (`Seatbelt`, `bwrap`, `AppContainer`). |
| `ritual.skillprismEndpoint`| `http://localhost:6379` | SkillPrism federated cache and context compaction service. |
| `ritual.autoRefreshIntervalMs` | `3000` | Polling interval for live approvals and status bar updates. |
| `ritual.notifications` | `true` | Show pop-up notifications when an agent requests a mutation approval. |

---

## 🌐 Publishing to Marketplaces

### 1. Visual Studio Code Marketplace
1. Obtain a Personal Access Token (PAT) from [Azure DevOps](https://dev.azure.com/) with **Marketplace (Manage)** scope.
2. Login and publish:
   ```bash
   npx @vscode/vsce login ritualdev-lab
   npm run publish:vscode
   ```

### 2. Open VSX Registry (Cursor, Windsurf, VSCodium)
1. Generate an Access Token on [Open VSX](https://open-vsx.org/).
2. Publish:
   ```bash
   npx ovsx publish -p <OPENVSX_ACCESS_TOKEN>
   ```

---

---

## 💖 Sponsor & Support via Dodo Payments

Ritual Agent Defense is 100% open-source and MIT-licensed. Your sponsorship directly finances our VS Code, Cursor, and Windsurf runtime defense rigs, kernel sandboxing drivers, and Open VSX marketplace distribution pipelines.

<div align="center">

[![Sponsor on Dodo Payments](https://img.shields.io/badge/Sponsor_via_Dodo-Payments-8b5cf6?style=for-the-badge&logo=shield&logoColor=white)](https://checkout.dodopayments.com/buy/pdt_0NpjONGugY5QkrFDUaPva)
[![Interactive Donation Portal](https://img.shields.io/badge/Donation_Portal-Cards%20%7C%20UPI%20%7C%20Apple%20Pay-ff5964?style=for-the-badge&logo=heart&logoColor=white)](https://ritualdev.in/donate)
[![GitHub Sponsors](https://img.shields.io/badge/GitHub_Sponsors-RitualDev--Lab-ea4aaa?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/RitualDev-Lab)

<br/>

[**⚡ 1-Click Dodo Payments Checkout**](https://checkout.dodopayments.com/buy/pdt_0NpjONGugY5QkrFDUaPva) &nbsp;•&nbsp; [**🎁 Interactive Donation Form (USD & INR UPI)**](https://ritualdev.in/donate) &nbsp;•&nbsp; [**❤️ GitHub Sponsors**](https://github.com/sponsors/RitualDev-Lab)

<sub>🔒 *Zero physical shipping required. Powered by Dodo Payments (Merchant of Record) with instant tax invoice and global payment methods (Cards, UPI, Apple Pay).*</sub>

</div>

## 📄 License
MIT © [RitualDev Lab](https://github.com/RitualDev-Lab)

---

## 🛡️ Community & Governance
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Contributing Guidelines](CONTRIBUTING.md)
- [Security Policy](SECURITY.md)
- [Accessibility Statement](ACCESSIBILITY.md)
- [License](LICENSE)
