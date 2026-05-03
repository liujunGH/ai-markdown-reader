# Configurable Index Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Let users configure index file-size limits and extra ignored directories from the index diagnostics panel, then apply those settings to future folder indexing.

**Architecture:** Add a focused `indexSettings` utility that owns defaults, validation, localStorage persistence, and conversion to the existing index policy shape. Keep `App.tsx` as the owner of active settings and indexing behavior. Extend `IndexDiagnosticsPanel` as a presentational editor that emits settings changes and reuses the existing re-scan action.

**Tech Stack:** React 18, TypeScript, CSS Modules, Vitest + Testing Library, existing localStorage wrappers.

---

## Plan List

1. Add persistent index settings helpers.
2. Add tests for validation, normalization, reset, and effective policy conversion.
3. Add editable controls to the index diagnostics panel.
4. Wire saved settings into `App.tsx` so indexing uses them.
5. Verify with targeted tests, lint, full tests, production build, and E2E.
6. Commit the completed batch.

## Files

- Add `src/utils/indexSettings.ts`
  - Stores `maxFileSizeMb` and `extraSkipDirectoryNames`.
  - Validates max file size within a conservative range.
  - Normalizes directory names, removes duplicates, and ignores default directories.

- Add `src/__tests__/utils/indexSettings.test.ts`
  - Covers default load, save/load roundtrip, invalid payload recovery, normalization, and reset.

- Modify `src/utils/storage.ts`
  - Adds the exact `index-settings` key.

- Modify `src/components/IndexDiagnosticsPanel/index.tsx`
  - Renders max-size input, extra ignored directory textarea, save/reset actions, and a re-scan hint.

- Modify `src/components/IndexDiagnosticsPanel/IndexDiagnosticsPanel.module.css`
  - Adds compact settings form styles.

- Modify `src/__tests__/components/IndexDiagnosticsPanel.test.tsx`
  - Covers editing settings, saving, resetting, and preserving existing diagnostics actions.

- Modify `src/App.tsx`
  - Loads settings on startup.
  - Uses configured `maxFileSizeBytes` and `skipDirectoryNames` when scanning.
  - Updates panel policy from active settings.

## Task 1: Storage Utility

- [x] Write failing tests in `src/__tests__/utils/indexSettings.test.ts`.
- [x] Add `index-settings` to `ExactStorageKey`.
- [x] Implement `loadIndexSettings`, `saveIndexSettings`, `resetIndexSettings`, and `getEffectiveIndexPolicy`.
- [x] Run `npm test -- src/__tests__/utils/indexSettings.test.ts`.

## Task 2: Panel Settings UI

- [x] Extend component tests to expect editable max-size and extra-directory controls.
- [x] Add controlled draft state to `IndexDiagnosticsPanel`.
- [x] Emit `onSaveSettings(nextSettings)` and `onResetSettings()`.
- [x] Run `npm test -- src/__tests__/components/IndexDiagnosticsPanel.test.tsx`.

## Task 3: App Integration

- [x] Load index settings state in `App.tsx`.
- [x] Replace the hard-coded max size and default-only policy with `getEffectiveIndexPolicy(indexSettings)`.
- [x] Pass settings callbacks into the diagnostics panel.
- [x] Make save/reset show a toast and keep the panel policy updated.

## Task 4: Verification And Commit

- [x] Run `npm run lint`.
- [x] Run `npm test`.
- [x] Run `npm run build`.
- [x] Run `npm run e2e`.
- [x] Commit with `feat: add configurable index settings`.

## Self-Review

- Spec coverage: every requested list item maps to a concrete task.
- Placeholder scan: no TBD/TODO placeholders remain.
- Type consistency: settings use `IndexSettings`, panel receives `settings`, `onSaveSettings`, and `onResetSettings`.
