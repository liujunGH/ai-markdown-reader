# AI Markdown Reader - Enhancement Plan

## Phase 0: Documentation Discovery

### Project Structure
- **Main App**: `src/App.tsx` - Main layout with header, content, sidebar, overlays
- **Theme System**: `src/context/ThemeContext.tsx` + `src/styles/global.css` with CSS custom properties
- **UI Toggle Pattern**: React state + conditional rendering (e.g., `showSearch && <SearchBox />`)
- **Keyboard Handling**: `handleKeyDown` in `App.tsx` useEffect

### Existing Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + F` | Toggle search |
| `Cmd/Ctrl + S` | Toggle source view |
| `Cmd/Ctrl + P` | Print |
| `Cmd/Ctrl + =/+` | Increase font size |
| `Cmd/Ctrl + -` | Decrease font size |
| `Escape` | Close overlays |
| `F11` | Toggle fullscreen |

---

## Phase 1: Keyboard Shortcuts Help Panel

### What to implement
Create a `KeyboardShortcuts` component that displays all available shortcuts in a modal overlay.

### Files to create
- `src/components/KeyboardShortcuts/index.tsx` - Modal component
- `src/components/KeyboardShortcuts/KeyboardShortcuts.module.css` - Styles

### Implementation
1. Create component with a list of all shortcuts (organized by category: Navigation, Editing, View)
2. Add toggle button to Header (next to ThemeToggle, show "?" or "⌨" icon)
3. Add `showKeyboardShortcuts` state in App.tsx
4. Toggle via button click or `Cmd/Ctrl + /` or `F1`
5. Close on Escape or clicking backdrop

### Shortcuts to display
**Navigation:**
- `Cmd/Ctrl + F` - Search
- `Cmd/Ctrl + S` - Toggle source view
- `Escape` - Close overlay

**View:**
- `Cmd/Ctrl + =` / `Cmd/Ctrl + +` - Increase font size
- `Cmd/Ctrl + -` - Decrease font size
- `F11` - Toggle fullscreen
- `Cmd/Ctrl + P` - Print
- `Cmd/Ctrl + O` - Open file

**Focus Mode:**
- `Cmd/Ctrl + .` - Toggle focus mode (new)

### Verification
- [ ] Component renders correctly
- [ ] All shortcuts listed
- [ ] Toggle via button works
- [ ] Escape closes modal
- [ ] `Cmd/Ctrl + /` or `F1` opens panel

---

## Phase 2: Focus Mode Optimization

### What to implement
A mode that hides all UI chrome (header, sidebar, status bar) to provide an immersive reading experience.

### Files to modify
- `src/App.tsx` - Add `showFocusMode` state and conditional rendering
- `src/styles/global.css` - Add focus mode styles

### Implementation
1. Add `showFocusMode` state in App.tsx
2. Add keyboard shortcut `Cmd/Ctrl + .` to toggle
3. Add "Focus" button in Header (with eye/expand icon) - visible but fades when in focus mode
4. When `showFocusMode=true`:
   - Hide header (or auto-hide after 2s of no mouse movement)
   - Hide sidebar (Outline)
   - Hide status bar
   - Show only markdown content
5. Show a subtle exit hint on mouse move or edge hover

### Focus Mode Styles (global.css)
```css
body.focus-mode header,
body.focus-mode .sidebar,
body.focus-mode .status-bar {
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

body.focus-mode:hover header,
body.focus-mode .sidebar,
body.focus-mode .status-bar {
  opacity: 1;
  pointer-events: auto;
}

body.focus-mode header {
  position: fixed;
  top: 0;
  z-index: 100;
  background: var(--bg-primary);
}
```

### Verification
- [ ] `Cmd/Ctrl + .` toggles focus mode
- [ ] All UI chrome hides
- [ ] Moving mouse to top edge shows header
- [ ] Pressing `Escape` or clicking exit hint exits focus mode

---

## Phase 3: Custom Theme Colors

### What to implement
Let users select an accent color that persists across light/dark themes.

### Files to modify
- `src/context/ThemeContext.tsx` - Add accent color state
- `src/styles/global.css` - Use accent color CSS variable
- `src/components/ThemeToggle/` - Add color picker dropdown

### Implementation
1. **ThemeContext**: Add `accentColor` state (default: system accent or blue `#0066cc`)
2. **Color Options**: Provide 6-8 preset colors:
   - Blue (#0066cc) - Default
   - Green (#00a86b)
   - Purple (#8b5cf6)
   - Orange (#f97316)
   - Pink (#ec4899)
   - Teal (#14b8a6)
3. **UI**: Dropdown popover from ThemeToggle button showing color swatches
4. **Storage**: Persist to localStorage
5. **Application**: Set as CSS variable `--accent` on `<html>`

### ThemeContext changes
```tsx
interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
}
```

### Verification
- [ ] Color picker shows 6+ color options
- [ ] Clicking color updates theme immediately
- [ ] Color persists across page refresh
- [ ] Both light and dark themes use the selected accent color

---

## Phase 4: Verification

### Build & Runtime
- [ ] `npm run build` succeeds
- [ ] No console errors
- [ ] All three features work correctly

### Integration Tests
1. Open any .md file
2. Press `Cmd/Ctrl + /` - shortcuts panel appears
3. Press `Escape` - panel closes
4. Press `Cmd/Ctrl + .` - focus mode activates, UI hides
5. Move mouse to top - header appears
6. Press `Escape` - focus mode exits
7. Click theme toggle - color picker appears
8. Select different color - accent changes immediately
9. Refresh page - all settings persist

---

## Anti-Patterns to Avoid
- Don't add third-party UI libraries (keep bundle small)
- Don't modify existing component styles that aren't being enhanced
- Don't use `!important` in CSS (use specificity correctly)
- Don't store theme in global window variables (use React Context)
