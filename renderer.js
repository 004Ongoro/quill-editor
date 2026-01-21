// Renderer process - Main UI Manager
class QuillEditorUI {
    constructor() {
        this.tabs = [];
        this.activeTabId = null;
        this.workspacePath = null;
        this.currentLanguage = 'javascript';
        this.isDirty = false;
        this.nextTabId = 1;
        
        this.initializeElements();
        this.setupEventListeners();
        this.setupElectronListeners();
        this.setupActivityBar();
        this.updateLineNumbers();
        this.updateStatusBar();
        this.lastKeyWasCtrlK = false;
        
        // Create initial tab
        this.createNewTab();
        
        console.log('QuillEditor UI initialized');
    }
    
    initializeElements() {
        // Get DOM elements
        this.codeEditor = document.getElementById('codeEditor');
        this.syntaxHighlight = document.getElementById('syntaxHighlight');
        this.lineNumbers = document.getElementById('lineNumbers');
        this.tabBar = document.getElementById('tabBar');
        this.openEditorsList = document.getElementById('openEditorsList');
        
        // Status bar elements
        this.cursorPositionElement = document.getElementById('cursorPosition');
        this.selectionInfoElement = document.getElementById('selectionInfo');
        this.languageInfoElement = document.getElementById('languageInfo');
        this.lineCountElement = document.getElementById('lineCount');
        this.charCountElement = document.getElementById('charCount');
        this.fileInfoElement = document.getElementById('fileInfo');
        this.fileStatusElement = document.getElementById('fileStatus');
        
        // Console elements
        this.consoleOutput = document.getElementById('consoleOutput');
        this.clearConsoleBtn = document.getElementById('clearConsoleBtn');
        this.toggleConsoleBtn = document.getElementById('toggleConsoleBtn');
        
        // Activity bar and panels
        this.activityItems = document.querySelectorAll('.activity-item');
        this.sidebarPanels = document.querySelectorAll('.sidebar-panel');
        
        // Console tabs
        this.consoleTabs = document.querySelectorAll('.console-tab');
        this.consoleContents = document.querySelectorAll('.console-content');
    }
    
    setupEventListeners() {
        // Editor events
        this.codeEditor.addEventListener('input', () => this.onEditorInput());
        this.codeEditor.addEventListener('scroll', () => this.syncScroll());
        this.codeEditor.addEventListener('keydown', (e) => this.handleKeyDown(e));
        this.codeEditor.addEventListener('click', () => this.updateCursorPosition());
        this.codeEditor.addEventListener('keyup', () => this.updateCursorPosition());
        this.codeEditor.addEventListener('select', () => this.updateSelectionInfo());
        
        // Tab events
        document.getElementById('addTabBtn')?.addEventListener('click', () => this.createNewTab());
        
        // Console events
        this.clearConsoleBtn?.addEventListener('click', () => this.clearConsole());
        this.toggleConsoleBtn?.addEventListener('click', () => this.toggleConsole());
        
        // Console tab events
        this.consoleTabs.forEach(tab => {
            tab.addEventListener('click', (e) => this.switchConsoleTab(e.target));
        });
        
        // Close all tabs button
        document.getElementById('closeAllTabs')?.addEventListener('click', () => this.closeAllTabs());
    }
    
    setupElectronListeners() {
        if (!window.electronAPI) {
            console.error('Electron API not available');
            return;
        }

        // Listen for events from main process
        window.electronAPI.onFolderOpened((_, data) => {
        if (!data.success) return;

        treeView.currentWorkspace = data.path;
        treeView.treeData = treeView.normalize(data.items);
        treeView.expanded.clear();
        treeView.render();
        });

        
        window.electronAPI.onFileOpened((event, data) => {
            this.openFileFromPath(data.path, data.content);
        });
        
        window.electronAPI.onFileSave((event, path) => {
            this.saveFileToPath(path);
        });
        
        window.electronAPI.onFileNew(() => {
            this.createNewTab();
        });
        
        window.electronAPI.onDebugRun(() => {
            this.runCode();
        });
        
        window.electronAPI.onDebugStop(() => {
            this.stopCode();
        });
    }
    
