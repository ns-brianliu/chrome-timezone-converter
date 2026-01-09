# Chrome Plugin Time Converter

A Chrome extension that automatically converts timestamps and dates on web pages into a readable format.

## Features

- **Automatic Conversion**: Detects and converts timestamps (Unix, ISO 8601, etc.) on web pages.
- **Configurable**: Options to customize the output format (if applicable).
- **Lightweight**: Minimal impact on page performance.

![Demo](./docs/demo.png)
![Config](./docs/timezone-configurations.png)

## Installation

### 1. Build from Source

Prerequisites:
- [Node.js](https://nodejs.org/) (Latest LTS recommended)
- npm (comes with Node.js)

Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd chrome-plugin-time-converter
npm install
```

Build the extension:

```bash
npm run build
```

This will generate the production-ready extension in the `dist/` directory.

### 2. Load into Google Chrome

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** using the toggle switch in the top right corner.
3. Click the **Load unpacked** button in the top left.
4. Select the `dist/` directory from this project.

The extension should now be installed and active.

## Development

To work on the extension with live updates:

```bash
npm run watch
```

This will automatically rebuild the project whenever you make changes to files in the `src/` directory. After a rebuild, you may need to reload the extension in `chrome://extensions/` or refresh the web page you are testing on.

> [!WARNING]
> This application is built by AI agents using "vibe coding" techniques. Code structure and logic may be experimental or non-standard.

## Project Structure

- `src/`: Source code.
- `dist/`: Compiled/bundled extension (load this folder into Chrome).
- `webpack.config.js`: Build configuration.
