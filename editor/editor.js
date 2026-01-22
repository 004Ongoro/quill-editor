// Core editor functionality - Fixed for long files
class CodeEditorCore {
    constructor(textareaElement, overlayElement) {
        this.textarea = textareaElement;
        this.overlay = overlayElement;
        this.setupEditor();
    }
    
    setupEditor() {
        // Set initial styles and properties
        this.textarea.style.fontFamily = "'Consolas', 'Courier New', monospace";
        this.textarea.style.fontSize = '14px';
        this.textarea.style.lineHeight = '1.5';
        this.textarea.style.tabSize = '4';
        this.textarea.style.whiteSpace = 'pre';
        this.textarea.style.overflowWrap = 'normal';
        this.textarea.style.overflowX = 'auto';
        
        // Ensure the overlay matches the textarea
        this.syncOverlay();
        
        // Handle very long files
        this.setupPerformanceOptimizations();
    }
    
    setupPerformanceOptimizations() {
        // Use requestAnimationFrame for smooth scrolling
        // let scrollTimeout;
        // this.textarea.addEventListener('scroll', () => {
        //     if (scrollTimeout) {
        //         cancelAnimationFrame(scrollTimeout);
        //     }
        //     scrollTimeout = requestAnimationFrame(() => {
        //         this.syncScroll();
        //     });
        // });
        
        // Handle large files by optimizing updates
        this.textarea.addEventListener('input', () => {
            // Use debouncing for large files
            if (this.textarea.value.length > 10000) {
                this.optimizeLargeFileUpdate();
            }
        });
    }
    
    optimizeLargeFileUpdate() {
        // For large files, update line numbers in chunks
        const lines = this.textarea.value.split('\n');
        if (lines.length > 1000) {
            // Only update visible line numbers
            this.updateVisibleLineNumbers();
        }
    }
    
    updateVisibleLineNumbers() {
        const lineNumbers = document.getElementById('lineNumbers');
        if (!lineNumbers) return;
        
        const scrollTop = this.textarea.scrollTop;
        const lineHeight = 21; // Approximate line height
        const visibleStart = Math.floor(scrollTop / lineHeight);
        const visibleEnd = visibleStart + Math.ceil(this.textarea.clientHeight / lineHeight);
        
        // Only update visible lines
        const lines = this.textarea.value.split('\n');
        let lineNumbersHTML = '';
        
        for (let i = visibleStart; i <= Math.min(visibleEnd, lines.length); i++) {
            lineNumbersHTML += `<div class="line-number">${i + 1}</div>`;
        }
        
        lineNumbers.innerHTML = lineNumbersHTML;
        lineNumbers.style.paddingTop = `${visibleStart * lineHeight}px`;
        lineNumbers.style.height = `${lines.length * lineHeight}px`;
    }
    
    syncOverlay() {
        // Copy all relevant styles from textarea to overlay
        const computedStyle = window.getComputedStyle(this.textarea);
        
        this.overlay.style.fontFamily = computedStyle.fontFamily;
        this.overlay.style.fontSize = computedStyle.fontSize;
        this.overlay.style.lineHeight = computedStyle.lineHeight;
        this.overlay.style.padding = computedStyle.padding;
        this.overlay.style.width = computedStyle.width;
        this.overlay.style.letterSpacing = computedStyle.letterSpacing;
        this.overlay.style.whiteSpace = computedStyle.whiteSpace;
        this.overlay.style.tabSize = computedStyle.tabSize;
    }
    
    getContent() {
        return this.textarea.value;
    }
    
    setContent(content) {
        // For very large files, set content in a way that doesn't block UI
        if (content.length > 500000) { // 500KB threshold
            this.setLargeContent(content);
        } else {
            this.textarea.value = content;
            this.textarea.dispatchEvent(new Event('input'));
        }
    }
    
    setLargeContent(content) {
        // Set content in chunks to avoid UI freeze
        const chunkSize = 100000;
        let position = 0;
        
        const setChunk = () => {
            const chunk = content.substring(position, position + chunkSize);
            this.textarea.value += chunk;
            position += chunkSize;
            
            if (position < content.length) {
                // Continue in next frame
                requestAnimationFrame(setChunk);
            } else {
                // Done
                this.textarea.dispatchEvent(new Event('input'));
            }
        };
        
        // Clear existing content
        this.textarea.value = '';
        // Start chunked loading
        requestAnimationFrame(setChunk);
    }
    
    insertText(text) {
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        const currentValue = this.textarea.value;
        
        this.textarea.value = currentValue.substring(0, start) + 
                               text + 
                               currentValue.substring(end);
        
        // Move cursor to end of inserted text
        this.textarea.selectionStart = this.textarea.selectionEnd = start + text.length;
        
        // Trigger input event
        this.textarea.dispatchEvent(new Event('input'));
    }
    
    getCursorPosition() {
        return {
            start: this.textarea.selectionStart,
            end: this.textarea.selectionEnd
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
        const lines = textBeforeCursor.split('\n');
        return lines[lines.length - 1];
    }
    
    getCurrentLineNumber() {
        const cursorPos = this.textarea.selectionStart;
        const textBeforeCursor = this.textarea.value.substring(0, cursorPos);
        return textBeforeCursor.split('\n').length;
    }
    
    // Auto-indentation on new line
    handleNewLine() {
        const cursorPos = this.textarea.selectionStart;
        const textBeforeCursor = this.textarea.value.substring(0, cursorPos);
        const currentLine = textBeforeCursor.split('\n').pop();
        
        // Count leading spaces/tabs
        const indentMatch = currentLine.match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[1] : '';
        
        // Insert new line with same indentation
        this.insertText('\n' + indent);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const textarea = document.getElementById('codeEditor');
    const overlay = document.getElementById('syntaxHighlight');
    
    if (textarea && overlay) {
        window.codeEditor = new CodeEditorCore(textarea, overlay);
    }
});