# Changelog

All notable changes to the **Ritual Agent Defense** extension will be documented in this file.

## [0.1.0] - 2026-11-02

### Added
- **Live Status Bar Telemetry**:
  - `AgentShield`: Real-time kernel sandbox profile (`Seatbelt`, `bwrap`, `AppContainer`), blocked syscalls, and egress CIDR enforcement.
  - `DBShield`: Active wire-protocol proxy connection, safety tier (`STRICT`, `BALANCED`), and pending approval indicator.
  - `SkillPrism`: Real-time context window token savings and reduction ratio counter.
- **Side Panel Integration ("Ritual Agent Defense")**:
  - **1-Click Approvals & Shield Gate**: Webview queue with instant **"✓ 1-Click Approve"** and **"✕ Reject"** buttons for sensitive database mutations and dangerous shell commands.
  - **SkillPrism Token Savings Visualizer**: Visual payload ratio progress bars, compression percentage, and breakdown per tool invocation.
  - **DevShelf MCP Tool Catalog**: Embedded 500+ tool directory with category filters, interactive test runner playground, and 1-click **"⚡ Add to Cursor / Claude (`mcp.json`)"** installer.
  - **Agent Mesh & Sandbox Health Tree**: Real-time status tree tracking micro-jails, syscall filters, virtual schema masking, and taint tracking.
- **Commands**:
  - `ritual.refreshAll`: Instant telemetry refresh across all mesh components.
  - `ritual.approveMutation`: Command palette 1-click approval.
  - `ritual.rejectMutation`: Command palette mutation rejection.
  - `ritual.openDashboard`: Launch DBShield live query approval feed in external browser.
  - `ritual.configureMcp`: 1-Click interactive `.cursor/mcp.json` and `claude_desktop_config.json` generator.
