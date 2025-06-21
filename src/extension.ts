import * as vscode from "vscode";
import { TSON, TSONParseError, TSONParseErrors } from "tson-js";
import { TextEncoder } from "util";

// Simple TSON validator
class TSONValidator {
  private tsonDiagnosticCollection: vscode.DiagnosticCollection;
  private tsonlDiagnosticCollection: vscode.DiagnosticCollection;

  constructor(context: vscode.ExtensionContext) {
    this.tsonDiagnosticCollection =
      vscode.languages.createDiagnosticCollection("tson");
    this.tsonlDiagnosticCollection =
      vscode.languages.createDiagnosticCollection("tsonl");
    context.subscriptions.push(this.tsonDiagnosticCollection);
    context.subscriptions.push(this.tsonlDiagnosticCollection);
  }

  public validate(document: vscode.TextDocument): void {
    const languageId = document.languageId;

    if (languageId === "tson") {
      this.validateTSON(document);
    } else if (languageId === "tsonl") {
      this.validateTSONL(document);
    }
  }

  public validateTSONL(document: vscode.TextDocument): void {
    const text = document.getText();
    const lines = text.split("\n");
    const diagnostics: vscode.Diagnostic[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines and comments
      if (line === "" || line.startsWith("//")) {
        continue;
      }

      try {
        // Try to parse each line as a complete TSON object
        TSON.parse(line);
      } catch (error) {
        if (error instanceof TSONParseError) {
          const errorMessage = error.message;
          diagnostics.push(this.createDiagnostic(i, 0, errorMessage));
        } else if (error instanceof TSONParseErrors) {
          for (const parseError of error.errors) {
            diagnostics.push(this.createDiagnostic(i, 0, parseError.message));
          }
        } else {
          diagnostics.push(
            this.createDiagnostic(i, 0, "Invalid TSON object in line")
          );
        }
      }
    }

    this.tsonlDiagnosticCollection.set(document.uri, diagnostics);
  }

  public validateTSON(document: vscode.TextDocument): void {
    const text = document.getText();
    const diagnostics: vscode.Diagnostic[] = [];

    try {
      // Try to parse the entire document as a TSON object
      const res = TSON.parse(text);
      console.log(res);
    } catch (error) {
      console.log(error);
      if (error instanceof TSONParseError) {
        // If we have line info from the error, use it
        diagnostics.push(this.createDiagnosticWithError(error));
      } else if (error instanceof TSONParseErrors) {
        for (const parseError of error.errors) {
          diagnostics.push(this.createDiagnosticWithError(parseError));
        }
      } else {
        // Fallback to basic bracket validation if TSON parser is not available
        this.validateBasicBrackets(document, diagnostics);
      }
    }

    this.tsonDiagnosticCollection.set(document.uri, diagnostics);
  }

  private createDiagnosticWithError(err: TSONParseError) {
    console.log("Diagnostic error", err.cursor, err.endCursor);
    const startC = err.cursor.column;
    const startL = err.cursor.line;
    const endC = err.endCursor?.column ?? startC;
    const endL = err.endCursor?.line ?? startL;
    const message = err.message;
    const range = new vscode.Range(startL, startC, endL, endC);
    const diagnostic = new vscode.Diagnostic(
      range,
      message,
      vscode.DiagnosticSeverity.Error
    );
    diagnostic.source = "TSON";
    return diagnostic;
  }

  private validateBasicBrackets(
    document: vscode.TextDocument,
    diagnostics: vscode.Diagnostic[]
  ): void {
    const text = document.getText();
    const lines = text.split("\n");

    // Very basic validation - brackets matching
    let braceCount = 0;
    let bracketCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip comments
      if (line.trim().startsWith("//")) {
        continue;
      }

      // Simple bracket counting
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === "{") braceCount++;
        else if (char === "}") braceCount--;
        else if (char === "[") bracketCount++;
        else if (char === "]") bracketCount--;

