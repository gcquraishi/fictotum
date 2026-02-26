# Keyboard Shortcuts Testing Guide - Phase 3.1.3

## Overview
This document describes how to test the keyboard shortcuts implementation for graph navigation.

## Test Setup
1. Navigate to any figure page with a graph (e.g., `/figure/Q517` for Napoleon)
2. Ensure bloom mode is enabled (`NEXT_PUBLIC_BLOOM_MODE=true`)
3. Open browser console to see debug logs

## Keyboard Shortcuts to Test

### Navigation Shortcuts

#### 1. Back Navigation (B or ←)
- **Keys**: `B` or `Left Arrow`
- **Expected Behavior**:
  - Navigates to previous node in exploration history
  - Re-expands the previous node if needed
  - Collapses forward nodes from history
  - Button flashes with amber ring for 300ms
  - Disabled when at beginning of history
- **Test Steps**:
  1. Click on several nodes to build history (3-4 nodes)
  2. Press `B` or `←`
  3. Verify camera centers on previous node
  4. Verify back button highlights briefly
  5. Continue pressing until disabled

#### 2. Forward Navigation (F or →)
- **Keys**: `F` or `Right Arrow`
- **Expected Behavior**:
  - Navigates to next node in exploration history
  - Only works after going back
  - Re-expands the forward node if needed
  - Button flashes with amber ring for 300ms
  - Disabled when at most recent position
- **Test Steps**:
  1. Build history, then press back 2-3 times
  2. Press `F` or `→`
  3. Verify camera centers on next node
  4. Verify forward button highlights briefly
  5. Continue until disabled

#### 3. Reset View (R)
- **Keys**: `R`
- **Expected Behavior**:
  - Returns to starting node
  - Clears all exploration history except start
  - Reloads fresh neighbors of starting node
  - Button flashes with amber ring for 300ms
- **Test Steps**:
  1. Click on several nodes to explore deeply
  2. Press `R`
  3. Verify view resets to starting configuration
  4. Verify reset button highlights briefly
  5. Verify only starting node and its neighbors visible

#### 4. Collapse Selected Node (Esc)
- **Keys**: `Escape`
- **Expected Behavior**:
  - Collapses the currently expanded node
  - Removes its children from the graph
  - Only works when a node is expanded
  - No visual feedback (node collapses)
- **Test Steps**:
  1. Click on a node to expand it
  2. Press `Esc`
  3. Verify the node's children disappear
  4. Press `Esc` again (should do nothing if no node selected)

### Help Panel Shortcuts

#### 5. Toggle Help Panel (? or H)
- **Keys**: `?` or `H`
- **Expected Behavior**:
  - Opens/closes keyboard shortcuts help modal
  - Modal shows all available shortcuts
  - Help button changes color when panel is open
  - Can also be toggled by clicking the help button
- **Test Steps**:
  1. Press `?` or `H`
  2. Verify modal appears with shortcuts list
  3. Press `?` or `H` again to close
  4. Verify modal disappears
  5. Click the help button (?) to toggle

#### 6. Close Help Panel (Esc)
- **Keys**: `Escape`
- **Expected Behavior**:
  - Closes help panel if it's open
  - Takes priority over node collapse
- **Test Steps**:
  1. Open help panel with `?`
  2. Press `Esc`
  3. Verify help panel closes
  4. Press `Esc` again to collapse node

## Input Field Exclusion Tests

### 7. Shortcuts Disabled in Input Fields
- **Expected Behavior**: Shortcuts don't fire when typing in input fields
- **Test Steps**:
  1. Click on search input in navbar (if present)
  2. Try typing `R`, `B`, `F`, `H`, `?`
  3. Verify letters appear in input, no navigation occurs
  4. Click outside input field
  5. Try shortcuts again - should work

## Visual Feedback Tests

### 8. Button Highlight Animation
- **Expected Behavior**: Buttons briefly show amber ring when shortcuts are used
- **Test Steps**:
  1. Press `B` - watch back button
  2. Press `F` - watch forward button
  3. Press `R` - watch reset button
  4. Verify 300ms flash with `ring-2 ring-amber-400` effect

### 9. Help Button State
- **Expected Behavior**: Help button changes color when panel is open
- **Test Steps**:
  1. Press `?` to open help
  2. Verify help button has amber background
  3. Press `?` to close
  4. Verify help button returns to white background

## Edge Cases

### 10. Multiple Rapid Key Presses
- **Test**: Press `B` multiple times rapidly
- **Expected**: Each press navigates back (if history available)
- **Note**: Visual feedback may overlap but should not break state

### 11. Conflicting Shortcuts
- **Test**: Press `Esc` with both help panel open AND node expanded
- **Expected**: Help panel closes first (has priority)
- **Test Again**: Press `Esc` with only node expanded
- **Expected**: Node collapses

### 12. Modifier Keys
- **Test**: Press `Ctrl+R`, `Cmd+H`, `Ctrl+B`
- **Expected**: Browser defaults work, shortcuts don't fire
- **Note**: `Ctrl+R` refreshes page, shortcuts check for modifiers

## Browser Compatibility

Test in:
- Chrome/Edge (Chromium)
- Firefox
- Safari

Known issues:
- Safari may have different keyboard event handling
- Mobile browsers don't have keyboard shortcuts (expected)

## Accessibility

### 13. Screen Reader Support
- Help panel has proper ARIA attributes
- Buttons have descriptive `aria-label` attributes
- Modal has `role="dialog"` and `aria-modal="true"`

### 14. Focus Management
- Test Tab navigation through buttons
- Verify focus visible on keyboard navigation
- Help panel should trap focus when open

## Success Criteria

All shortcuts must:
- Fire only when appropriate (not in inputs)
- Respect button disabled states
- Provide visual feedback (buttons or modal)
- Clean up event listeners on unmount
- Not conflict with browser shortcuts
- Work with both primary and alternate keys

## Common Issues

1. **Shortcuts not working**: Check bloom mode is enabled
2. **Shortcuts firing in search**: Bug - should be disabled in inputs
3. **No visual feedback**: Check CSS classes are applied correctly
4. **Memory leaks**: Verify `removeEventListener` in cleanup
5. **Console errors**: Check `navigateBack`/`navigateForward` dependencies

## Performance

- Event listener should not cause lag
- Visual feedback timeout should clear properly
- No memory leaks after multiple uses
- Modal renders quickly without jank
