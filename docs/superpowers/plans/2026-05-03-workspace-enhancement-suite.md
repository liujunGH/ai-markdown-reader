# Workspace Enhancement Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the next six feature groups as one coherent workspace operations layer.

**Architecture:** Add pure planning utilities for executable fixes, dashboard cards, link rename safety, image asset management, reading assistance, and release packaging checks. Surface those utilities through one new `WorkspaceDashboardPanel` and wire it into the existing tools menu and command palette.

**Tech Stack:** React 18, TypeScript, CSS Modules, Vitest, Testing Library.

---

### Task 1: Workspace Enhancement Utilities

**Files:**
- Create: `src/utils/workspaceEnhancements.ts`
- Test: `src/__tests__/utils/workspaceEnhancements.test.ts`

- [x] Write failing tests for dashboard cards, executable fix suggestions, image asset plans, link rename previews, reading assistant summaries, and release package checks.
- [x] Run the tests and confirm RED.
- [x] Implement the utilities.
- [x] Run the tests and confirm GREEN.

### Task 2: Workspace Dashboard Panel

**Files:**
- Create: `src/components/WorkspaceDashboardPanel/index.tsx`
- Create: `src/components/WorkspaceDashboardPanel/WorkspaceDashboardPanel.module.css`
- Test: `src/__tests__/components/WorkspaceDashboardPanel.test.tsx`

- [x] Write failing tests for section rendering and action callbacks.
- [x] Run the tests and confirm RED.
- [x] Implement the panel.
- [x] Run the tests and confirm GREEN.

### Task 3: App Integration

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/stores/uiStore.ts`
- Modify: `src/components/CommandPalette/index.tsx`

- [x] Add `workspaceDashboard` to UI state.
- [x] Build dashboard data from existing diagnostics, reading history, preflight report, indexed files, and active tab.
- [x] Add tools menu and command palette entries.
- [x] Render the dashboard and route actions to existing panels.

### Task 4: Verification And Commit

**Files:**
- All changed files

- [x] Run focused tests.
- [x] Run `npm run lint`.
- [x] Run `npm test`.
- [x] Run `npm run build`.
- [x] Run `npm run e2e`.
- [x] Commit as `feat: add workspace operations dashboard`.