        // Check for immediate problems
        if (braceCount < 0) {
          diagnostics.push(
            this.createDiagnostic(i, j, "Unexpected closing brace")
          );
          braceCount = 0; // Reset to avoid multiple errors
        }
        if (bracketCount < 0) {
          diagnostics.push(
            this.createDiagnostic(i, j, "Unexpected closing bracket")
          );
          bracketCount = 0; // Reset to avoid multiple errors
        }
      }
    }

    // Check for unclosed brackets
    if (braceCount > 0) {
      diagnostics.push(
        this.createDiagnostic(
          lines.length - 1,
          0,
          `${braceCount} unclosed braces`
        )
      );
    }
    if (bracketCount > 0) {
      diagnostics.push(
        this.createDiagnostic(
          lines.length - 1,
          0,
          `${bracketCount} unclosed brackets`
        )
      );
    }
  }

  private createDiagnostic(
    line: number,
    character: number,
    message: string
  ): vscode.Diagnostic {
    const range = new vscode.Range(line, character, line, character + 1);
    const diagnostic = new vscode.Diagnostic(
      range,
      message,
      vscode.DiagnosticSeverity.Error
    );
    diagnostic.source = "TSON";
    return diagnostic;
  }
}

// TSON Document Formatter
class TSONDocumentFormatter
  implements
    vscode.DocumentFormattingEditProvider,
    vscode.DocumentRangeFormattingEditProvider
{
  public provideDocumentFormattingEdits(
    document: vscode.TextDocument,
    options: vscode.FormattingOptions
  ): vscode.TextEdit[] {
    // Check if the document is TSONL
    const isTSONL = document.languageId === "tsonl";

    if (isTSONL) {
      return this.formatTSONLDocument(document, options);
    } else {
      return this.formatTSONDocument(document, options);
    }
  }

  public provideDocumentRangeFormattingEdits(
    document: vscode.TextDocument,
    range: vscode.Range,
    options: vscode.FormattingOptions
  ): vscode.TextEdit[] {
    // For range formatting, just format the selected lines
    const text = document.getText(range);
    const isTSONL = document.languageId === "tsonl";

    if (isTSONL) {
      return [
        vscode.TextEdit.replace(range, this.formatTSONLText(text, options)),
      ];
    } else {
      return [
        vscode.TextEdit.replace(range, this.formatTSONText(text, options)),
      ];
    }
  }

  private formatTSONDocument(
    document: vscode.TextDocument,
    options: vscode.FormattingOptions
  ): vscode.TextEdit[] {
    const text = document.getText();
    const formattedText = this.formatTSONText(text, options);

    // Replace the entire document
    const fullRange = new vscode.Range(
      document.lineAt(0).range.start,
      document.lineAt(document.lineCount - 1).range.end
    );

    return [vscode.TextEdit.replace(fullRange, formattedText)];
  }

  private formatTSONLDocument(
    document: vscode.TextDocument,
    options: vscode.FormattingOptions
  ): vscode.TextEdit[] {
    const text = document.getText();
    const formattedText = this.formatTSONLText(text, options);

    // Replace the entire document
    const fullRange = new vscode.Range(
      document.lineAt(0).range.start,
      document.lineAt(document.lineCount - 1).range.end
    );

    return [vscode.TextEdit.replace(fullRange, formattedText)];
  }

  private formatTSONText(
    text: string,
    options: vscode.FormattingOptions
  ): string {
    try {
      // Parse the TSON text to validate it
      const parsed = TSON.parse(text);

      // Use the TSON formatter to beautify it with proper indentation
      const formatted = TSON.stringify(parsed, true);
      return formatted;
    } catch (error) {
      // If parsing fails, return the original text
      console.error("Failed to format TSON: ", error);
      return text;
    }
  }

  private formatTSONLText(
    text: string,
    options: vscode.FormattingOptions
  ): string {
    const lines = text.split("\n");
    const formattedLines: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip empty lines and comments (preserve them)
      if (trimmedLine === "" || trimmedLine.startsWith("//")) {
        formattedLines.push(trimmedLine);
        continue;
      }

      try {
        // Try to parse the line as TSON
        const parsed = TSON.parse(trimmedLine);

        // Format the object as a single line with compact spacing
        const formatted = TSON.stringify(parsed, false);
        formattedLines.push(formatted);
      } catch (error) {
        // If parsing fails, preserve the original line
        formattedLines.push(trimmedLine);
      }
    }

    return formattedLines.join("\n");
  }
}

