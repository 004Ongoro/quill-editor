class ContextMenuManager {
    constructor() {
        this.tabContextMenu = document.getElementById('tabContextMenu');
        this.editorContextMenu = document.getElementById('editorContextMenu');
        
        this.activeTab = null;
        this.activeMenu = null;
        
        this.initialize();
    }
    
    initialize() {
        this.setupEventListeners();
        this.setupElectronListeners();
    }
    
    setupEventListeners() {
        // Close context menus when clicking elsewhere
        document.addEventListener('click', (e) => {
            if (!this.tabContextMenu.contains(e.target) && !this.editorContextMenu.contains(e.target)) {
                this.hideAllMenus();
            }
        });
        
        // Tab bar context menu
        const tabBar = document.getElementById('tabBar');
        if (tabBar) {
            tabBar.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const tab = e.target.closest('.tab');
                if (tab) {
                    this.showTabContextMenu(e, tab);
                }
            });
        }
        
        // Editor context menu
        const codeEditor = document.getElementById('codeEditor');
        if (codeEditor) {
            codeEditor.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showEditorContextMenu(e);
            });
        }
        
        // Context menu item clicks
        this.setupMenuActions();
    }
    
    setupElectronListeners() {
        if (!window.electronAPI) return;
        
        // Listen for context menu actions from main process
        window.electronAPI.onTabContextMenuAction((event, action) => {
            this.handleTabContextAction(action);
        });
        
        window.electronAPI.onEditorContextMenuAction((event, action) => {
            this.handleEditorContextAction(action);
        });
    }
    
    setupMenuActions() {
        // Tab context menu actions
        const tabMenuItems = this.tabContextMenu.querySelectorAll('.context-menu-item');
        tabMenuItems.forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                this.handleTabContextAction(action);
                this.hideAllMenus();
            });
        });
        
        // Editor context menu actions
        const editorMenuItems = this.editorContextMenu.querySelectorAll('.context-menu-item');
        editorMenuItems.forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                this.handleEditorContextAction(action);
                this.hideAllMenus();
            });
        });
    }
    
    showTabContextMenu(e, tab) {
        this.activeTab = tab;
        
        // Position the menu
        this.tabContextMenu.style.left = `${e.pageX}px`;
        this.tabContextMenu.style.top = `${e.pageY}px`;
        
        // Show menu
        this.hideAllMenus();
        this.tabContextMenu.classList.add('active');
        this.activeMenu = this.tabContextMenu;
        
        // Update menu items based on tab state
        this.updateTabContextMenu(tab);
    }
    
    showEditorContextMenu(e) {
        // Position the menu
        this.editorContextMenu.style.left = `${e.pageX}px`;
        this.editorContextMenu.style.top = `${e.pageY}px`;
        
        // Show menu
        this.hideAllMenus();
        this.editorContextMenu.classList.add('active');
        this.activeMenu = this.editorContextMenu;
    }
    
    updateTabContextMenu(tab) {
        // Update menu items based on tab state
        // For example, disable save if not dirty
        const saveItem = this.tabContextMenu.querySelector('[data-action="save"]');
        if (saveItem && tab.classList.contains('dirty')) {
            saveItem.style.opacity = '1';
            saveItem.style.pointerEvents = 'auto';
        } else if (saveItem) {
            saveItem.style.opacity = '0.5';
            saveItem.style.pointerEvents = 'none';
        }
    }
    
    handleTabContextAction(action) {
        if (!this.activeTab) return;
        
        const tabId = this.activeTab.dataset.id;
        
        switch (action) {
            case 'close':
                this.closeTab(tabId);
                break;
            case 'close-others':
                this.closeOtherTabs(tabId);
                break;
            case 'close-all':
                this.closeAllTabs();
                break;
            case 'save':
                this.saveTab(tabId);
                break;
            case 'save-as':
                this.saveTabAs(tabId);
                break;
        }
    }
    
    handleEditorContextAction(action) {
        const editor = document.getElementById('codeEditor');
        if (!editor) return;
        
        switch (action) {
            case 'cut':
                document.execCommand('cut');
                break;
            case 'copy':
                document.execCommand('copy');
                break;
            case 'paste':
                document.execCommand('paste');
                break;
            case 'select-all':
                editor.select();
                break;
            case 'find':
                this.showFindDialog();
                break;
            case 'replace':
                this.showReplaceDialog();
                break;
            case 'run':
                if (window.editorUI) {
                    window.editorUI.runCode();
                }
                break;
            case 'debug':
                if (window.editorUI) {
                    window.editorUI.runCode();
                }
                break;
        }
    }
    
    closeTab(tabId) {
        if (window.editorUI && window.editorUI.closeTab) {
            window.editorUI.closeTab(tabId);
        }
    }
    
    closeOtherTabs(tabId) {
        if (window.editorUI && window.editorUI.closeOtherTabs) {
            window.editorUI.closeOtherTabs(tabId);
        }
    }
    
    closeAllTabs() {
        if (window.editorUI && window.editorUI.closeAllTabs) {
            window.editorUI.closeAllTabs();
        }
    }
    
    saveTab(tabId) {
        if (window.editorUI && window.editorUI.saveFile) {
            window.editorUI.saveFile();
        }
    }
    
    saveTabAs(tabId) {
        if (window.editorUI && window.editorUI.saveFileAs) {
            // Trigger save as
            window.editorUI.triggerSaveAs();
        }
    }
    
    showFindDialog() {
        // TODO: Implement find dialog
        alert('Find dialog will be implemented');
    }
    
    showReplaceDialog() {
        // TODO: Implement replace dialog
        alert('Replace dialog will be implemented');
    }
    
    hideAllMenus() {
        this.tabContextMenu.classList.remove('active');
        this.editorContextMenu.classList.remove('active');
        this.activeMenu = null;
        this.activeTab = null;
    }
}

// Initialize context menus
document.addEventListener('DOMContentLoaded', () => {
    window.contextMenuManager = new ContextMenuManager();
});