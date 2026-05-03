# Safety Automation Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the seven requested follow-up capabilities: operation preview/undo, richer image assets, configurable templates, batch rename/move planning, workspace home data, static-site export planning, and release automation.

**Architecture:** Extend the existing action workbench rather than creating scattered panels. Keep all planning in pure utilities, add safe localStorage-backed operation history, and add a release script that reads Markdown notes from `docs/releases`.

**Tech Stack:** React 18, TypeScript, Electron IPC, Vitest, Testing Library, shell scripts.

---

### Task 1: Safety Automation Utilities

**Files:**
- Create: `src/utils/safetyAutomation.ts`
- Test: `src/__tests__/utils/safetyAutomation.test.ts`

- [x] Write failing tests for diff preview, undo snapshots, image inventory assets, workspace templates, batch move plans, workspace home cards, static site export plans, and release command generation.
- [x] Run tests and confirm RED.
- [x] Implement utility functions.
- [x] Run tests and confirm GREEN.

### Task 2: Action Workbench Expansion

**Files:**
- Modify: `src/components/ActionWorkbenchPanel/index.tsx`
- Modify: `src/components/ActionWorkbenchPanel/ActionWorkbenchPanel.module.css`
- Modify: `src/__tests__/components/ActionWorkbenchPanel.test.tsx`

- [x] Add preview/undo, image asset audit, configurable templates, batch operations, workspace home, static export, and release automation sections.
- [x] Wire callbacks without nesting cards inside cards.
- [x] Run component tests.

### Task 3: App Integration

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/utils/storage.ts`

- [x] Build all safety automation data in `App.tsx`.
- [x] Persist operation snapshots in localStorage.
- [x] Add copy actions for diff preview, batch move plan, static export plan, and release commands.
- [x] Add undo-last-operation action for recently modified Markdown files.

### Task 4: Release Automation Script

**Files:**
- Create: `scripts/release-local.sh`
- Modify: `README.md`

- [x] Add a local release helper that runs verification, tags, reads `docs/releases/<version>.md`, and creates GitHub Release with notes-file.
- [x] Document the command.

### Task 5: Verification And Commit

**Files:**
- All changed files

- [x] Run focused tests.
- [x] Run `npm run lint`.
- [x] Run `npm test`.
- [x] Run `npm run build`.
- [x] Run `npm run e2e`.
- [ ] Commit as `feat: add safety automation tools`.
