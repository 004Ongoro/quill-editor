class IndentGuidesManager {
  constructor(editorUI) {
    this.ui = editorUI;
    this.editor = editorUI.codeEditor;
    this.container = null;
    this.settings = editorUI.settings;

    this.guides = [];
    this.tabSize = 4;
    this.charWidth = 8.4; // Default monospace character width
    this.lineHeight = 21;
    this.paddingLeft = 10; // Editor padding

    this.visible = true;

    this.init();
  }

  init() {
    this.createContainer();
    this.calculateMetrics();
    this.setupEventListeners();
    this.renderGuides();

    // Initial render
    setTimeout(() => {
      this.updateAll();
    }, 100);
  }

  createContainer() {
    // Remove existing container if any
    const existing = document.getElementById("indentGuides");
    if (existing) {
      existing.remove();
    }

    // Create new container
    this.container = document.createElement("div");
    this.container.className = "indent-guides-container";
    this.container.id = "indentGuides";

    // Make container absolutely positioned and tall
    this.container.style.position = "absolute";
    this.container.style.top = "0";
    this.container.style.left = "50px"; // Same as line numbers
    this.container.style.right = "0";
    this.container.style.bottom = "0";
    this.container.style.overflow = "hidden";
    this.container.style.pointerEvents = "none";
    this.container.style.zIndex = "0";

    // Insert after line numbers
    const lineNumbers = document.getElementById("lineNumbers");
    const editorContainer = document.querySelector(".editor-container");

    if (lineNumbers && editorContainer) {
      editorContainer.insertBefore(this.container, lineNumbers.nextSibling);
    } else if (editorContainer) {
      editorContainer.appendChild(this.container);
    }
  }

  calculateMetrics() {
    try {
      // Get computed styles
      const computedStyle = window.getComputedStyle(this.editor);

      // Calculate character width more accurately
      const testSpan = document.createElement("span");
      testSpan.style.fontFamily = computedStyle.fontFamily;
      testSpan.style.fontSize = computedStyle.fontSize;
      testSpan.style.position = "fixed";
      testSpan.style.visibility = "hidden";
      testSpan.style.whiteSpace = "pre";
      testSpan.textContent = " ";

      document.body.appendChild(testSpan);
      const rect = testSpan.getBoundingClientRect();
      this.charWidth = rect.width || 8.4;
      document.body.removeChild(testSpan);

      // Get line height
      this.lineHeight = parseFloat(computedStyle.lineHeight) || 21;

      // Get padding
      this.paddingLeft = parseFloat(computedStyle.paddingLeft) || 10;

      // Get tab size from settings
      this.tabSize = this.settings?.tabSize || 4;

      console.log("Indent guide metrics:", {
        charWidth: this.charWidth,
        lineHeight: this.lineHeight,
        paddingLeft: this.paddingLeft,
        tabSize: this.tabSize,
      });
    } catch (error) {
      console.error("Error calculating metrics:", error);
    }
  }

  setupEventListeners() {
    // Update on editor content changes
    this.editor.addEventListener("input", () => {
      this.updateActiveGuides();
    });

    // Update on scroll
    this.editor.addEventListener("scroll", () => {
      this.updateGuidePositions();
    });

    // Update on resize
    const resizeObserver = new ResizeObserver(() => {
      this.calculateMetrics();
      this.renderGuides();
    });

    if (this.editor) {
      resizeObserver.observe(this.editor);
    }

    // Update on cursor movement
    this.editor.addEventListener("keyup", () => {
      this.updateActiveGuides();
    });

    this.editor.addEventListener("click", () => {
      this.updateActiveGuides();
    });

    this.editor.addEventListener("mouseup", () => {
      this.updateActiveGuides();
    });

    // Update when settings change
    if (this.ui) {
      // Override applySettings to include updates
      const originalApplySettings = this.ui.applySettings?.bind(this.ui);
      if (originalApplySettings) {
        this.ui.applySettings = () => {
          originalApplySettings();
          this.onSettingsChanged();
        };
      }
    }
  }

  renderGuides() {
    if (!this.container) return;

    // Clear existing guides
    this.container.innerHTML = "";
    this.guides = [];

    // Calculate how many guides we need based on editor width
    const editorWidth = this.editor.clientWidth || 800;
    const maxGuides = Math.floor(
      (editorWidth - this.paddingLeft) / (this.charWidth * this.tabSize),
    );

    // Create guides (up to 20 levels max)
    const guideCount = Math.min(20, maxGuides);

    // Calculate total content height
    const contentHeight = Math.max(
      this.editor.scrollHeight,
      this.editor.clientHeight * 10, // Make guides 10x viewport height
    );

    for (let i = 1; i <= guideCount; i++) {
      const guide = document.createElement("div");
      guide.className = "indent-guide";
      guide.dataset.level = i;

      // Position the guide
      guide.style.position = "absolute";
      guide.style.left = `${this.paddingLeft + i * this.tabSize * this.charWidth}px`;
      guide.style.top = "0";

      // Make guides very tall to cover the entire document
      guide.style.height = `${contentHeight * 2}px`; // Double the content height
      guide.style.width = "1px";
      guide.style.zIndex = "0";
      guide.style.pointerEvents = "none";

      this.container.appendChild(guide);
      this.guides.push(guide);
    }

    // Update based on current content
    this.updateActiveGuides();
    this.updateGuidePositions();
  }

  updateAll() {
    this.calculateMetrics();
    this.renderGuides();
  }

  updateGuidePositions() {
    if (!this.container || !this.editor) return;

    const scrollTop = this.editor.scrollTop;

    this.guides.forEach((guide) => {
      guide.style.top = `-${scrollTop}px`;
    });
  }

  updateActiveGuides() {
    if (!this.guides.length) return;

    // Get current cursor position
    const cursorPos = this.editor.selectionStart;
    const textBeforeCursor = this.editor.value.substring(0, cursorPos);

    // Get current line from cursor position
    const lines = textBeforeCursor.split("\n");
    const currentLineIndex = lines.length - 1;
    const currentLine = lines[currentLineIndex] || "";

    // Calculate current indentation level
    const currentIndent = this.getIndentLevel(currentLine);

    // Get all lines to find which indent levels are actually used
    const allLines = this.editor.value.split("\n");
    const usedLevels = new Set();

    // Check a range around visible area for efficiency
    const visibleRange = this.getVisibleLineRange();
    const start = Math.max(0, visibleRange.start - 5);
    const end = Math.min(allLines.length - 1, visibleRange.end + 5);

    for (let i = start; i <= end; i++) {
      const line = allLines[i];
      if (line && line.trim()) {
        // Skip empty lines
        const level = this.getIndentLevel(line);
        if (level > 0) {
          usedLevels.add(level);
        }
      }
    }

    // Update guide states
    this.guides.forEach((guide) => {
      const level = parseInt(guide.dataset.level);

      // Remove all state classes
      guide.classList.remove("active", "highlighted");

      // Add appropriate classes
      if (usedLevels.has(level)) {
        guide.classList.add("active");
      }

      if (level === currentIndent) {
        guide.classList.add("highlighted");
      }
    });
  }

  getIndentLevel(line) {
    if (!line) return 0;

    let spaces = 0;
    let tabs = 0;

    for (let i = 0; i < line.length; i++) {
      if (line[i] === " ") {
        spaces++;
      } else if (line[i] === "\t") {
        tabs++;
      } else {
        break; // Stop at first non-whitespace character
      }
    }

    // Convert spaces to tab equivalents
    const spaceTabs = Math.floor(spaces / this.tabSize);
    return tabs + spaceTabs;
  }

  getVisibleLineRange() {
    if (!this.editor) return { start: 0, end: 10 };

    const scrollTop = this.editor.scrollTop;
    const clientHeight = this.editor.clientHeight;

    const startLine = Math.floor(scrollTop / this.lineHeight);
    const endLine = Math.ceil((scrollTop + clientHeight) / this.lineHeight);

    return {
      start: Math.max(0, startLine),
      end: Math.max(startLine, endLine),
    };
  }

  onSettingsChanged() {
    this.calculateMetrics();
    this.renderGuides();
  }

  show() {
    this.visible = true;
    if (this.container) {
      this.container.classList.add("visible");
    }
    this.updateAll();
  }

  hide() {
    this.visible = false;
    if (this.container) {
      this.container.classList.remove("visible");
    }
  }

  toggle() {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
    return this.visible;
  }

  refresh() {
    this.updateAll();
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Wait for editorUI to be available
  const initInterval = setInterval(() => {
    if (window.editorUI) {
      clearInterval(initInterval);

      // Initialize with a small delay to ensure DOM is ready
      setTimeout(() => {
        try {
          window.indentGuidesManager = new IndentGuidesManager(window.editorUI);
          console.log("Indent guides initialized");
        } catch (error) {
          console.error("Failed to initialize indent guides:", error);
        }
      }, 500);
    }
  }, 100);
});
