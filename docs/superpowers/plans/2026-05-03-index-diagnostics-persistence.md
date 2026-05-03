# Index Diagnostics Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Persist index diagnostics per folder and display the active index policy in the diagnostics panel.

**Architecture:** Add a small storage utility for diagnostics payloads. Keep App as the owner of current diagnostics state. Keep the panel presentational.

**Tech Stack:** React 18, TypeScript, CSS Modules, Vitest + Testing Library, localStorage wrappers.

## Tasks

### Task 1: Diagnostics Storage Utility

**Files:**
- Add: `src/utils/indexDiagnostics.ts`
- Add: `src/__tests__/utils/indexDiagnostics.test.ts`
- Modify: `src/utils/storage.ts`

- [x] Write failing tests for folder-scoped save/load/clear, invalid JSON recovery, and max item trimming.
- [x] Add a storage key pattern to `StorageKey`.
- [x] Implement typed helpers.
- [x] Run `npm test -- src/__tests__/utils/indexDiagnostics.test.ts`.

### Task 2: Panel Policy Display

**Files:**
- Modify: `src/components/IndexDiagnosticsPanel/index.tsx`
- Modify: `src/components/IndexDiagnosticsPanel/IndexDiagnosticsPanel.module.css`
- Modify: `src/__tests__/components/IndexDiagnosticsPanel.test.tsx`
- Modify: `src/utils/searchIndex.ts`

- [x] Write failing tests for max file size, ignored directory names, and saved timestamp rendering.
- [x] Export default skip directory names from `searchIndex.ts`.
- [x] Render policy and timestamp in the panel.
- [x] Run `npm test -- src/__tests__/components/IndexDiagnosticsPanel.test.tsx`.

### Task 3: App Persistence Wiring

**Files:**
- Modify: `src/App.tsx`

- [x] Restore diagnostics when the folder changes.
- [x] Save diagnostics while indexing reports skips and when indexing completes.
- [x] Clear memory and storage from `清空诊断`.
- [x] Run targeted tests and full verification.

### Task 4: Full Verification And Commit

- [x] Run `npm run lint`.
- [x] Run `npm test`.
- [x] Run `npm run build`.
- [x] Run `npm run e2e`.
- [x] Commit with `feat: persist index diagnostics`.
