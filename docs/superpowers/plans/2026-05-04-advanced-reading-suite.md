# Advanced Reading Suite Implementation Plan

## Goal

Finish the next reader-only upgrade without expanding the app into a general knowledge-management surface. The work stays inside the existing reading tools, renderer, and localStorage-backed state.

## Scope

### Task 1: Annotation Export And Metadata

- [x] Add utility support for Markdown annotation export.
- [x] Add color/tag metadata updates for saved reader marks.
- [x] Cover export and metadata behavior with unit tests.

### Task 2: Chapter Completion And Focus Reading

- [x] Persist completed chapters by document and heading line.
- [x] Add focus timers that can enter the existing focus mode.
- [x] Add timer expiry cleanup.

### Task 3: Media, Comparison, And Accessibility

- [x] Add image/table navigation entry points in Reading Tools.
- [x] Wrap rendered tables in accessible scroll regions.
- [x] Sync split comparison pane by current reading progress.
- [x] Add reader accessibility settings for line height, letter spacing, paragraph spacing, TTS speed, reduced motion, and high-contrast highlights.

### Task 4: App Integration

- [x] Wire all new actions into `App.tsx`.
- [x] Persist new reader state with typed storage keys.
- [x] Pass accessibility style and TTS rate to `MarkdownRenderer`.

### Task 5: Verification And Docs

- [x] Update focused component and utility tests.
- [x] Update README feature documentation.
- [x] Run full verification before commit.
