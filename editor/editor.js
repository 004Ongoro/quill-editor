// Core editor functionality - Fixed for long files with proper overlay handling
class CodeEditorCore {
  constructor(textareaElement, overlayElement) {
    this.textarea = textareaElement;
    this.overlay = overlayElement;
    this.setupEditor();
    this.setupOverlaySync();
  }

  setupEditor() {
    // Set initial styles and properties
    this.textarea.style.fontFamily = "'Consolas', 'Courier New', monospace";
    this.textarea.style.fontSize = "14px";
    this.textarea.style.lineHeight = "1.5";
    this.textarea.style.tabSize = "4";
    this.textarea.style.whiteSpace = "pre";
    this.textarea.style.overflowWrap = "normal";
    this.textarea.style.overflowX = "auto";

    // Set text color to transparent for overlay to work
    this.textarea.style.color = "transparent";
    this.textarea.style.backgroundColor = "transparent";
    this.textarea.style.caretColor = "#cccccc";

    // Ensure the overlay matches the textarea
    this.syncOverlay();
  }

  setupOverlaySync() {
    // Listen for input events to keep overlay in sync
    this.textarea.addEventListener("input", () => {
      this.syncOverlayDimensions();
    });

    // Sync scroll position
    this.textarea.addEventListener("scroll", () => {
      this.syncScroll();
    });

    // Initial sync
    setTimeout(() => this.syncOverlayDimensions(), 100);
  }

  syncOverlayDimensions() {
    // Copy all relevant styles from textarea to overlay
    const computedStyle = window.getComputedStyle(this.textarea);

    this.overlay.style.fontFamily = computedStyle.fontFamily;
    this.overlay.style.fontSize = computedStyle.fontSize;
    this.overlay.style.lineHeight = computedStyle.lineHeight;
    this.overlay.style.padding = computedStyle.padding;
    this.overlay.style.margin = computedStyle.margin;
    this.overlay.style.border = computedStyle.border;
    this.overlay.style.width = computedStyle.width;
    this.overlay.style.height = computedStyle.height;
    this.overlay.style.letterSpacing = computedStyle.letterSpacing;
    this.overlay.style.whiteSpace = computedStyle.whiteSpace;
    this.overlay.style.tabSize = computedStyle.tabSize;
    this.overlay.style.wordSpacing = computedStyle.wordSpacing;
    this.overlay.style.textIndent = computedStyle.textIndent;

    // Position overlay absolutely over textarea
    const rect = this.textarea.getBoundingClientRect();
    this.overlay.style.position = "absolute";
    this.overlay.style.left = rect.left + "px";
    this.overlay.style.top = rect.top + "px";
    this.overlay.style.width = rect.width + "px";
    this.overlay.style.height = rect.height + "px";
    this.overlay.style.zIndex = "1";

    // Set textarea z-index higher so it captures events
    this.textarea.style.zIndex = "2";
    this.textarea.style.position = "relative";
  }

  syncScroll() {
    if (this.overlay) {
      this.overlay.scrollTop = this.textarea.scrollTop;
      this.overlay.scrollLeft = this.textarea.scrollLeft;
    }

    // Sync line numbers if they exist
    const lineNumbers = document.getElementById("lineNumbers");
    if (lineNumbers) {
      lineNumbers.scrollTop = this.textarea.scrollTop;
    }
  }

  getContent() {
    return this.textarea.value;
  }

  setContent(content) {
    this.textarea.value = content;
    this.textarea.dispatchEvent(new Event("input"));
  }

  insertText(text) {
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    const currentValue = this.textarea.value;

    this.textarea.value =
      currentValue.substring(0, start) + text + currentValue.substring(end);

    // Move cursor to end of inserted text
    this.textarea.selectionStart = this.textarea.selectionEnd =
      start + text.length;

    // Trigger input event
    this.textarea.dispatchEvent(new Event("input"));
    this.textarea.focus();
  }

  getCursorPosition() {
    return {
      start: this.textarea.selectionStart,
      end: this.textarea.selectionEnd,
    };
  }

  setCursorPosition(start, end = start) {
    this.textarea.selectionStart = start;
    this.textarea.selectionEnd = end;
    this.textarea.focus();
  }

  getLineAtCursor() {
    const cursorPos = this.textarea.selectionStart;
    const textBeforeCursor = this.textarea.value.substring(0, cursorPos);
    const lines = textBeforeCursor.split("\n");
    return lines[lines.length - 1];
  }

  getCurrentLineNumber() {
    const cursorPos = this.textarea.selectionStart;
    const textBeforeCursor = this.textarea.value.substring(0, cursorPos);
    return textBeforeCursor.split("\n").length;
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  const textarea = document.getElementById("codeEditor");
  const overlay = document.getElementById("syntaxHighlight");

  if (textarea && overlay) {
    window.codeEditor = new CodeEditorCore(textarea, overlay);
  }
});
