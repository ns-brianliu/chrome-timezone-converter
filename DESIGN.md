# Chrome Extension: Timezone Converter Design & Plan

## Overview
A Chrome extension that detects time strings on web pages upon hover and displays a floating tooltip with the time converted to user-selected timezones.

## Architecture (Manifest V3)

### Core Components
1.  **Content Script**: 
    - Handles user interaction (hover events).
    - Scans text under the cursor.
    - Parses date/time strings.
    - Injects and positions the floating tooltip.
2.  **Options Page**: 
    - UI for users to select their target timezones (e.g., UTC, PST, JST).
    - Saves preferences using `chrome.storage.sync`.
3.  **Background Service Worker**: 
    - (Optional) May be used for more complex processing if needed, but logic currently fits within the content script.
4.  **Libraries**: 
    - `luxon` (or similar) for robust date parsing and timezone conversion.

## User Interaction Flow
1.  User hovers cursor over text (e.g., `2026-01-08 00:49:28 PST`).
2.  **Debounce**: System waits for a short pause to avoid flickering.
3.  **Detection**: Extension identifies the text node under the cursor and extracts the surrounding text.
4.  **Parsing**: Regex and Date logic determine if a valid date exists.
5.  **Conversion**: Valid dates are converted to the user's preferred timezones.
6.  **Display**: A tooltip appears near the cursor. Moving the mouse away removes the tooltip.

## Implementation Plan

### Phase 1: Scaffold & Manifest
- Initialize project structure (`src/`, `icons/`, `manifest.json`).
- Configure Manifest V3 permissions (`storage`, `activeTab` - though `activeTab` might be insufficient for automatic hover, so `host_permissions` for `<all_urls>` or specific matches will be needed for the content script).

### Phase 2: Date Detection Engine
- Implement "Hover Inspector" using `document.caretRangeFromPoint` / `document.caretPositionFromPoint`.
- Develop robust Regex patterns to support a wide range of formats:
    - **Target Format**: `YYYY-MM-DD HH:mm:ss ZZZ` (e.g., `2026-01-08 00:49:28 PST`)
    - **ISO-8601**: `YYYY-MM-DDTHH:mm:ss` (with/without Z or offset)
    - **Slash Format**: `MM/DD/YYYY HH:mm:ss`, `YYYY/MM/DD HH:mm`
    - **RFC 2822**: `Thu, 08 Jan 2026 00:49:28 +0000`
    - **Common Log**: `08/Jan/2026:00:49:28 +0000`
- **Strategy**: Iterate through a prioritized list of regex patterns. If a match is found under the cursor, attempt to parse it.

### Phase 3: Conversion Logic
- Integrate `luxon` for timezone handling.
- specific util function: `convertTime(sourceString, targetTimezones)`.

### Phase 4: UI & Tooltip
- Create a `Tooltip` class.
- Shadow DOM (optional but recommended) to isolate styles from the host page.
- Styling: High contrast, `z-index: 99999`, `pointer-events: none` to avoid interfering with page clicks.
- Positioning: Calculate coordinates relative to the viewport/mouse to prevent overflow.

### Phase 5: Options Page
- Simple HTML/JS interface.
- List current timezones.
- Add/Remove timezone functionality.
- Persist to `chrome.storage`.

### Phase 6: Testing
- Local HTML harness with various date formats.
- Edge case testing (line breaks, dates inside links, etc.).