    setupActivityBar() {
        this.activityItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const panelId = e.currentTarget.dataset.panel;
                this.switchSidebarPanel(panelId);
            });
        });
    }
    
    switchSidebarPanel(panelId) {
        // Update activity bar
        this.activityItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.panel === panelId) {
                item.classList.add('active');
            }
        });
        
        // Update sidebar panels
        this.sidebarPanels.forEach(panel => {
            panel.classList.remove('active');
            if (panel.id === `${panelId}-panel`) {
                panel.classList.add('active');
            }
        });
    }
    
    createNewTab(title = 'Untitled', content = '', filePath = null, language = 'javascript') {
        const tabId = `tab-${this.nextTabId++}`;
        const tab = {
            id: tabId,
            title: title,
            content: content,
            filePath: filePath,
            language: language,
            isDirty: false
        };
        
        this.tabs.push(tab);
        
        // Create tab element
        const tabElement = this.createTabElement(tab);
        this.tabBar.insertBefore(tabElement, this.tabBar.querySelector('.tab-spacer'));
        
        // Create open editor item
        this.updateOpenEditorsList();
        
        // Switch to new tab
        this.switchTab(tabId);
        
        return tabId;
    }
    
    createTabElement(tab) {
        const tabElement = document.createElement('div');
        tabElement.className = 'tab';
        tabElement.dataset.id = tab.id;
        
        const iconClass = this.getFileIconClass(tab.filePath);
        
        tabElement.innerHTML = `
            <i class="tab-icon ${iconClass}"></i>
            <span class="tab-name">${tab.title}</span>
            <button class="tab-close">&times;</button>
        `;
        
        // Add event listeners
        tabElement.addEventListener('click', (e) => {
            if (!e.target.classList.contains('tab-close')) {
                this.switchTab(tab.id);
            }
        });
        
        const closeBtn = tabElement.querySelector('.tab-close');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeTab(tab.id);
        });
        
        return tabElement;
    }
    
    switchTab(tabId) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab) return;
        
        // Update active tab in UI
        document.querySelectorAll('.tab').forEach(tabEl => {
            tabEl.classList.remove('active');
        });
        
        const tabElement = document.querySelector(`.tab[data-id="${tabId}"]`);
        if (tabElement) {
            tabElement.classList.add('active');
        }
        
        // Update active editor item
        document.querySelectorAll('.editor-tab-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const editorItem = document.querySelector(`.editor-tab-item[data-id="${tabId}"]`);
        if (editorItem) {
            editorItem.classList.add('active');
        }
        
        // Update editor content
        this.activeTabId = tabId;
        this.codeEditor.value = tab.content;
        this.currentLanguage = tab.language;
        this.isDirty = tab.isDirty;
        
        // Update UI
        this.updateLineNumbers();
        this.applySyntaxHighlighting();
        this.updateStatusBar();
        this.syncScroll();
        
        // Focus editor
        this.codeEditor.focus();
    }
    
    closeTab(tabId) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab) return;
        
        // Check for unsaved changes
        if (tab.isDirty) {
            if (!confirm(`Save changes to "${tab.title}" before closing?`)) {
                // User chose not to save
                this.forceCloseTab(tabId);
            } else {
                // Save before closing
                this.saveCurrentTab(() => {
                    this.forceCloseTab(tabId);
                });
            }
        } else {
            this.forceCloseTab(tabId);
        }
    }
    
    forceCloseTab(tabId) {
        const tabIndex = this.tabs.findIndex(t => t.id === tabId);
        if (tabIndex === -1) return;
        
        // Remove tab from array
        this.tabs.splice(tabIndex, 1);
        
        // Remove tab element
        const tabElement = document.querySelector(`.tab[data-id="${tabId}"]`);
        if (tabElement) {
            tabElement.remove();
        }
        
        // Remove from open editors list
        const editorItem = document.querySelector(`.editor-tab-item[data-id="${tabId}"]`);
        if (editorItem) {
            editorItem.remove();
        }
        
        // If this was the active tab, switch to another
        if (this.activeTabId === tabId) {
            if (this.tabs.length > 0) {
                // Switch to next tab or previous if last
                const newTabIndex = Math.min(tabIndex, this.tabs.length - 1);
                this.switchTab(this.tabs[newTabIndex].id);
            } else {
                // No tabs left, create a new one
                this.createNewTab();
            }
        }
    }
    
    closeOtherTabs(tabId) {
        this.tabs.forEach(tab => {
            if (tab.id !== tabId) {
                this.closeTab(tab.id);
            }
        });
    }
    
    closeAllTabs() {
        // Close all tabs
        const tabIds = this.tabs.map(tab => tab.id);
        tabIds.forEach(id => {
            this.closeTab(id);
        });
    }
    
    updateOpenEditorsList() {
        if (!this.openEditorsList) return;
        
        this.openEditorsList.innerHTML = '';
        
        this.tabs.forEach(tab => {
            const editorItem = document.createElement('div');
            editorItem.className = 'editor-tab-item';
            editorItem.dataset.id = tab.id;
            
            if (tab.id === this.activeTabId) {
                editorItem.classList.add('active');
            }
            
            const iconClass = this.getFileIconClass(tab.filePath);
            
            editorItem.innerHTML = `
                <i class="editor-tab-icon ${iconClass}"></i>
                <span class="editor-tab-name">${tab.title}</span>
                <button class="editor-tab-close">&times;</button>
            `;
            
            editorItem.addEventListener('click', (e) => {
                if (!e.target.classList.contains('editor-tab-close')) {
                    this.switchTab(tab.id);
                }
            });
            
            const closeBtn = editorItem.querySelector('.editor-tab-close');
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeTab(tab.id);
            });
            
            this.openEditorsList.appendChild(editorItem);
        });
    }
    
    getFileIconClass(filePath) {
        if (!filePath) return 'fas fa-file-code';
        
        const ext = filePath.split('.').pop().toLowerCase();
        const iconMap = {
            'js': 'fab fa-js',
            'jsx': 'fab fa-js',
            'ts': 'fas fa-file-code',
            'tsx': 'fas fa-file-code',
            'html': 'fab fa-html5',
            'htm': 'fab fa-html5',
            'css': 'fab fa-css3-alt',
            'scss': 'fab fa-sass',
            'sass': 'fab fa-sass',
            'py': 'fab fa-python',
            'json': 'fas fa-file-code',
            'md': 'fas fa-file-alt',
            'txt': 'fas fa-file-alt',
            'yml': 'fas fa-file-code',
            'yaml': 'fas fa-file-code'
        };
        
        return iconMap[ext] || 'fas fa-file-code';
    }
    
    getCurrentTab() {
        return this.tabs.find(tab => tab.id === this.activeTabId);
    }
    
    updateCurrentTabContent() {
        const tab = this.getCurrentTab();
        if (!tab) return;
        
        tab.content = this.codeEditor.value;
        tab.isDirty = this.isDirty;
        
        // Update tab UI if dirty
        const tabElement = document.querySelector(`.tab[data-id="${tab.id}"]`);
        if (tabElement) {
            if (tab.isDirty) {
                tabElement.classList.add('dirty');
            } else {
                tabElement.classList.remove('dirty');
            }
        }
    }
    
    onEditorInput() {
        this.isDirty = true;
        this.updateCurrentTabContent();
        
        // Update line numbers
        this.updateLineNumbers();
        
        // Apply syntax highlighting (debounced)
        this.debounceHighlight();
        
        // Update status bar
        this.updateStatusBar();
    }
    
    debounceHighlight() {
        if (this.highlightTimeout) {
            clearTimeout(this.highlightTimeout);
        }
        
        this.highlightTimeout = setTimeout(() => {
            this.applySyntaxHighlighting();
        }, 100);
    }
    
    updateLineNumbers() {
        const lines = this.codeEditor.value.split('\n').length;
        let lineNumbersHTML = '';
        
        for (let i = 1; i <= lines; i++) {
            lineNumbersHTML += `<div class="line-number">${i}</div>`;
        }
        
        this.lineNumbers.innerHTML = lineNumbersHTML;
        this.syncScroll();
    }
    
    syncScroll() {
        this.lineNumbers.scrollTop = this.codeEditor.scrollTop;
        if (this.syntaxHighlight) {
            this.syntaxHighlight.scrollTop = this.codeEditor.scrollTop;
            this.syntaxHighlight.scrollLeft = this.codeEditor.scrollLeft;
        }
    }
    
    updateStatusBar() {
        const content = this.codeEditor.value;
        const lines = content.split('\n').length;
        const chars = content.length;
        
        // Update counts
        this.lineCountElement.innerHTML = `<i class="fas fa-bars"></i> ${lines} ${lines === 1 ? 'line' : 'lines'}`;
        this.charCountElement.innerHTML = `<i class="fas fa-font"></i> ${chars} chars`;
        
        // Update language
        this.languageInfoElement.innerHTML = `<i class="fas fa-code"></i> ${this.currentLanguage.charAt(0).toUpperCase() + this.currentLanguage.slice(1)}`;
        
        // Update file info
        const tab = this.getCurrentTab();
        if (tab && tab.filePath) {
            const fileName = tab.filePath.split('/').pop();
            this.fileInfoElement.innerHTML = `<i class="fas fa-file"></i> ${fileName}`;
        } else {
            this.fileInfoElement.innerHTML = `<i class="fas fa-file"></i> ${tab?.title || 'Untitled'}`;
        }
        
        // Update file status
        if (this.isDirty) {
            this.fileStatusElement.innerHTML = `<i class="fas fa-circle" style="color: #f0db4f;"></i> Unsaved`;
        } else {
            this.fileStatusElement.innerHTML = `<i class="fas fa-circle" style="color: #27ae60;"></i> Saved`;
        }
    }
    
    updateCursorPosition() {
        const cursorPos = this.codeEditor.selectionStart;
        const textBeforeCursor = this.codeEditor.value.substring(0, cursorPos);
        const line = textBeforeCursor.split('\n').length;
        const column = textBeforeCursor.split('\n').pop().length + 1;
        
        this.cursorPositionElement.innerHTML = `<i class="fas fa-i-cursor"></i> Ln ${line}, Col ${column}`;
    }
    
    updateSelectionInfo() {
        const start = this.codeEditor.selectionStart;
        const end = this.codeEditor.selectionEnd;
        const selectedCount = end - start;
        
        if (selectedCount > 0) {
            const selectedText = this.codeEditor.value.substring(start, end);
            const lines = selectedText.split('\n').length;
            
            if (lines > 1) {
                this.selectionInfoElement.innerHTML = `<i class="fas fa-highlighter"></i> ${selectedCount} chars (${lines} lines)`;
            } else {
                this.selectionInfoElement.innerHTML = `<i class="fas fa-highlighter"></i> ${selectedCount} chars`;
            }
        } else {
            this.selectionInfoElement.innerHTML = `<i class="fas fa-highlighter"></i> 0 selected`;
        }
    }
    
    applySyntaxHighlighting() {
        if (!window.syntaxHighlighter || !this.syntaxHighlight) return;
        
        const code = this.codeEditor.value;
        const highlighted = window.syntaxHighlighter.highlight(code, this.currentLanguage);
        this.syntaxHighlight.innerHTML = highlighted;
        this.syncScroll();
    }
    
    handleKeyDown(e) {
        // Handle Tab key for indentation
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = this.codeEditor.selectionStart;
            const end = this.codeEditor.selectionEnd;
            
            // Insert 4 spaces
            this.codeEditor.value = this.codeEditor.value.substring(0, start) + '    ' + this.codeEditor.value.substring(end);
            
            // Set cursor position after the inserted spaces
            this.codeEditor.selectionStart = this.codeEditor.selectionEnd = start + 4;
            
            // Trigger input event
            this.codeEditor.dispatchEvent(new Event('input'));
        }
        
        // Handle Ctrl+S / Cmd+S for save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            this.saveFile();
        }
        
        // Handle Ctrl+O / Cmd+O for open
        if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
            e.preventDefault();
            this.openFile();
        }
        
        // Handle Ctrl+N / Cmd+N for new file
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            this.createNewTab();
        }
        
        // Handle Ctrl+W / Cmd+W for close tab
        if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
            e.preventDefault();
            this.closeTab(this.activeTabId);
        }
        
        // Handle Ctrl+Shift+E for explorer
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
            e.preventDefault();
            this.switchSidebarPanel('files');
        }
        
        // Handle Ctrl+Shift+F for search
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
            e.preventDefault();
            this.switchSidebarPanel('search');
        }
        
        // Handle Ctrl+, for settings
        if ((e.ctrlKey || e.metaKey) && e.key === ',') {
            e.preventDefault();
            this.switchSidebarPanel('settings');
        }
        
        // Handle F5 for run
        if (e.key === 'F5') {
            e.preventDefault();
            this.runCode();
        }


        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            // This is for Ctrl+K
            //two-key sequence
            e.preventDefault();
            this.lastKeyWasCtrlK = true;
            setTimeout(() => {
                this.lastKeyWasCtrlK = false;
            }, 1000);
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key === 'o' && this.lastKeyWasCtrlK) {
            e.preventDefault();
            this.openFolder();
        }
        
        // Handle Ctrl+Shift+O for open folder (alternative)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'O') {
            e.preventDefault();
            this.openFolder();
        }
    }
    
    openFile() {
        // This will trigger the electron main process to show open dialog
        console.log('Open file requested');
    }

    openFolder() {
        if (window.treeView && window.treeView.openFolder) {
            window.treeView.openFolder();
        }
    }
    
    openFileFromPath(path, content) {
        // Check if file is already open
        const existingTab = this.tabs.find(tab => tab.filePath === path);
        
        if (existingTab) {
            // Switch to existing tab
            this.switchTab(existingTab.id);
            
            // Update content if different
            if (existingTab.content !== content) {
                existingTab.content = content;
                this.codeEditor.value = content;
                this.isDirty = false;
                this.updateCurrentTabContent();
                this.updateLineNumbers();
                this.applySyntaxHighlighting();
            }
        } else {
            // Create new tab
            const fileName = path.split('/').pop();
            const language = this.detectLanguageFromPath(path);
            const tabId = this.createNewTab(fileName, content, path, language);
            
            // Update the tab with file info
            const tab = this.tabs.find(t => t.id === tabId);
            if (tab) {
                tab.filePath = path;
                tab.isDirty = false;
            }
            
            // Update UI
            this.updateOpenEditorsList();
        }
        
        this.isDirty = false;
        this.updateStatusBar();
        this.addConsoleMessage(`Opened: ${path}`, 'success');
    }
    
    detectLanguageFromPath(path) {
        const extension = path.split('.').pop().toLowerCase();
        
        const languageMap = {
            'js': 'javascript',
            'jsx': 'javascript',
            'mjs': 'javascript',
            'ts': 'javascript',
            'tsx': 'javascript',
            'html': 'html',
            'htm': 'html',
            'css': 'css',
            'py': 'python',
            'txt': 'plaintext',
            'md': 'plaintext',
            'json': 'javascript',
            'yml': 'plaintext',
            'yaml': 'plaintext'
        };
        
        const language = languageMap[extension] || 'plaintext';
        this.currentLanguage = language;
        return language;
    }
    
    async saveFile() {
        const tab = this.getCurrentTab();
        if (!tab) return;
        
        if (tab.filePath) {
            await this.saveFileToPath(tab.filePath);
        } else {
            // Trigger save as
            this.saveFileAs();
        }
    }
    
    triggerSaveAs() {
        this.saveFileAs();
    }
    
    async saveFileAs() {
        // This will trigger the main process to show save dialog
        // The actual saving is handled in the electron listener
        console.log('Save as requested');
    }
    
    saveCurrentTab(callback) {
        this.saveFile().then(() => {
            if (callback) callback();
        });
    }
    
    async saveFileToPath(path) {
        try {
            const content = this.codeEditor.value;
            const result = await window.electronAPI.writeFile(path, content);
            
            if (result.success) {
                // Update current tab
                const tab = this.getCurrentTab();
                if (tab) {
                    tab.filePath = path;
                    tab.title = path.split('/').pop();
                    tab.isDirty = false;
                    
                    // Update tab element
                    const tabElement = document.querySelector(`.tab[data-id="${tab.id}"]`);
                    if (tabElement) {
                        const tabName = tabElement.querySelector('.tab-name');
                        if (tabName) {
                            tabName.textContent = tab.title;
                        }
                        tabElement.classList.remove('dirty');
                    }
                    
                    // Update language
                    this.detectLanguageFromPath(path);
                }
                
                this.isDirty = false;
                this.updateStatusBar();
                this.updateOpenEditorsList();
                this.addConsoleMessage(`Saved: ${path}`, 'success');
            } else {
                this.addConsoleMessage(`Save failed: ${result.error}`, 'error');
            }
        } catch (error) {
            this.addConsoleMessage(`Save error: ${error.message}`, 'error');
        }
    }
    
    runCode() {
        const code = this.codeEditor.value;
        
        if (!code.trim()) {
            this.addConsoleMessage('No code to run', 'warning');
            return;
        }
        
        this.addConsoleMessage('Running code...', 'info');
        
        // Switch to output console
        this.switchConsoleTab(document.querySelector('.console-tab[data-console="output"]'));
        
        try {
            if (this.currentLanguage === 'javascript') {
                this.executeJavaScript(code);
            } else if (this.currentLanguage === 'html') {
                this.executeHTML(code);
            } else if (this.currentLanguage === 'css') {
                this.executeCSS(code);
            } else if (this.currentLanguage === 'python') {
                this.addConsoleMessage('Python execution requires server-side support', 'warning');
            } else {
                this.addConsoleMessage(`Execution for ${this.currentLanguage} not supported`, 'warning');
            }
        } catch (error) {
            this.addConsoleMessage(`Execution error: ${error.message}`, 'error');
        }
    }
    
    executeJavaScript(code) {
        // Override console methods to capture output
        const originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info
        };
        
        console.log = (...args) => {
            originalConsole.log.apply(console, args);
            this.addConsoleMessage(args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' '), 'info');
        };
        
        console.error = (...args) => {
            originalConsole.error.apply(console, args);
            this.addConsoleMessage(args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' '), 'error');
        };
        
        console.warn = (...args) => {
            originalConsole.warn.apply(console, args);
            this.addConsoleMessage(args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' '), 'warning');
        };
        
        try {
            // Execute the code
            eval(code);
            this.addConsoleMessage('Execution completed successfully', 'success');
        } catch (error) {
            this.addConsoleMessage(`Runtime error: ${error.message}`, 'error');
        } finally {
            // Restore original console methods
            console.log = originalConsole.log;
            console.error = originalConsole.error;
            console.warn = originalConsole.warn;
            console.info = originalConsole.info;
        }
    }
    
    executeHTML(code) {
        // Create an iframe to safely render HTML
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(code);
        iframeDoc.close();
        
        // Check for console output
        const scripts = iframeDoc.querySelectorAll('script');
        if (scripts.length > 0) {
            this.addConsoleMessage('HTML contains JavaScript. Output may appear above.', 'info');
        }
        
        this.addConsoleMessage('HTML rendered successfully', 'success');
        
        // Clean up
        setTimeout(() => document.body.removeChild(iframe), 1000);
    }
    
    executeCSS(code) {
        // Create a style element and apply to test element
        const testElement = document.createElement('div');
        testElement.id = 'css-test-element';
        testElement.style.display = 'none';
        testElement.textContent = 'CSS Test';
        document.body.appendChild(testElement);
        
        const style = document.createElement('style');
        style.textContent = code;
        document.head.appendChild(style);
        
        this.addConsoleMessage('CSS applied to test element', 'success');
        
        // Clean up
        setTimeout(() => {
            document.head.removeChild(style);
            document.body.removeChild(testElement);
        }, 1000);
    }
    
    stopCode() {
        this.addConsoleMessage('Execution stopped', 'warning');
    }
    
    switchConsoleTab(tabElement) {
        const consoleType = tabElement.dataset.console;
        
        // Update active tab
        this.consoleTabs.forEach(tab => tab.classList.remove('active'));
        tabElement.classList.add('active');
        
        // Update active content
        this.consoleContents.forEach(content => content.classList.remove('active'));
        document.getElementById(`${consoleType}Console`)?.classList.add('active');
    }
    
    clearConsole() {
        if (this.consoleOutput) {
            this.consoleOutput.innerHTML = '';
        }
    }
    
    toggleConsole() {
        const consolePanel = document.querySelector('.console-panel');
        if (consolePanel) {
            const isHidden = consolePanel.style.height === '0px' || consolePanel.style.display === 'none';
            
            if (isHidden) {
                consolePanel.style.height = `${this.consoleHeight || 200}px`;
                consolePanel.style.display = 'flex';
                this.toggleConsoleBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
            } else {
                this.consoleHeight = consolePanel.offsetHeight;
                consolePanel.style.height = '0px';
                setTimeout(() => {
                    consolePanel.style.display = 'none';
                }, 300);
                this.toggleConsoleBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
            }
        }
    }
    
    addConsoleMessage(message, type = 'info') {
        if (!this.consoleOutput) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = `console-message ${type}`;
        
        const iconMap = {
            'info': 'fa-info-circle',
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-circle',
            'warning': 'fa-exclamation-triangle'
        };
        
        messageElement.innerHTML = `
            <i class="fas ${iconMap[type] || 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;
        
        this.consoleOutput.appendChild(messageElement);
        this.consoleOutput.scrollTop = this.consoleOutput.scrollHeight;
    }
}

// Initialize the editor when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.editorUI = new QuillEditorUI();
});