// Helper function to convert TSON/TSONL to JSON/JSONL
async function handleConvertToJson(uri?: vscode.Uri) {
  try {
    // Get the URI from the context menu or from the active editor
    const targetUri =
      uri ||
      (vscode.window.activeTextEditor
        ? vscode.window.activeTextEditor.document.uri
        : undefined);

    if (!targetUri) {
      vscode.window.showErrorMessage("No file selected to convert.");
      return;
    }

    // Read the file content
    const document = await vscode.workspace.openTextDocument(targetUri);
    const content = document.getText();
    const isTSONL = document.languageId === "tsonl";

    let jsonContent = "";
    let targetExtension = isTSONL ? ".jsonl" : ".json";

    if (isTSONL) {
      // Handle TSONL file (line by line conversion)
      const lines = content.split("\n");
      const jsonLines = [];

      for (const line of lines) {
        const trimmedLine = line.trim();
        // Skip empty lines and comments
        if (trimmedLine === "" || trimmedLine.startsWith("//")) {
          jsonLines.push(trimmedLine);
          continue;
        }

        try {
          // Parse TSON line and convert to JSON
          const parsedObj = TSON.parse(trimmedLine);
          jsonLines.push(JSON.stringify(parsedObj));
        } catch (error: any) {
          console.error("Error parsing TSONL line:", error);
          // Keep original line if parsing fails
          jsonLines.push(trimmedLine);
        }
      }

      // Join lines to create JSONL content
      jsonContent = jsonLines.join("\n");
    } else {
      // Handle TSON file (single object)
      try {
        const parsedObj = TSON.parse(content);
        jsonContent = JSON.stringify(parsedObj, null, 2);
      } catch (error: any) {
        vscode.window.showErrorMessage(
          "Failed to parse TSON file: " + error.message
        );
        return;
      }
    }

    // Create the JSON file path with the same name but .json/.jsonl extension
    const jsonPath = targetUri.fsPath.replace(
      /\.(tson|tsonl)$/i,
      targetExtension
    );
    const jsonUri = vscode.Uri.file(jsonPath);

    // Write the JSON file
    const encoder = new TextEncoder();
    const jsonBytes = encoder.encode(jsonContent);
    await vscode.workspace.fs.writeFile(jsonUri, jsonBytes);

    vscode.window.showInformationMessage(
      `Converted to ${targetExtension.toUpperCase().slice(1)}: ${jsonPath}`
    );

    // Open the newly created JSON file
    const jsonDocument = await vscode.workspace.openTextDocument(jsonUri);
    await vscode.window.showTextDocument(jsonDocument);
  } catch (error: any) {
    vscode.window.showErrorMessage(
      "Error converting to JSON: " + error.message
    );
  }
}

// Helper function to convert JSON/JSONL to TSON/TSONL
async function handleConvertToTSON(uri?: vscode.Uri) {
  try {
    // Get the URI from the context menu or from the active editor
    const targetUri =
      uri ||
      (vscode.window.activeTextEditor
        ? vscode.window.activeTextEditor.document.uri
        : undefined);

    if (!targetUri) {
      vscode.window.showErrorMessage("No file selected to convert.");
      return;
    }

    const document = await vscode.workspace.openTextDocument(targetUri);
    const content = document.getText();
    const isJSONL = targetUri.fsPath.toLowerCase().endsWith(".jsonl");

    let tsonContent = "";
    let targetExtension = isJSONL ? ".tsonl" : ".tson";

    if (isJSONL) {
      // Handle JSONL file (line by line conversion)
      const lines = content.split("\n");
      const tsonLines = [];

      for (const line of lines) {
        const trimmedLine = line.trim();
        // Skip empty lines and comments
        if (trimmedLine === "" || trimmedLine.startsWith("//")) {
          tsonLines.push(trimmedLine);
          continue;
        }

        try {
          // Parse JSON line and convert to TSON
          const parsedObj = JSON.parse(trimmedLine);
          tsonLines.push(TSON.stringify(parsedObj, false));
        } catch (error: any) {
          console.error("Error parsing JSON line:", error);
          // Keep original line if parsing fails
          tsonLines.push(trimmedLine);
        }
      }

      // Join lines to create TSONL content
      tsonContent = tsonLines.join("\n");
    } else {
      // Handle JSON file (single object)
      try {
        const parsedObj = JSON.parse(content);
        tsonContent = TSON.stringify(parsedObj, true);
      } catch (error: any) {
        vscode.window.showErrorMessage(
          "Failed to parse JSON file: " + error.message
        );
        return;
      }
    }

    // Create the TSON file path with the same name but .tson/.tsonl extension
    const tsonPath = targetUri.fsPath.replace(
      /\.(json|jsonl)$/i,
      targetExtension
    );
    const tsonUri = vscode.Uri.file(tsonPath);

    // Write the TSON file
    const encoder = new TextEncoder();
    const tsonBytes = encoder.encode(tsonContent);
    await vscode.workspace.fs.writeFile(tsonUri, tsonBytes);

    vscode.window.showInformationMessage(
      `Converted to ${targetExtension.toUpperCase().slice(1)}: ${tsonPath}`
    );

    // Open the newly created TSON file
    const tsonDocument = await vscode.workspace.openTextDocument(tsonUri);
    await vscode.window.showTextDocument(tsonDocument);
  } catch (error: any) {
    vscode.window.showErrorMessage(
      "Error converting to TSON: " + error.message
    );
  }
}

