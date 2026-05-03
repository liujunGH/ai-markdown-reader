# Reading Experience Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add seven reader-focused features without expanding the app into a heavy knowledge management system.

**Architecture:** Keep the feature as a single Reading Tools panel plus small renderer hooks. Persist reader data in localStorage, keep transformations in pure utilities, and use existing panel/menu/command patterns.

**Tech Stack:** React 18, TypeScript, CSS Modules, Vitest, Testing Library, localStorage wrappers.

---

### Task 1: Reading Experience Utilities

**Files:**
- Create: `src/utils/readingExperience.ts`
- Test: `src/__tests__/utils/readingExperience.test.ts`

- [x] Write failing tests for highlights, excerpts, read-later queue, resume point, presets, landmarks, and layout modes.
- [x] Run `npm test -- src/__tests__/utils/readingExperience.test.ts` and confirm RED.
- [x] Implement the utility functions.
- [x] Run the utility test and confirm GREEN.

### Task 2: Reading Tools Panel

**Files:**
- Create: `src/components/ReadingToolsPanel/index.tsx`
- Create: `src/components/ReadingToolsPanel/ReadingToolsPanel.module.css`
- Test: `src/__tests__/components/ReadingToolsPanel.test.tsx`

- [x] Write failing component tests for all seven reader sections and handlers.
- [x] Run `npm test -- src/__tests__/components/ReadingToolsPanel.test.tsx` and confirm RED.
- [x] Implement the panel UI using compact sections, buttons, segmented controls, and lists.
- [x] Run the component test and confirm GREEN.

### Task 3: Renderer Hooks

**Files:**
- Modify: `src/components/MarkdownRenderer/index.tsx`
- Modify: `src/components/MarkdownRenderer/MarkdownRenderer.module.css`
- Test: `src/__tests__/components/MarkdownRenderer.test.tsx`

- [x] Add a failing test that selected text calls `onTextSelect`.
- [x] Add a failing test that stored highlight text is rendered as reader highlights.
- [x] Implement selection reporting and stored highlight rendering.
- [x] Run renderer tests and confirm GREEN.

### Task 4: App Integration

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/stores/uiStore.ts`
- Modify: `src/utils/storage.ts`
- Modify: `src/components/CommandPalette/index.tsx`
- Modify: `src/styles/app.module.css`

- [x] Add `readingTools` panel state and command palette entry.
- [x] Load/persist highlights, excerpts, read-later items, active reading preset, and layout mode.
- [x] Add toolbar menu entry for Reading Tools.
- [x] Wire renderer selection, highlight display, panel callbacks, quick navigation, resume point, and layout classes.

### Task 5: Documentation And Verification

**Files:**
- Modify: `README.md`
- All changed files

- [x] Document the reading-focused features.
- [x] Run focused tests.
- [x] Run `npm run lint`.
- [x] Run `npm test`.
- [x] Run `npm run build`.
- [x] Run `npm run e2e`.
- [x] Commit as `feat: add reader experience tools`.
