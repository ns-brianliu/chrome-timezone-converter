# Chrome Plugin Time Converter - Agent Guidelines

This file outlines the standards, commands, and conventions for AI agents working on this repository.

## 1. Environment & Build

### System Requirements
- Node.js (Latest LTS recommended)
- npm

### Core Commands
- **Build**: `npm run build`
  - Uses Webpack to bundle `src/` files into `dist/`.
  - **Important**: Always run this after modifying files in `src/`.
- **Watch**: `npm run watch`
  - Rebuilds automatically on file changes.
- **Test**: `npm test`
  - Currently not configured (echos error).
  - *Agent Note*: When implementing tests, prefer **Jest**. Create a `jest.config.js` if one is needed.
- **Install Dependencies**: `npm install`

### Project Structure
- `src/`: Source code (ES modules, CommonJS).
- `dist/`: Production-ready extension (unpacked).
- `icons/`: Extension icons.
- `webpack.config.js`: Build configuration.
- `manifest.json`: Extension manifest (exists in `src/` and copied to `dist/`).

## 2. Code Style & Conventions

### General JavaScript
- **Module System**: The project uses CommonJS (`require`/`module.exports`) inside `src` files intended for Node/Webpack processing (like `content_script.js`), but effectively runs in a browser environment after bundling.
- **Formatting**:
  - Indentation: 2 spaces.
  - Semicolons: Always use semicolons.
  - Quotes: Single quotes preferred for strings, unless template literals are needed.
- **Variables**: Use `const` by default, `let` only when reassignment is necessary. Avoid `var`.

### Naming Conventions
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `DEBOUNCE_DELAY`, `TIME_PATTERNS`).
- **Functions/Variables**: `camelCase` (e.g., `convertTime`, `handleMouseMove`).
- **Files**: `snake_case` (e.g., `content_script.js`, `manifest.json`).

### Error Handling
- **Graceful Failures**: The extension runs in the user's browsing context. Errors should **never** crash the page or block user interaction.
- **Validation**: Validate external inputs (like DOM text content) before processing.
  - Example: `if (isNaN(dateObj.getTime())) return null;`
- **Silent Failures**: For non-critical background tasks (like tooltip rendering), it is often better to fail silently or log to debug console than to show user-visible errors.

### DOM & UI
- **Isolation**: When injecting UI (like tooltips), use:
  - High z-index (e.g., `2147483647`).
  - Unique styling or Shadow DOM (if complexity grows) to avoid conflicts with page styles.
  - `pointer-events: none` for non-interactive overlays to allow clicking through to the page.
- **Cleanup**: Always ensure event listeners and created DOM elements are properly cleaned up (e.g., `removeTooltip`).

### Libraries
- **Luxon**: Used for date/time manipulation (`DateTime`).
- **Native Date**: Used for initial parsing compatibility with V8.

## 3. Testing Strategy (Future)
*Agents implementing tests should follow this guide:*
- **Framework**: Jest.
- **Location**: `tests/` directory (needs creation).
- **Naming**: `*.test.js`.
- **Mocking**: Mock `chrome` API (e.g., `chrome.storage.sync`, `chrome.runtime`).

## 4. Specific Workflows
- **Updating Manifest**: If changing permissions or version, edit `src/manifest.json`. The build process copies this to `dist/`.
- **Adding Config**: If adding user settings, update:
  1. `src/options.html` (UI)
  2. `src/options.js` (Logic)
  3. `src/content_script.js` (Consumer of settings)
  4. `src/manifest.json` (Default storage values if applicable)

## 5. Design Updates
- Follow the "Living Design" philosophy.
- Update `CODE_STRUCTURE.md` if file organization changes.
- Update `DESIGN.md` if the architectural approach changes.

## 6. AI Rules (Cursor/Copilot)
*(No specific existing rules found in .cursor/rules or .github/copilot-instructions.md)*
- **Agent Behavior**:
  - Be proactive.
  - Verify assumptions by reading code.
  - Do not ask for permission to fix obvious bugs found during exploration.
  - Always state what instruction files you've read at the beginning of each session.