export function activate(context: vscode.ExtensionContext) {
  // Register TSON language configuration
  vscode.languages.setLanguageConfiguration("tson", {
    wordPattern:
      /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
    comments: {
      lineComment: "//",
      blockComment: ["/*", "*/"],
    },
    brackets: [
      ["{", "}"],
      ["[", "]"],
    ],
    onEnterRules: [
      {
        // Auto-indent after opening brace
        beforeText: /^\s*[\{\[].*$/,
        action: { indentAction: vscode.IndentAction.Indent },
      },
    ],
    autoClosingPairs: [
      {
        open: "{",
        close: "}",
      },
      {
        open: "[",
        close: "]",
      },
      {
        open: '"',
        close: '"',
      },
    ],
    indentationRules: {
      increaseIndentPattern: /^\s*[\{\[]\s*$/,
      decreaseIndentPattern: /^\s*[\}\]]\s*$/,
    },
  });

  // Register TSONL language configuration
  vscode.languages.setLanguageConfiguration("tsonl", {
    wordPattern:
      /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
    comments: {
      lineComment: "//",
    },
    brackets: [
      ["{", "}"],
      ["[", "]"],
    ],
    autoClosingPairs: [
      {
        open: "{",
        close: "}",
      },
      {
        open: "[",
        close: "]",
      },
      {
        open: '"',
        close: '"',
      },
    ],
  });

  // Initialize validator
  const validator = new TSONValidator(context);

  // Register formatters
  const formatter = new TSONDocumentFormatter();
  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider("tson", formatter),
    vscode.languages.registerDocumentRangeFormattingEditProvider(
      "tson",
      formatter
    ),
    vscode.languages.registerDocumentFormattingEditProvider("tsonl", formatter),
    vscode.languages.registerDocumentRangeFormattingEditProvider(
      "tsonl",
      formatter
    )
  );

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand("tson.format", () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const document = editor.document;
        if (document.languageId === "tson" || document.languageId === "tsonl") {
          vscode.commands.executeCommand("editor.action.formatDocument");
        }
      }
    }),
    vscode.commands.registerCommand("tson.formatSelection", () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const document = editor.document;
        if (
          (document.languageId === "tson" || document.languageId === "tsonl") &&
          editor.selection
        ) {
          vscode.commands.executeCommand("editor.action.formatSelection");
        }
      }
    }),
    vscode.commands.registerCommand("tson.convertToJson", async () => {
      // Convert current file or selected TSON/TSONL to JSON
      await handleConvertToJson();
    }),
    vscode.commands.registerCommand("tson.convertToTSON", async () => {
      // Convert current file or selected JSON to TSON
      await handleConvertToTSON();
    })
  );

  // Register document event handlers
  context.subscriptions.push(
    // Validate TSON/TSONL on document changes
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (
        event.document.languageId === "tson" ||
        event.document.languageId === "tsonl"
      ) {
        validator.validate(event.document);
      }
    }),
    // Validate TSON/TSONL on open
    vscode.workspace.onDidOpenTextDocument((document) => {
      if (document.languageId === "tson" || document.languageId === "tsonl") {
        validator.validate(document);
      }
    }),
    // Validate TSON/TSONL on save
    vscode.workspace.onDidSaveTextDocument((document) => {
      if (document.languageId === "tson" || document.languageId === "tsonl") {
        validator.validate(document);
      }
    })
  );

  // Validate all open documents
  vscode.workspace.textDocuments.forEach((document: vscode.TextDocument) =>
    validator.validate(document)
  );
}

export function deactivate() {}
