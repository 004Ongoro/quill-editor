// Tree View Manager
class TreeViewManager {
    constructor() {
        this.currentWorkspace = null;
        this.treeData = [];
        this.expandedItems = new Set();
        this.selectedItem = null;
        
        this.initialize();
    }
    
    initialize() {
        this.treeContainer = document.getElementById('treeViewContainer');
        this.openFolderBtn = document.getElementById('openFolderBtn');
        this.newFileBtn = document.getElementById('newFileBtn');
        this.newFolderBtn = document.getElementById('newFolderBtn');
        this.refreshExplorer = document.getElementById('refreshExplorer');
        this.collapseAllBtn = document.getElementById('collapseAllBtn');
        this.workspacePathInput = document.getElementById('workspacePath');
        this.goToPathBtn = document.getElementById('goToPath');

        this.openFolderFromActivity = document.getElementById('openFolderActivity');
        
        this.setupEventListeners();

        if (this.openFolderFromActivity) {
            this.openFolderFromActivity.addEventListener('click', () => this.openFolder());
        }

    }
    
    setupEventListeners() {
        if (this.openFolderBtn) {
            this.openFolderBtn.addEventListener('click', () => this.openFolder());
        }
        
        if (this.newFileBtn) {
            this.newFileBtn.addEventListener('click', () => this.createNewFile());
        }
        
        if (this.newFolderBtn) {
            this.newFolderBtn.addEventListener('click', () => this.createNewFolder());
        }
        
        if (this.refreshExplorer) {
            this.refreshExplorer.addEventListener('click', () => this.refresh());
        }
        
        if (this.collapseAllBtn) {
            this.collapseAllBtn.addEventListener('click', () => this.collapseAll());
        }
        
        if (this.goToPathBtn && this.workspacePathInput) {
            this.goToPathBtn.addEventListener('click', () => this.navigateToPath());
            this.workspacePathInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.navigateToPath();
                }
            });
        }
    }
    
    async openFolder() {
        if (!window.electronAPI) {
            console.error('Electron API not available');
            return;
        }
        
        try {
            const result = await window.electronAPI.openFolderDialog();
            
            if (result.success) {
                this.currentWorkspace = result.path;
                this.workspacePathInput.value = result.path;
                this.treeData = this.sortItems(result.items);
                this.renderTree();
                
                // Update window title
                const workspaceName = result.path.split('/').pop();
                document.title = `${workspaceName} - QuillEditor`;
                
                // Add console message
                if (window.editorUI && window.editorUI.addConsoleMessage) {
                    window.editorUI.addConsoleMessage(`Workspace opened: ${result.path}`, 'success');
                }
            } else if (!result.canceled) {
                console.error('Failed to open folder:', result.error);
                alert(`Failed to open folder: ${result.error}`);
            }
        } catch (error) {
            console.error('Error opening folder:', error);
            alert(`Error opening folder: ${error.message}`);
        }
    }
    
    async loadWorkspace(path, items = null) {
        if (!window.electronAPI) return;
        
        try {
            let workspaceItems;
            
            if (items) {
                // Use provided items
                workspaceItems = items;
            } else {
                // Load items from disk
                const result = await window.electronAPI.readDirectory(path);
                if (!result.success) {
                    console.error('Failed to load workspace:', result.error);
                    this.showEmptyState();
                    return;
                }
                workspaceItems = result.items;
            }
            
            this.treeData = this.sortItems(workspaceItems);
            this.renderTree();
            
            // Update workspace path
            this.workspacePathInput.value = path;
            
        } catch (error) {
            console.error('Error loading workspace:', error);
            this.showEmptyState();
        }
    }
    
    sortItems(items) {
        return items.sort((a, b) => {
            // Directories first, then files
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            
            // Alphabetical
            return a.name.localeCompare(b.name);
        });
    }
    
    renderTree() {
        if (!this.treeContainer || this.treeData.length === 0) {
            this.showEmptyState();
            return;
        }
        
        let html = '<div class="tree-root">';
        
        for (const item of this.treeData) {
            html += this.renderTreeItem(item);
        }
        
        html += '</div>';
        this.treeContainer.innerHTML = html;
        
        // Add event listeners to tree items
        this.addTreeEventListeners();
    }
    
    renderTreeItem(item, depth = 0) {
        const isExpanded = this.expandedItems.has(item.path);
        const hasChildren = item.isDirectory;
        const iconClass = this.getIconClass(item);
        const indent = depth * 16;
        
        // Clean path for display
        const displayPath = item.path.replace(/\\/g, '/');
        
        let html = `
            <div class="tree-item" data-path="${displayPath}" data-type="${item.isDirectory ? 'directory' : 'file'}" 
                style="padding-left: ${indent}px;">
                <div class="tree-toggle">
        `;
        
        if (hasChildren) {
            html += `<i class="fas fa-chevron-${isExpanded ? 'down' : 'right'}"></i>`;
        } else {
            html += `<span style="width: 16px;"></span>`;
        }
        
        html += `
                </div>
                <div class="tree-icon">
                    <i class="${iconClass}"></i>
                </div>
                <span class="tree-name" title="${item.name}">${item.name}</span>
            </div>
        `;
        
        if (hasChildren && isExpanded) {
            // Show loading indicator
            html += `<div class="tree-children expanded" data-parent="${displayPath}">
                <div class="tree-loading"><i class="fas fa-spinner fa-spin"></i> Loading...</div>
            </div>`;
        }
        
        return html;
    }
    
    getIconClass(item) {
        if (item.isDirectory) {
            return 'fas fa-folder';
        }
        
        const ext = item.name.split('.').pop().toLowerCase();
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
    
    addTreeEventListeners() {
        const treeItems = this.treeContainer.querySelectorAll('.tree-item');
        treeItems.forEach(item => {
            item.addEventListener('click', (e) => this.handleTreeItemClick(e, item));
            item.addEventListener('contextmenu', (e) => this.handleTreeItemContextMenu(e, item));
        });
        
        const treeToggles = this.treeContainer.querySelectorAll('.tree-toggle');
        treeToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleTreeItem(e.target.closest('.tree-item'));
            });
        });
    }
    
    handleTreeItemClick(e, itemElement) {
        const path = itemElement.dataset.path;
        const type = itemElement.dataset.type;
        
        // Remove previous selection
        const previousSelected = this.treeContainer.querySelector('.tree-item.selected');
        if (previousSelected) {
            previousSelected.classList.remove('selected');
        }
        
        // Add selection to clicked item
        itemElement.classList.add('selected');
        this.selectedItem = { path, type: type };
        
        if (type === 'file') {
            // Open the file
            this.openFile(path);
        } else {
            // Toggle expansion on double click
            if (e.detail === 2) {
                this.toggleTreeItem(itemElement);
            }
        }
    }
    
    handleTreeItemContextMenu(e, itemElement) {
        e.preventDefault();
        // TODO: Implement context menu for tree items
        console.log('Tree item context menu:', itemElement.dataset.path);
    }
    
    toggleTreeItem(itemElement) {
        const path = itemElement.dataset.path;
        const type = itemElement.dataset.type;
        
        if (type !== 'directory') return;
        
        const wasExpanded = this.expandedItems.has(path);
        
        if (wasExpanded) {
            this.expandedItems.delete(path);
        } else {
            this.expandedItems.add(path);
            
            // Load children if not already loaded
            this.loadChildren(path, itemElement);
        }
        
        this.renderTree();
    }
    
    async loadChildren(path, parentElement) {
        if (!window.electronAPI) return;
        
        try {
            const result = await window.electronAPI.readDirectory(path);
            if (result.success) {
                // Store children data and update UI
                // For now, we'll just re-render
                this.renderTree();
            }
        } catch (error) {
            console.error('Error loading children:', error);
        }
    }
    
    async openFile(path) {
        if (!window.electronAPI) return;
        
        try {
            const result = await window.electronAPI.readFile(path);
            if (result.success) {
                // Open file in editor
                if (window.editorUI) {
                    window.editorUI.openFileFromPath(path, result.content);
                }
            }
        } catch (error) {
            console.error('Error opening file:', error);
        }
    }
    
    async createNewFile() {
        if (!this.currentWorkspace) {
            alert('Please open a workspace first');
            return;
        }
        
        const fileName = prompt('Enter file name:');
        if (!fileName) return;
        
        try {
            const result = await window.electronAPI.createFile(this.currentWorkspace, fileName);
            if (result.success) {
                this.refresh();
                
                // Open the new file
                this.openFile(result.path);
            }
        } catch (error) {
            console.error('Error creating file:', error);
        }
    }
    
    async createNewFolder() {
        if (!this.currentWorkspace) {
            alert('Please open a workspace first');
            return;
        }
        
        const folderName = prompt('Enter folder name:');
        if (!folderName) return;
        
        try {
            const result = await window.electronAPI.createDirectory(this.currentWorkspace, folderName);
            if (result.success) {
                this.refresh();
            }
        } catch (error) {
            console.error('Error creating folder:', error);
        }
    }
    
    async navigateToPath() {
        const path = this.workspacePathInput.value.trim();
        if (!path) return;
        
        // Check if path exists
        const existsResult = await window.electronAPI.fileExists(path);
        
        if (existsResult.success && existsResult.exists) {
            // It's a folder, open as workspace
            this.currentWorkspace = path;
            await this.loadWorkspace(path);
        } else {
            // It might be a file, try to open/create it
            const fileName = path.split('/').pop();
            const folderPath = path.substring(0, path.lastIndexOf('/'));
            
            // Check if parent folder exists
            const parentExists = await window.electronAPI.fileExists(folderPath);
            
            if (parentExists.success && parentExists.exists) {
                // Create the file
                const createResult = await window.electronAPI.createFile(folderPath, fileName);
                if (createResult.success) {
                    this.openFile(createResult.path);
                    
                    // Also open the parent folder as workspace
                    this.currentWorkspace = folderPath;
                    this.workspacePathInput.value = folderPath;
                    await this.loadWorkspace(folderPath);
                }
            } else {
                alert('Parent directory does not exist');
            }
        }
    }
    
    refresh() {
        if (this.currentWorkspace) {
            this.loadWorkspace(this.currentWorkspace);
        }
    }
    
    collapseAll() {
        this.expandedItems.clear();
        this.renderTree();
    }
    
    showEmptyState() {
        this.treeContainer.innerHTML = `
            <div class="tree-empty">
                <i class="fas fa-folder-open"></i>
                <p>No folder opened</p>
                <button id="openFolderBtn" class="btn btn-small">
                    <i class="fas fa-folder-open"></i> Open Folder
                </button>
            </div>
        `;
        
        // Re-attach event listener
        const openFolderBtn = document.getElementById('openFolderBtn');
        if (openFolderBtn) {
            openFolderBtn.addEventListener('click', () => this.openFolder());
        }
    }
}

// Initialize tree view
document.addEventListener('DOMContentLoaded', () => {
    window.treeView = new TreeViewManager();
});