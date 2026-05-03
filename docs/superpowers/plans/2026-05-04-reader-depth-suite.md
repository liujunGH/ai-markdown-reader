# Reader Depth Suite Implementation Plan

## Goal

Add seven reader-focused capabilities without turning the app into a project-management or editing surface.

## Tasks

### Task 1: Annotation Overview

- [x] Build annotation overview data from highlights, excerpts, and completed chapters.
- [x] Show the overview in Reading Tools with jump actions.

### Task 2: Fullscreen Table Reading

- [x] Extract Markdown tables from the current document.
- [x] Add a fullscreen table reader with sticky headers and Markdown/CSV copy actions.

### Task 3: Image Sequence Reading

- [x] Extract document images as ordered media items.
- [x] Add previous/next image browsing, path copy, and jump back to source line.

### Task 4: Document Reading Status Card

- [x] Summarize document progress, highlight count, excerpt count, completed chapters, and last-read state.
- [x] Show the status card in Reading Tools.

### Task 5: Longform Chapter Mode

- [x] Build chapter actions from Markdown headings.
- [x] Show completed state and jump actions for current document chapters.

### Task 6: Reading History Search

- [x] Add search and all/unfinished/completed filters to Reading Timeline.
- [x] Preserve open-at-line and scroll restoration behavior.

### Task 7: Reading Snapshots

- [x] Persist snapshots with file, position, scroll, font size, theme, layout, and heading context.
- [x] Restore snapshots from Reading Tools.

### Verification

- [x] Run focused tests.
- [x] Run full lint, tests, build, e2e, and Electron compile.
