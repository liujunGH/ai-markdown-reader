# Maintenance Workflow Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an end-to-end maintenance workflow that turns existing diagnostics into actionable tasks and a release-ready preflight report.

**Architecture:** Keep diagnostics as pure utilities, then expose them through focused overlay panels wired into the existing toolbar and command palette. Reuse current app state for missing links, image inventory, document health, index diagnostics, and knowledge health instead of adding a new store.

**Tech Stack:** React 18, TypeScript, CSS Modules, Vitest, Testing Library.

---

### Task 1: Maintenance Task Utility

**Files:**
- Create: `src/utils/maintenanceTasks.ts`
- Test: `src/__tests__/utils/maintenanceTasks.test.ts`

- [x] **Step 1: Write failing utility tests**

Cover task generation from missing links, image issues, index skipped items, and document health issues. Verify severity sorting and Markdown formatting.

- [x] **Step 2: Run utility test and confirm RED**

Run: `npm test -- src/__tests__/utils/maintenanceTasks.test.ts`
Expected: FAIL because `maintenanceTasks.ts` does not exist yet.

- [x] **Step 3: Implement utility**

Create strongly typed task builders with stable task IDs and a Markdown formatter for copy/export.

- [x] **Step 4: Run utility test and confirm GREEN**

Run: `npm test -- src/__tests__/utils/maintenanceTasks.test.ts`
Expected: PASS.

### Task 2: Maintenance Queue Panel

**Files:**
- Create: `src/components/MaintenanceQueuePanel/index.tsx`
- Create: `src/components/MaintenanceQueuePanel/MaintenanceQueuePanel.module.css`
- Test: `src/__tests__/components/MaintenanceQueuePanel.test.tsx`

- [x] **Step 1: Write failing component tests**

Cover summary counts, per-task action, copy action, and local “mark done” behavior.

- [x] **Step 2: Run component test and confirm RED**

Run: `npm test -- src/__tests__/components/MaintenanceQueuePanel.test.tsx`
Expected: FAIL because the component does not exist yet.

- [x] **Step 3: Implement panel**

Build an overlay panel with task summary, filtered visible tasks, per-task action buttons, mark-done buttons, and copy button.

- [x] **Step 4: Run component test and confirm GREEN**

Run: `npm test -- src/__tests__/components/MaintenanceQueuePanel.test.tsx`
Expected: PASS.

### Task 3: Release Preflight Report

**Files:**
- Create: `src/utils/releasePreflight.ts`
- Create: `src/components/ReleasePreflightPanel/index.tsx`
- Create: `src/components/ReleasePreflightPanel/ReleasePreflightPanel.module.css`
- Test: `src/__tests__/utils/releasePreflight.test.ts`
- Test: `src/__tests__/components/ReleasePreflightPanel.test.tsx`

- [x] **Step 1: Write failing tests**

Cover pass/warning/fail report status, Markdown formatting, panel check rendering, copy report, and opening maintenance queue.

- [x] **Step 2: Run tests and confirm RED**

Run: `npm test -- src/__tests__/utils/releasePreflight.test.ts src/__tests__/components/ReleasePreflightPanel.test.tsx`
Expected: FAIL because utility and panel do not exist yet.

- [x] **Step 3: Implement utility and panel**

Use existing knowledge health score, maintenance task counts, and index coverage to produce a deterministic preflight report.

- [x] **Step 4: Run tests and confirm GREEN**

Run: `npm test -- src/__tests__/utils/releasePreflight.test.ts src/__tests__/components/ReleasePreflightPanel.test.tsx`
Expected: PASS.

### Task 4: App Integration

**Files:**
- Modify: `src/stores/uiStore.ts`
- Modify: `src/App.tsx`

- [x] **Step 1: Add UI store panel flags**

Add `maintenanceQueue` and `releasePreflight` panel names and state flags.

- [x] **Step 2: Wire data and handlers**

Build task/report memo values, add copy handlers, and route each task action to the correct existing panel.

- [x] **Step 3: Add toolbar and command palette entries**

Expose “待处理队列” and “发布前检查” from the inspection tools menu and command palette.

- [x] **Step 4: Render panels**

Lazy-load both new panels and render them with current diagnostics.

### Task 5: Verification And Commit

**Files:**
- All changed files

- [x] **Step 1: Run focused tests**

Run all new test files.

- [x] **Step 2: Run full verification**

Run: `npm run lint`, `npm test`, `npm run build`, `npm run e2e`.

- [x] **Step 3: Commit**

Commit with message: `feat: add maintenance workflow panels`.
