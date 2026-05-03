# Reading Flow Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the seven requested reader-first follow-ups: sidebar reading tools, mark jumping, reading sessions, chapter progress, focus bar, reading stats, and keyboard reading mode.

**Architecture:** Extend the existing Reading Tools panel and readingExperience utilities. Keep state in localStorage-backed arrays, wire lightweight App-level handlers, and avoid turning the reader into an editor.

**Tech Stack:** React 18, TypeScript, CSS Modules, Vitest, Testing Library.

---

### Task 1: Reading Flow Utility Layer

**Files:**
- Modify: `src/utils/readingExperience.ts`
- Modify: `src/__tests__/utils/readingExperience.test.ts`

- [x] Add failing tests for reading sessions, aggregate stats, chapter progress, and keyboard action normalization.
- [x] Implement pure utility functions and types.
- [x] Run `npm test -- src/__tests__/utils/readingExperience.test.ts`.

### Task 2: Sidebar Reading Tools And Jump Actions

**Files:**
- Modify: `src/components/ReadingToolsPanel/index.tsx`
- Modify: `src/components/ReadingToolsPanel/ReadingToolsPanel.module.css`
- Modify: `src/__tests__/components/ReadingToolsPanel.test.tsx`

- [x] Add sidebar mode and jump buttons for highlights/excerpts.
- [x] Add session/stat/chapter progress sections.
- [x] Run component tests.

### Task 3: App Integration And Focus Bar

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles/app.module.css`
- Modify: `src/utils/storage.ts`

- [x] Persist reading sessions and compute stats/chapter progress.
- [x] Render Reading Tools as a right sidebar.
- [x] Add focus-mode floating bar.
- [x] Add keyboard reading mode for J/K/H/L/M/B.

### Task 4: Documentation And Verification

**Files:**
- Modify: `README.md`
- All changed files

- [x] Update reader feature documentation.
- [x] Run focused tests.
- [x] Run `npm run lint`.
- [x] Run `npm test`.
- [x] Run `npm run build`.
- [x] Run `npm run e2e`.
- [x] Commit as `feat: polish reader flow tools`.
