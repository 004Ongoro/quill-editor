class AutoCompleteEngine {
  constructor(editorUI) {
    this.ui = editorUI;
    this.editor = editorUI.codeEditor;
    this.settings = editorUI.settings;
    this.autoClosingPairs = true;
    this.autoIndent = true;
    this.autoCloseTags = true;

    this.pairMap = {
      "(": ")",
      "[": "]",
      "{": "}",
      "'": "'",
      '"': '"',
      "`": "`",
      "<": ">",
    };

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.editor.addEventListener("keydown", (e) => this.handleKeyDown(e));
  }

  handleKeyDown(e) {
    // Don't interfere with keyboard shortcuts
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    // Auto-closing pairs
    if (this.autoClosingPairs && this.pairMap[e.key]) {
      this.handleAutoClosing(e);
    }

    // Auto-indent on Enter
    if (e.key === "Enter" && this.autoIndent) {
      this.handleAutoIndent(e);
    }

    // Overtype closing character
    if (this.shouldOvertype(e)) {
      this.handleOvertype(e);
    }

    // Special case for HTML tags
    if (e.key === ">" && this.autoCloseTags) {
      this.handleTagCompletion(e);
    }
  }

  handleAutoClosing(e) {
    e.preventDefault();

    const cursorPos = this.editor.selectionStart;
    const textBefore = this.editor.value.substring(0, cursorPos);
    const textAfter = this.editor.value.substring(cursorPos);

    // Check if we're in a string or comment
    if (this.isInStringOrComment(textBefore, textAfter)) return;

    const openingChar = e.key;
    const closingChar = this.pairMap[openingChar];

    // For quotes, check if we're already inside quotes
    if (['"', "'", "`"].includes(openingChar)) {
      if (this.isInsideQuotes(textBefore, openingChar)) {
        // Just insert the quote
        this.insertAtCursor(openingChar);
        return;
      }
    }

    // For HTML tags, special handling
    if (openingChar === "<") {
      this.insertAtCursor("<>");
      this.editor.selectionStart = this.editor.selectionEnd = cursorPos + 1;
      return;
    }

    // Insert both opening and closing characters
    this.insertAtCursor(openingChar + closingChar);

    // Move cursor between the pair
    this.editor.selectionStart = this.editor.selectionEnd = cursorPos + 1;
  }

  handleAutoIndent(e) {
    e.preventDefault();

    const cursorPos = this.editor.selectionStart;
    const textBefore = this.editor.value.substring(0, cursorPos);
    const textAfter = this.editor.value.substring(cursorPos);
    const lines = textBefore.split("\n");
    const currentLine = lines[lines.length - 1];

    // Calculate indentation
    const indentMatch = currentLine.match(/^(\s*)/);
    let indent = indentMatch ? indentMatch[1] : "";

    // Add extra indent for opening braces/brackets
    if (currentLine.trim().endsWith("{") || currentLine.trim().endsWith("[")) {
      indent += "    ";
    }

    // Insert new line with indentation
    this.insertAtCursor("\n" + indent);

    // Add closing brace on next line if needed
    if (this.shouldAddClosingBrace(textBefore, textAfter)) {
      const nextLineIndent = indent.substring(
        0,
        Math.max(0, indent.length - 4),
      );
      setTimeout(() => {
        this.insertAtCursor("\n" + nextLineIndent + "}");
        // Move cursor back to the indented line
        this.editor.selectionStart = this.editor.selectionEnd =
          cursorPos + indent.length + 1;
      }, 0);
    }
  }

  shouldAddClosingBrace(textBefore, textAfter) {
    const linesBefore = textBefore.split("\n");
    const currentLine = linesBefore[linesBefore.length - 1];

    // Check if current line ends with opening brace
    if (!currentLine.trim().endsWith("{")) return false;

    // Count opening and closing braces
    const allText = textBefore + textAfter;
    const openBraces = (allText.match(/\{/g) || []).length;
    const closeBraces = (allText.match(/\}/g) || []).length;

    return openBraces > closeBraces;
  }

  handleOvertype(e) {
    const cursorPos = this.editor.selectionStart;
    const nextChar = this.editor.value.substring(cursorPos, cursorPos + 1);

    // Check if next character is a closing pair that matches what we're typing
    const closingPairs = Object.values(this.pairMap);
    if (closingPairs.includes(e.key) && nextChar === e.key) {
      e.preventDefault();
      // Just move cursor past the closing character
      this.editor.selectionStart = this.editor.selectionEnd = cursorPos + 1;
    }
  }

  handleTagCompletion(e) {
    const cursorPos = this.editor.selectionStart;
    const textBefore = this.editor.value.substring(0, cursorPos);

    // Check if we just typed a complete opening tag
    const tagMatch = textBefore.match(/<([a-zA-Z][a-zA-Z0-9]*)(\s[^>]*)?>$/);

    if (tagMatch && !this.isInStringOrComment(textBefore, "")) {
      const tagName = tagMatch[1];

      // Don't auto-close self-closing tags
      const selfClosingTags = [
        "img",
        "br",
        "hr",
        "meta",
        "link",
        "input",
        "area",
        "base",
        "col",
        "command",
        "embed",
        "keygen",
        "param",
        "source",
        "track",
        "wbr",
      ];
      if (selfClosingTags.includes(tagName.toLowerCase())) return;

      // Don't auto-close if we're already typing a closing tag
      if (textBefore.endsWith("</")) return;

      // Insert closing tag
      setTimeout(() => {
        this.insertAtCursor(`</${tagName}>`);
        // Move cursor back between the tags
        this.editor.selectionStart = this.editor.selectionEnd = cursorPos;
      }, 0);
    }
  }

  shouldOvertype(e) {
    if (!this.autoClosingPairs) return false;

    const cursorPos = this.editor.selectionStart;
    const nextChar = this.editor.value.substring(cursorPos, cursorPos + 1);
    const closingPairs = Object.values(this.pairMap);

    return closingPairs.includes(e.key) && nextChar === e.key;
  }

  isInStringOrComment(textBefore, textAfter) {
    const combined = textBefore + textAfter;

    // Check for strings
    const singleQuotes = (textBefore.match(/'/g) || []).length;
    const doubleQuotes = (textBefore.match(/"/g) || []).length;
    const backticks = (textBefore.match(/`/g) || []).length;

    // Simple check: if odd number of quotes before cursor, we're in a string
    if (
      singleQuotes % 2 === 1 ||
      doubleQuotes % 2 === 1 ||
      backticks % 2 === 1
    ) {
      return true;
    }

    // Check for line comments
    const lines = textBefore.split("\n");
    const lastLine = lines[lines.length - 1];
    if (lastLine.includes("//")) {
      return true;
    }

    // Check for block comments (simplified)
    const blockCommentStart = (textBefore.match(/\/\*/g) || []).length;
    const blockCommentEnd = (textBefore.match(/\*\//g) || []).length;

    return blockCommentStart > blockCommentEnd;
  }

  isInsideQuotes(textBefore, quoteChar) {
    const quotesInText = (
      textBefore.match(new RegExp(`\\${quoteChar}`, "g")) || []
    ).length;
    return quotesInText % 2 === 1;
  }

  insertAtCursor(text) {
    const start = this.editor.selectionStart;
    const end = this.editor.selectionEnd;
    const currentValue = this.editor.value;

    this.editor.value =
      currentValue.substring(0, start) + text + currentValue.substring(end);

    this.editor.selectionStart = this.editor.selectionEnd = start + text.length;
    this.editor.dispatchEvent(new Event("input"));
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Wait for editorUI to be available
  setTimeout(() => {
    if (window.editorUI) {
      window.autoCompleteEngine = new AutoCompleteEngine(window.editorUI);
    }
  }, 1000);
});
