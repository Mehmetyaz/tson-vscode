# TSON VS Code Extension - Installation

## Development Installation

1. Make sure you have [Node.js](https://nodejs.org/) installed.
2. Clone this repository.
3. Open this directory in VS Code.
4. Run `npm install` to install dependencies.
5. Press `F5` to open a new window with the extension loaded.
6. Open any `.tson` file to see syntax highlighting.
7. Make changes to the files, then reload the extension (`Ctrl+R` or `Cmd+R` on Mac) to see changes.

## Building VSIX Package

To build a VSIX package for manual installation:

```bash
npm install -g vsce
vsce package
```

This will create a `.vsix` file in the extension directory.

## Manual Installation

1. Launch VS Code.
2. Press `Ctrl+Shift+P` to open the command palette.
3. Type `Extensions: Install from VSIX...` and select it.
4. Navigate to the VSIX file you created and select it.
5. Restart VS Code when prompted.

## Publishing to VS Code Marketplace

1. Create a personal access token in Azure DevOps.
2. Login to vsce:
   ```bash
   vsce login <publisher>
   ```
3. Publish the extension:
   ```bash
   vsce publish
   ```

## Usage

Once installed, any file with `.tson` or `.tsonl` extension will automatically use the TSON language features:

- Syntax highlighting
- Bracket matching
- Basic validation
- Comment toggling (with `Ctrl+/` or `Cmd+/` on Mac)
