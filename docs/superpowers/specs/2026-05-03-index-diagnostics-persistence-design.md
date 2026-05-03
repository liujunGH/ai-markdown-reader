# Index Diagnostics Persistence Design

## Goal

Make index diagnostics useful across app restarts and make the active indexing rules visible in the same panel. A user who sees missing search, backlink, or graph results should be able to answer two questions without rebuilding immediately:

1. What did the last index skip in this folder?
2. Which index rules caused those skips?

## Design

Diagnostics are persisted per folder in localStorage under a folder-scoped key. The payload stores the folder path, skipped items, and an `updatedAt` timestamp. The app restores diagnostics when the current folder changes, updates them while indexing runs, saves them when indexing finishes, and clears the saved payload when the user clicks `清空诊断`.

The diagnostics panel also receives a compact policy object:

- maximum indexed file size
- default skipped directory names

The panel renders this policy above the skipped-item list. It stays informational only in this iteration; editing the policy would be a separate settings feature because it changes index behavior and needs deeper validation.

## Components

- `src/utils/indexDiagnostics.ts`
  - Owns storage key generation, payload validation, and max persisted item count.
  - Exposes load/save/clear helpers and a policy formatter.

- `src/App.tsx`
  - Restores diagnostics for the active folder.
  - Saves diagnostics after index completion.
  - Clears both memory and storage from the panel action.

- `src/components/IndexDiagnosticsPanel`
  - Displays policy details and the saved timestamp.
  - Keeps existing filtering, copy, reveal, clear, and re-scan actions.

## Error Handling

Storage failures are non-fatal. Invalid JSON, wrong folder payloads, or malformed skipped items load as an empty diagnostic state. This avoids startup crashes and stale cross-folder diagnostics.

## Testing

- Unit tests cover diagnostics storage roundtrip, folder isolation, invalid payload recovery, max item trimming, and policy formatting.
- Component tests cover policy rendering and timestamp display.
- Full verification uses lint, unit tests, production build, and Playwright e2e.

## Self-Review

- No placeholders remain.
- Scope is limited to visibility and persistence, not editable settings.
- The data flow is one-way and folder-scoped, so diagnostics cannot leak between folders.
