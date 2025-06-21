# TSON VS Code Extension

This extension provides syntax highlighting, formatting, and language support for TSON (Token-Saving Object Notation) files in Visual Studio Code.

## Features

- Syntax highlighting for `.tson` and `.tsonl` files
- Bracket matching and auto-closing for TSON syntax
- Comment toggling support
- Document formatting for both TSON and TSONL formats
- Validation for TSON syntax
- Range formatting support

## TSON Syntax Overview

TSON is a compact, human-readable data format designed for token-efficient, easy-to-parse data representation.

### Core Syntax

- Native types have prefixes:
  - `#` for integers: `#123`
  - `=` for floating-point numbers: `=123.45`
  - `?` for booleans: `?true`
  - `~` for null values: `~`
- Strings are wrapped with `""`: `"Hello, world!"`
- Arrays are wrapped with `[]`, array items are separated by a space: `["red" "green" "blue"]`
- Objects are wrapped with `{}`, object keys & values are separated by a space: `{name"John" age#30}`

### TSON vs TSONL

- **TSON (.tson)**: Regular TSON format with multi-line formatting support for better readability
- **TSONL (.tsonl)**: Line-oriented TSON format where each line is a separate valid TSON object (similar to JSONL)

### Regular TSON Example

```tson
user{
  name"John Doe"
  age#30
  isActive?true
  address{
    street"123 Main St"
    city"Anytown"
    zipCode#12345
  }
  phoneNumbers[
    "+1-555-123-4567"
    "+1-555-987-6543"
  ]
}
```

### TSONL Example

```tsonl
// Each line is a separate TSON object
{name"John" age#30 city"New York"}
{name"Jane" age#28 city"San Francisco"}
{name"Bob" age#45 city"Chicago"}
```

## Formatting Commands

The extension provides the following commands for formatting TSON documents:

- **Format TSON Document** (`tson.format`): Format the entire TSON document
- **Format TSON Selection** (`tson.formatSelection`): Format only the selected TSON code

You can also use the standard VS Code formatting shortcuts:

- `Shift+Alt+F` to format the entire document
- `Ctrl+K Ctrl+F` to format the selected text

## Installation

1. Open VS Code
2. Press `Ctrl+P` to open the Quick Open dialog
3. Type `ext install tson-vscode` to find and install this extension

## Requirements

- Visual Studio Code 1.80.0 or newer

## Release Notes

### 0.1.0

- Initial release with basic syntax highlighting for TSON files
- Support for both TSON and TSONL formats
- Document formatting and validation
