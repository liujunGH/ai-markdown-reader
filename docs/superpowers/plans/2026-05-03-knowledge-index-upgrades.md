# Knowledge Index Upgrades Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make large-folder indexing observable and cancellable, and close the WikiLink loop by showing missing links with one-click document creation.

**Architecture:** Keep indexing logic in `src/utils/searchIndex.ts` and expose progress through callbacks so UI code stays thin. Extend `src/utils/wikiGraph.ts` with missing-link analysis and add a small panel component that calls App-level file creation/opening handlers.

**Tech Stack:** Electron IPC, React 18, TypeScript, IndexedDB, Vitest, Playwright.

---

### Task 1: Index Progress And Cancellation

**Files:**
- Modify: `src/utils/searchIndex.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/GlobalSearch/index.tsx`
- Modify: `src/components/MarkdownGraphPanel/index.tsx`
- Test: `src/__tests__/utils/searchIndex.test.ts`

- [ ] Add tests for skipped directories, progress callbacks, skipped large files, and cancellation.
- [ ] Add `IndexProgress`, `IndexFolderOptions`, and cancellable recursive scanning.
- [ ] Store indexing status in `App.tsx`, schedule background indexing without blocking folder open, and expose cancel/reindex controls.
- [ ] Display progress in global search and graph panels.

### Task 2: Missing WikiLink Panel

**Files:**
- Modify: `src/utils/wikiGraph.ts`
- Create: `src/components/MissingLinksPanel/index.tsx`
- Create: `src/components/MissingLinksPanel/MissingLinksPanel.module.css`
- Modify: `src/App.tsx`
- Modify: `src/stores/uiStore.ts`
- Modify: `src/i18n/locales/zh-CN.json`
- Modify: `src/i18n/locales/en.json`
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`
- Modify: `src/types/electron.d.ts`
- Test: `src/__tests__/utils/wikiGraph.test.ts`
- Test: `e2e/reading-flow.spec.ts`

- [ ] Add tests for missing WikiLinks, including legacy display/target order.
- [ ] Add a safe `write-file` IPC for creating new Markdown files.
- [ ] Add the panel with grouped missing links and a create button.
- [ ] Wire the tools menu and command palette to open the panel.
- [ ] Add E2E coverage for detecting and creating a missing note.

### Task 3: Verification

**Files:**
- No new files.

- [ ] Run `npm run electron:compile`.
- [ ] Run `npm run lint`.
- [ ] Run `npm test`.
- [ ] Run `npm run e2e`.
- [ ] Run `npm run build`.
