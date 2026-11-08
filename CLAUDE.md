# Ritual Agent Defense IDE Extension

> Unified AI Agent Runtime Defense & Kernel Sandbox for Cursor, VS Code, and Windsurf.

## Extension Architecture
- `src/extension.ts`: Main activation lifecycle and status bar telemetry.
- `src/approvalQueue.ts`: Real-time WebSocket/IPC listener for pending agent mutation approvals.
- `src/telemetryView.ts`: Webview panel rendering real-time kernel sandbox metrics and SkillPrism token savings.

## Build & Test
- Compile: `npm run compile`
- Package VSIX: `npx @vscode/vsce package`
