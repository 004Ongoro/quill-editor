class FindReplaceManager {
  constructor(editorUI) {
    this.ui = editorUI;
    this.widget = document.getElementById("findReplaceWidget");
    this.findInput = document.getElementById("findInput");
    this.replaceInput = document.getElementById("replaceInput");
    this.matchCount = document.getElementById("matchCount");
    this.replaceRow = document.getElementById("replaceRow");

    this.matches = [];
    this.currentIndex = -1;
    this.isReplaceVisible = false;

    this.init();
  }

  init() {
    if (!this.widget) return;

    // Event listeners
    this.findInput.addEventListener("input", () => this.performSearch());
    this.findInput.addEventListener("keydown", (e) =>
      this.handleInputKeydown(e),
    );

    // Button listeners
    document
      .getElementById("findNext")
      .addEventListener("click", () => this.navigate(1));
    document
      .getElementById("findPrev")
      .addEventListener("click", () => this.navigate(-1));
    document
      .getElementById("closeFind")
      .addEventListener("click", () => this.hide());
    document
      .getElementById("toggleReplace")
      .addEventListener("click", () => this.toggleReplace());
    document
      .getElementById("replaceBtn")
      .addEventListener("click", () => this.replace());
    document
      .getElementById("replaceAllBtn")
      .addEventListener("click", () => this.replaceAll());

    // Replace input key handler
    this.replaceInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this.replace();
      }
    });
  }

  show() {
    if (!this.widget) return;

    this.widget.classList.remove("hidden");
    this.findInput.focus();
    this.findInput.select();

    // Initialize search with current selection if any
    const editor = this.ui.codeEditor;
    const selectedText = editor.value.substring(
      editor.selectionStart,
      editor.selectionEnd,
    );
    if (selectedText && !selectedText.includes("\n")) {
      this.findInput.value = selectedText;
      this.performSearch();
    }
  }

  hide() {
    if (this.widget) {
      this.widget.classList.add("hidden");
    }
    this.ui.codeEditor.focus();
  }

  toggleReplace() {
    this.isReplaceVisible = !this.isReplaceVisible;
    this.replaceRow.classList.toggle("hidden");

    const toggleIcon = document
      .getElementById("toggleReplace")
      .querySelector("i");
    toggleIcon.className = this.isReplaceVisible
      ? "fas fa-chevron-down"
      : "fas fa-chevron-right";

    if (this.isReplaceVisible) {
      this.replaceInput.focus();
    } else {
      this.findInput.focus();
    }
  }

  handleInputKeydown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      this.navigate(e.shiftKey ? -1 : 1);
    } else if (e.key === "Escape") {
      e.preventDefault();
      this.hide();
    }
  }

  performSearch() {
    const query = this.findInput.value.trim();
    const editor = this.ui.codeEditor;

    this.matches = [];
    this.currentIndex = -1;

    if (!query) {
      this.updateMatchCount();
      this.clearHighlights();
      return;
    }

    // Find all matches
    const content = editor.value;
    let index = 0;

    while ((index = content.indexOf(query, index)) !== -1) {
      this.matches.push({
        start: index,
        end: index + query.length,
      });
      index += query.length;
    }

    this.currentIndex = this.matches.length > 0 ? 0 : -1;
    this.updateMatchCount();
    this.highlightCurrentMatch();
  }

  navigate(direction) {
    if (this.matches.length === 0) return;

    this.currentIndex =
      (this.currentIndex + direction + this.matches.length) %
      this.matches.length;
    this.updateMatchCount();
    this.highlightCurrentMatch();
  }

  updateMatchCount() {
    const count = this.matches.length;
    if (count > 0 && this.currentIndex >= 0) {
      this.matchCount.textContent = `${this.currentIndex + 1}/${count}`;
    } else {
      this.matchCount.textContent = "0/0";
    }
  }

  highlightCurrentMatch() {
    this.clearHighlights();

    if (this.currentIndex >= 0 && this.currentIndex < this.matches.length) {
      const match = this.matches[this.currentIndex];
      const editor = this.ui.codeEditor;

      // Scroll to match
      editor.focus();
      editor.setSelectionRange(match.start, match.end);

      // Calculate scroll position
      const textBefore = editor.value.substring(0, match.start);
      const lineNumber = textBefore.split("\n").length;
      const lineHeight = 20; // Approximate line height
      const editorHeight = editor.clientHeight;

      editor.scrollTop = (lineNumber - 3) * lineHeight;
    }
  }

  clearHighlights() {
    // Selection will be cleared naturally when editor loses focus
    const editor = this.ui.codeEditor;
    editor.blur();
    editor.focus();
  }

  replace() {
    if (this.currentIndex < 0 || this.currentIndex >= this.matches.length)
      return;

    const match = this.matches[this.currentIndex];
    const query = this.findInput.value;
    const replacement = this.replaceInput.value;
    const editor = this.ui.codeEditor;

    if (editor.value.substring(match.start, match.end) === query) {
      // Replace the text
      const before = editor.value.substring(0, match.start);
      const after = editor.value.substring(match.end);
      editor.value = before + replacement + after;

      // Update UI
      this.ui.onEditorInput();

      const lengthDiff = replacement.length - query.length;
      for (let i = this.currentIndex + 1; i < this.matches.length; i++) {
        this.matches[i].start += lengthDiff;
        this.matches[i].end += lengthDiff;
      }

      // Remove the replaced match
      this.matches.splice(this.currentIndex, 1);

      // Update current index
      if (this.matches.length > 0) {
        this.currentIndex = this.currentIndex % this.matches.length;
      } else {
        this.currentIndex = -1;
      }

      this.updateMatchCount();
      this.highlightCurrentMatch();
    }
  }

  replaceAll() {
    const query = this.findInput.value;
    const replacement = this.replaceInput.value;

    if (!query) return;

    const editor = this.ui.codeEditor;
    const regex = new RegExp(this.escapeRegExp(query), "g");
    editor.value = editor.value.replace(regex, replacement);

    // Update UI
    this.ui.onEditorInput();

    // Clear matches
    this.matches = [];
    this.currentIndex = -1;
    this.updateMatchCount();
    this.clearHighlights();
  }

  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
