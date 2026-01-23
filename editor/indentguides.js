class IndentGuidesManager {
  constructor(editorUI) {
    this.ui = editorUI;
    this.editor = editorUI.codeEditor;
    this.container = document.getElementById("indentGuides");
    this.settings = editorUI.settings;

    this.guides = [];
    this.tabSize = 4;
    this.charWidth = 0;
    this.lineHeight = 0;

    this.setup();
    this.setupEventListeners();
  }

  setup() {
    if (!this.container) {
      // Create container if it doesn't exist
      this.container = document.createElement("div");
      this.container.className = "indent-guides-container";
      this.container.id = "indentGuides";

      const editorContainer = document.querySelector(".editor-container");
      if (editorContainer) {
        const lineNumbers = document.getElementById("lineNumbers");
        editorContainer.insertBefore(this.container, lineNumbers.nextSibling);
      }
    }

    this.calculateMetrics();
    this.renderGuides();
  }

  setupEventListeners() {
    // Update on editor changes
    this.editor.addEventListener("input", () => {
      this.updateGuides();
    });

    // Update on scroll
    this.editor.addEventListener("scroll", () => {
      this.updateGuidePositions();
    });

    // Update on resize
    window.addEventListener("resize", () => {
      this.calculateMetrics();
      this.renderGuides();
    });

    // Update on cursor movement
    this.editor.addEventListener("keyup", () => {
      this.updateActiveGuide();
    });

    this.editor.addEventListener("click", () => {
      this.updateActiveGuide();
    });

    // Update when settings change
    if (this.ui) {
      // Listen for settings changes
      const originalApplySettings = this.ui.applySettings?.bind(this.ui);
      if (originalApplySettings) {
        this.ui.applySettings = () => {
          originalApplySettings();
          this.onSettingsChanged();
        };
      }
    }
  }

  calculateMetrics() {
    // Calculate character width
    const tempSpan = document.createElement("span");
    tempSpan.style.fontFamily = window.getComputedStyle(this.editor).fontFamily;
    tempSpan.style.fontSize = window.getComputedStyle(this.editor).fontSize;
    tempSpan.style.position = "absolute";
    tempSpan.style.visibility = "hidden";
    tempSpan.textContent = " ";

    document.body.appendChild(tempSpan);
    this.charWidth = tempSpan.getBoundingClientRect().width;
    document.body.removeChild(tempSpan);

    // Calculate line height
    const computedStyle = window.getComputedStyle(this.editor);
    this.lineHeight = parseFloat(computedStyle.lineHeight) || 21;

    // Get tab size from settings
    this.tabSize = this.settings?.tabSize || 4;
  }

  renderGuides() {
    this.container.innerHTML = "";
    this.guides = [];

    // Create guides for multiple indentation levels
    const maxIndentLevels = 20;
    const editorWidth = this.editor.clientWidth;
    const maxGuides = Math.floor(editorWidth / (this.charWidth * this.tabSize));

    for (let i = 1; i <= Math.min(maxIndentLevels, maxGuides); i++) {
      const guide = document.createElement("div");
      guide.className = "indent-guide";
      guide.style.left = `${i * this.tabSize * this.charWidth}px`;
      guide.dataset.level = i;

      this.container.appendChild(guide);
      this.guides.push(guide);
    }

    this.updateGuidePositions();
    this.updateActiveGuide();
  }

  updateGuides() {
    // Recalculate if tab size changed
    const newTabSize = this.settings?.tabSize || 4;
    if (newTabSize !== this.tabSize) {
      this.tabSize = newTabSize;
      this.renderGuides();
      return;
    }

    this.updateGuidePositions();
    this.updateActiveGuide();
  }

  updateGuidePositions() {
    const scrollTop = this.editor.scrollTop;
    const scrollLeft = this.editor.scrollLeft;

    // Update container position
    this.container.style.transform = `translateX(-${scrollLeft}px)`;
    this.container.style.top = `${-scrollTop}px`;

    // Get visible content
    const content = this.editor.value;
    const lines = content.split("\n");

    // Calculate which guides should be active based on content
    const visibleLines = this.getVisibleLineRange();

    // Reset all guides to inactive
    this.guides.forEach((guide) => {
      guide.classList.remove("active");
    });

    // Find indent levels used in visible lines
    const activeLevels = new Set();

    for (
      let i = visibleLines.start;
      i <= visibleLines.end && i < lines.length;
      i++
    ) {
      const line = lines[i];
      if (!line.trim()) continue; // Skip empty lines

      // Calculate indentation level
      const leadingSpaces = line.match(/^(\s*)/)[1];
      const indentCount = this.countIndent(leadingSpaces);

      // Mark all levels up to this one as potentially active
      for (let level = 1; level <= indentCount; level++) {
        activeLevels.add(level);
      }
    }

    // Set active guides
    activeLevels.forEach((level) => {
      const guide = this.guides.find(
        (g) => parseInt(g.dataset.level) === level,
      );
      if (guide) {
        guide.classList.add("active");
      }
    });
  }

  updateActiveGuide() {
    const cursorPos = this.editor.selectionStart;
    const textBeforeCursor = this.editor.value.substring(0, cursorPos);
    const lines = textBeforeCursor.split("\n");
    const currentLine = lines[lines.length - 1];

    // Calculate current indentation level
    const leadingSpaces = currentLine.match(/^(\s*)/)[1];
    const currentIndent = this.countIndent(leadingSpaces);

    // Highlight guide for current indent level
    this.guides.forEach((guide) => {
      const level = parseInt(guide.dataset.level);
      guide.classList.toggle("active", level === currentIndent);
    });
  }

  countIndent(text) {
    if (!text) return 0;

    // Count tabs as 1, spaces as fraction of tab size
    let count = 0;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === "\t") {
        count += 1;
      } else if (text[i] === " ") {
        // Count spaces as part of tab stops
        if (this.settings?.tabSize) {
          count += 1 / this.settings.tabSize;
        } else {
          count += 0.25; // Default 4 spaces per tab
        }
      }
    }

    return Math.floor(count);
  }

  getVisibleLineRange() {
    const scrollTop = this.editor.scrollTop;
    const clientHeight = this.editor.clientHeight;

    const startLine = Math.floor(scrollTop / this.lineHeight);
    const endLine = Math.ceil((scrollTop + clientHeight) / this.lineHeight);

    return {
      start: Math.max(0, startLine - 1),
      end: endLine + 1,
    };
  }

  onSettingsChanged() {
    if (this.settings) {
      this.settings = this.ui.settings;
      this.calculateMetrics();
      this.renderGuides();
    }
  }

  // Public method to refresh guides
  refresh() {
    this.calculateMetrics();
    this.renderGuides();
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Wait for editorUI to be available
  setTimeout(() => {
    if (window.editorUI) {
      window.indentGuidesManager = new IndentGuidesManager(window.editorUI);
    }
  }, 1500);
});
