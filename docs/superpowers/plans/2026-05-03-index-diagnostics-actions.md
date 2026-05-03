# Index Diagnostics Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Make the index diagnostics panel actionable so skipped index items can be filtered, copied, revealed in Finder, cleared, and re-scanned from one place.

**Architecture:** Keep diagnostics UI contained in `IndexDiagnosticsPanel`, using existing `IndexSkippedItem` data from `searchIndex.ts`. `App.tsx` owns the saved skipped-item list and passes clear/reindex callbacks into the panel. Platform actions use existing browser clipboard and `window.electronAPI.showInFolder`.

**Tech Stack:** React 18, TypeScript, CSS Modules, Vitest + Testing Library, Electron preload API.

---

## Spec

The index diagnostics feature should cover a full user recovery loop:

1. User can open the diagnostics panel after indexing and inspect every skipped item.
2. User can filter skipped items by reason: all, ignored directory, large file, read error.
3. User can copy an item path.
4. User can reveal an item in Finder through the existing `showInFolder` IPC bridge.
5. User can clear the saved diagnostics list when it is no longer useful.
6. User can trigger a fresh re-scan from the same panel.
7. Empty state must remain useful and allow re-scan.

## File Structure

- Modify `src/components/IndexDiagnosticsPanel/index.tsx`
  - Owns reason filter state.
  - Renders filter controls and item actions.
  - Calls `navigator.clipboard.writeText` and `window.electronAPI.showInFolder`.
  - Calls `onClear` from App.

- Modify `src/components/IndexDiagnosticsPanel/IndexDiagnosticsPanel.module.css`
  - Adds filter bar and compact row actions.
  - Keeps layout consistent with existing operational panels.

- Modify `src/__tests__/components/IndexDiagnosticsPanel.test.tsx`
  - Covers filtering, copy path, reveal in Finder, clear list, and disabled states.

- Modify `src/App.tsx`
  - Passes `onClear={() => setIndexSkippedItems([])}` into diagnostics panel.

## Tasks

### Task 1: Filtering

**Files:**
- Modify: `src/components/IndexDiagnosticsPanel/index.tsx`
- Modify: `src/components/IndexDiagnosticsPanel/IndexDiagnosticsPanel.module.css`
- Test: `src/__tests__/components/IndexDiagnosticsPanel.test.tsx`

- [x] **Step 1: Write the failing test**

Add a test that renders three skipped items, clicks the `文件过大` filter, and expects only the large-file item to remain visible.

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/components/IndexDiagnosticsPanel.test.tsx`

Expected: FAIL because no filter controls exist.

- [x] **Step 3: Implement minimal filter state**

Add a `reasonFilter` state in `IndexDiagnosticsPanel`, render four filter buttons, and map the list from `filteredItems`.

- [x] **Step 4: Verify**

Run: `npm test -- src/__tests__/components/IndexDiagnosticsPanel.test.tsx`

Expected: PASS for the new filtering test.

### Task 2: Item Actions

**Files:**
- Modify: `src/components/IndexDiagnosticsPanel/index.tsx`
- Modify: `src/components/IndexDiagnosticsPanel/IndexDiagnosticsPanel.module.css`
- Test: `src/__tests__/components/IndexDiagnosticsPanel.test.tsx`

- [x] **Step 1: Write the failing tests**

Add tests that click `复制路径 large.md` and `在 Finder 中显示 large.md`, asserting clipboard and `showInFolder` are called with the item path.

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/components/IndexDiagnosticsPanel.test.tsx`

Expected: FAIL because the buttons do not exist.

- [x] **Step 3: Implement row actions**

Render two buttons on every skipped item:
- `复制路径 ${item.name}` calls `navigator.clipboard.writeText(item.path)`
- `在 Finder 中显示 ${item.name}` calls `window.electronAPI?.showInFolder(item.path)`

- [x] **Step 4: Verify**

Run: `npm test -- src/__tests__/components/IndexDiagnosticsPanel.test.tsx`

Expected: PASS for action tests.

### Task 3: Clear Diagnostics

**Files:**
- Modify: `src/components/IndexDiagnosticsPanel/index.tsx`
- Modify: `src/App.tsx`
- Test: `src/__tests__/components/IndexDiagnosticsPanel.test.tsx`

- [x] **Step 1: Write the failing test**

Add a test that clicks `清空诊断` and expects `onClear` to be called.

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/components/IndexDiagnosticsPanel.test.tsx`

Expected: FAIL because `onClear` is not a prop and no clear button exists.

- [x] **Step 3: Implement clear callback**

Add `onClear` to panel props, render a `清空诊断` button disabled when there are no skipped items, and pass `onClear={() => setIndexSkippedItems([])}` from `App.tsx`.

- [x] **Step 4: Verify**

Run: `npm test -- src/__tests__/components/IndexDiagnosticsPanel.test.tsx`

Expected: PASS.

### Task 4: Full Verification And Commit

**Files:**
- All files touched above.

- [x] **Step 1: Run targeted tests**

Run: `npm test -- src/__tests__/components/IndexDiagnosticsPanel.test.tsx`

Expected: PASS.

- [x] **Step 2: Run full verification**

Run:

```bash
npm run lint
npm test
npm run build
npm run e2e
```

Expected:
- TypeScript passes.
- Full Vitest suite passes.
- Production build succeeds.
- Playwright e2e passes.

- [x] **Step 3: Commit**

```bash
git add docs/superpowers/plans/2026-05-03-index-diagnostics-actions.md src/App.tsx src/components/IndexDiagnosticsPanel src/__tests__/components/IndexDiagnosticsPanel.test.tsx
git commit -m "feat: add actionable index diagnostics"
```

## Self-Review

- Spec coverage: filtering, copying, reveal in Finder, clearing, and re-scan are covered.
- Placeholder scan: no TBD or vague implementation steps remain.
- Type consistency: `IndexSkippedItem`, `onClear`, and existing `showInFolder` API names match the current codebase.
