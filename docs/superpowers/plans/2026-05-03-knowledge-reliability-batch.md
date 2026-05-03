# Knowledge Reliability Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Complete the next reliability batch: immediate reindex after settings changes, index coverage insight, missing-link repair suggestions, image repair suggestions, and a stronger workspace health overview.

**Architecture:** Keep each feature close to the panel that presents it. Shared calculations live in focused utilities (`indexDiagnostics`, `wikiGraph`, `imageInventory`, `knowledgeHealth`) and App only wires data/actions between panels.

**Tech Stack:** React 18, TypeScript, CSS Modules, Vitest + Testing Library, existing Electron preload APIs.

---

## Plan List

1. Add save-and-reindex action plus index coverage report to diagnostics.
2. Add missing-link candidate suggestions and copy/open actions.
3. Add image repair guidance per image row.
4. Add workspace health overview rollup with index and next-action cues.
5. Run full verification and commit.

## Tasks

### Task 1: Index Diagnostics Completion

- [x] Add tests for coverage calculation and save-and-reindex action.
- [x] Extend `IndexDiagnosticsPanel` props with `indexedFileCount` and `onSaveSettingsAndReindex`.
- [x] Render coverage, skipped directory hotspot, and save-and-reindex button.
- [x] Wire App to save settings and rebuild the current folder immediately.

### Task 2: Missing Link Repair Suggestions

- [x] Add tests for candidate generation from indexed files.
- [x] Add `suggestMissingWikiLinkTargets` to `wikiGraph.ts`.
- [x] Render candidate buttons in `MissingLinksPanel`.
- [x] Wire App so candidate clicks open the matching Markdown file.

### Task 3: Image Repair Suggestions

- [x] Add tests for image repair guidance.
- [x] Add `getImageRepairSuggestion` to `imageInventory.ts`.
- [x] Render guidance and copy action in `ImageInventoryPanel`.

### Task 4: Workspace Health Overview

- [x] Add tests for health overview fields.
- [x] Extend `KnowledgeHealthReport` with overview items and next action text.
- [x] Render overview in `KnowledgeHealthPanel`.

### Task 5: Verification

- [x] Run `npm run lint`.
- [x] Run `npm test`.
- [x] Run `npm run build`.
- [x] Run `npm run e2e`.
- [x] Commit with `feat: add knowledge reliability assistants`.

## Self-Review

- Coverage: all five requested follow-up areas have task coverage.
- Placeholder scan: no TBD items remain.
- Type consistency: new props are explicit and App remains the integration boundary.
