# Action Workbench Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the six requested follow-up feature groups into executable workspace tools: one-click fixes, rename safety, image localization, templates, backlinks hygiene, and archive reports.

**Architecture:** Add a pure `workspaceActions` utility module for plans/reports, expose safe file update and remote image download IPC handlers, and add one `ActionWorkbenchPanel` that groups the six workflows. Wire it into the existing operations dashboard and tools menu.

**Tech Stack:** Electron IPC, React 18, TypeScript, CSS Modules, Vitest, Testing Library.

---

### Task 1: Pure Action Planning

**Files:**
- Create: `src/utils/workspaceActions.ts`
- Test: `src/__tests__/utils/workspaceActions.test.ts`

- [x] Write failing tests for templates, rename plans, image localization replacements, unlinked mentions, archive reports, and executable task labels.
- [x] Run tests and confirm RED.
- [x] Implement utility functions.
- [x] Run tests and confirm GREEN.

### Task 2: Safe File Actions IPC

**Files:**
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`
- Modify: `src/types/electron.d.ts`

- [x] Add overwrite-safe Markdown update IPC for existing `.md/.markdown` files.
- [x] Add remote image download IPC that writes into a workspace `assets/` folder.
- [x] Keep path validation and extension validation.

### Task 3: Action Workbench Panel

**Files:**
- Create: `src/components/ActionWorkbenchPanel/index.tsx`
- Create: `src/components/ActionWorkbenchPanel/ActionWorkbenchPanel.module.css`
- Test: `src/__tests__/components/ActionWorkbenchPanel.test.tsx`

- [x] Write failing component tests for all six sections and callbacks.
- [x] Run tests and confirm RED.
- [x] Implement the panel.
- [x] Run tests and confirm GREEN.

### Task 4: App Integration

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/stores/uiStore.ts`
- Modify: `src/components/CommandPalette/index.tsx`
- Modify: `src/components/MaintenanceQueuePanel/index.tsx`

- [x] Add `actionWorkbench` panel state and command/menu entry.
- [x] Build action plans from active document, indexed files, image inventory, and maintenance tasks.
- [x] Execute missing-link creation, template creation, link rename update, remote image localization, and archive report copy.
- [x] Route dashboard sections to action workbench where appropriate.

### Task 5: Verification And Commit

**Files:**
- All changed files

- [x] Run focused tests.
- [x] Run `npm run lint`.
- [x] Run `npm test`.
- [x] Run `npm run build`.
- [x] Run `npm run e2e`.
- [x] Commit as `feat: add workspace action workbench`.
