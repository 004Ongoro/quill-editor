class DebuggerEngine {
    constructor() {
        this.breakpoints = new Set();
        this.isRunning = false;
        this.executionPaused = false;
        this.callStack = [];
        this.watchExpressions = new Map();
    }
    
    // Set breakpoint at a specific line
    setBreakpoint(lineNumber) {
        this.breakpoints.add(lineNumber);
        this.highlightBreakpoint(lineNumber);
        return true;
    }
    
    // Remove breakpoint
    removeBreakpoint(lineNumber) {
        this.breakpoints.delete(lineNumber);
        this.removeBreakpointHighlight(lineNumber);
        return true;
    }
    
    // Toggle breakpoint
    toggleBreakpoint(lineNumber) {
        if (this.breakpoints.has(lineNumber)) {
            this.removeBreakpoint(lineNumber);
            return false;
        } else {
            this.setBreakpoint(lineNumber);
            return true;
        }
    }
    
    // Highlight breakpoint in UI
    highlightBreakpoint(lineNumber) {
        const lineNumbers = document.getElementById('lineNumbers');
        if (!lineNumbers) return;
        
        const lineElements = lineNumbers.querySelectorAll('.line-number');
        if (lineElements[lineNumber - 1]) {
            lineElements[lineNumber - 1].style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
            lineElements[lineNumber - 1].style.color = '#ff6b6b';
        }
    }
    
    // Remove breakpoint highlight
    removeBreakpointHighlight(lineNumber) {
        const lineNumbers = document.getElementById('lineNumbers');
        if (!lineNumbers) return;
        
        const lineElements = lineNumbers.querySelectorAll('.line-number');
        if (lineElements[lineNumber - 1]) {
            lineElements[lineNumber - 1].style.backgroundColor = '';
            lineElements[lineNumber - 1].style.color = '#858585';
        }
    }
    
    // Add watch expression
    addWatchExpression(expression) {
        const id = Date.now() + Math.random();
        this.watchExpressions.set(id, {
            expression: expression,
            value: null,
            lastUpdated: null
        });
        return id;
    }
    
    // Remove watch expression
    removeWatchExpression(id) {
        return this.watchExpressions.delete(id);
    }
    
    // Evaluate watch expressions
    evaluateWatchExpressions(context = {}) {
        const results = [];
        
        for (const [id, watch] of this.watchExpressions) {
            try {
                // Create a safe evaluation context
                const evalFunc = new Function(...Object.keys(context), 
                    `return (${watch.expression})`);
                
                const value = evalFunc(...Object.values(context));
                watch.value = value;
                watch.lastUpdated = new Date();
                
                results.push({
                    id: id,
                    expression: watch.expression,
                    value: value,
                    type: typeof value
                });
            } catch (error) {
                results.push({
                    id: id,
                    expression: watch.expression,
                    value: error.message,
                    type: 'error'
                });
            }
        }
        
        return results;
    }
    
    // Step through code execution
    async stepThroughCode(code, context = {}) {
        if (this.isRunning) {
            console.warn('Debugger is already running');
            return;
        }
        
        this.isRunning = true;
        this.executionPaused = false;
        this.callStack = [];
        
        const lines = code.split('\n');
        let currentLine = 0;
        
        // Create execution context with debugger functions
        const debugContext = {
            ...context,
            __debugger: this,
            __currentLine: () => currentLine + 1,
            __pause: () => {
                this.executionPaused = true;
                return new Promise(resolve => {
                    const checkPause = () => {
                        if (!this.executionPaused) {
                            resolve();
                        } else {
                            setTimeout(checkPause, 100);
                        }
                    };
                    checkPause();
                });
            }
        };
        
        // Execute line by line
        while (currentLine < lines.length && this.isRunning) {
            const lineNumber = currentLine + 1;
            const lineCode = lines[currentLine];
            
            // Check for breakpoint
            if (this.breakpoints.has(lineNumber)) {
                this.executionPaused = true;
                this.highlightCurrentLine(lineNumber);
                
                // Wait for user to continue
                await debugContext.__pause();
                
                this.removeCurrentLineHighlight();
            }
            
            try {
                // Execute the line
                const evalFunc = new Function(...Object.keys(debugContext), lineCode);
                evalFunc(...Object.values(debugContext));
                
                // Update call stack
                this.callStack.push({
                    line: lineNumber,
                    code: lineCode.trim()
                });
                
                // Keep call stack size manageable
                if (this.callStack.length > 100) {
                    this.callStack.shift();
                }
                
            } catch (error) {
                console.error(`Error at line ${lineNumber}:`, error);
                this.addConsoleMessage(`Error at line ${lineNumber}: ${error.message}`, 'error');
                
                // Optionally pause on error
                if (this.pauseOnError) {
                    this.executionPaused = true;
                    await debugContext.__pause();
                }
            }
            
            currentLine++;
            
            // Small delay to make stepping visible
            if (this.stepDelay > 0) {
                await new Promise(resolve => setTimeout(resolve, this.stepDelay));
            }
        }
        
        this.isRunning = false;
        this.executionPaused = false;
        return this.callStack;
    }
    
    // Highlight current execution line
    highlightCurrentLine(lineNumber) {
        const lineNumbers = document.getElementById('lineNumbers');
        if (!lineNumbers) return;
        
        const lineElements = lineNumbers.querySelectorAll('.line-number');
        if (lineElements[lineNumber - 1]) {
            lineElements[lineNumber - 1].style.backgroundColor = 'rgba(255, 255, 0, 0.3)';
            lineElements[lineNumber - 1].style.color = '#fff';
            lineElements[lineNumber - 1].scrollIntoView({ block: 'center' });
        }
        
        // Also scroll editor to this line
        const editor = document.getElementById('codeEditor');
        if (editor) {
            const lineHeight = 20; // Approximate line height in pixels
            editor.scrollTop = (lineNumber - 1) * lineHeight - editor.clientHeight / 2;
        }
    }
    
    // Remove current line highlight
    removeCurrentLineHighlight() {
        const lineNumbers = document.getElementById('lineNumbers');
        if (!lineNumbers) return;
        
        const lineElements = lineNumbers.querySelectorAll('.line-number');
        lineElements.forEach(el => {
            if (el.style.backgroundColor === 'rgba(255, 255, 0, 0.3)') {
                el.style.backgroundColor = '';
                el.style.color = '#858585';
            }
        });
    }
    
    // Continue execution
    continueExecution() {
        this.executionPaused = false;
    }
    
    // Stop execution
    stopExecution() {
        this.isRunning = false;
        this.executionPaused = false;
        this.removeCurrentLineHighlight();
    }
    
    // Get call stack
    getCallStack() {
        return [...this.callStack];
    }
    
    // Clear all breakpoints
    clearAllBreakpoints() {
        this.breakpoints.forEach(lineNumber => {
            this.removeBreakpointHighlight(lineNumber);
        });
        this.breakpoints.clear();
    }
    
    // Add console message (helper method)
    addConsoleMessage(message, type = 'info') {
        if (window.editorUI && window.editorUI.addConsoleMessage) {
            window.editorUI.addConsoleMessage(message, type);
        } else {
            console[type === 'error' ? 'error' : 
                    type === 'warning' ? 'warn' : 'log'](message);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.debuggerEngine = new DebuggerEngine();
    
    // Add breakpoint toggle on line number click
    const lineNumbers = document.getElementById('lineNumbers');
    if (lineNumbers) {
        lineNumbers.addEventListener('click', (e) => {
            if (e.target.classList.contains('line-number')) {
                const lineNumber = Array.from(
                    lineNumbers.querySelectorAll('.line-number')
                ).indexOf(e.target) + 1;
                
                if (window.debuggerEngine.toggleBreakpoint(lineNumber)) {
                    console.log(`Breakpoint set at line ${lineNumber}`);
                } else {
                    console.log(`Breakpoint removed at line ${lineNumber}`);
                }
            }
        });
    }
    
    // Connect debug buttons
    const debugStartBtn = document.getElementById('debugStart');
    const debugStopBtn = document.getElementById('debugStop');
    
    if (debugStartBtn) {
        debugStartBtn.addEventListener('click', () => {
            if (window.editorUI) {
                window.editorUI.runCode();
            }
        });
    }
    
    if (debugStopBtn) {
        debugStopBtn.addEventListener('click', () => {
            window.debuggerEngine.stopExecution();
        });
    }
    
    // Add keyboard shortcuts for debugging
    document.addEventListener('keydown', (e) => {
        // F9 to toggle breakpoint at current line
        if (e.key === 'F9') {
            e.preventDefault();
            if (window.editorUI && window.codeEditor) {
                const lineNumber = window.codeEditor.getCurrentLineNumber();
                window.debuggerEngine.toggleBreakpoint(lineNumber);
            }
        }
        
        // F10 to step over (Ctrl+F10)
        if (e.key === 'F10' && e.ctrlKey) {
            e.preventDefault();
            if (window.debuggerEngine.executionPaused) {
                window.debuggerEngine.continueExecution();
            }
        }
        
        // F5 for run/debug
        if (e.key === 'F5' && !e.ctrlKey && !e.shiftKey) {
            e.preventDefault();
            if (window.editorUI) {
                window.editorUI.runCode();
            }
        }
    });
});