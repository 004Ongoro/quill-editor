class TreeViewManager {
  constructor(container) {
    this.container = container;
    this.treeData = [];
    this.currentWorkspace = null;

    this.selected = null;
    this.expanded = new Set();

    this.bindToolbar();
    this.bindFolderEvents();
    this.initWorkspaceHandlers();
    this.initContextActions();
  }

  /* ---------------- Toolbar ---------------- */

  bindToolbar() {
    document.getElementById('openFolderBtn')?.addEventListener('click', () => this.openFolder());
    document.getElementById('newFileBtn')?.addEventListener('click', () => this.newFile());
    document.getElementById('newFolderBtn')?.addEventListener('click', () => this.newFolder());
    document.getElementById('refreshExplorer')?.addEventListener('click', () => this.refresh());
    document.getElementById('collapseAllBtn')?.addEventListener('click', () => this.collapseAll());
  }
// The below code is redudant, but i prefer 
// to just comment it just incase, because 
// it was working before

//   bindFolderEvents() {
//     window.electronAPI.onFolderOpened((_, data) => {
//       this.currentWorkspace = data.path;
//       this.treeData = this.normalize(data.items);
//       this.expanded.clear();
//       this.render();
//     });
//   }

  /* ---------------- Workspace ---------------- */

  initWorkspaceHandlers() {
    this.container.addEventListener('click', e => {
      if (e.target === this.container && this.currentWorkspace) {
        this.selectItem({
          path: this.currentWorkspace,
          isDirectory: true,
          isWorkspace: true
        });
      }
    });

    this.container.addEventListener('contextmenu', e => {
      e.preventDefault();
      if (!this.currentWorkspace) return;

      this.selectItem({
        path: this.currentWorkspace,
        isDirectory: true,
        isWorkspace: true
      });

      window.electronAPI.showExplorerContextMenu({
        path: this.currentWorkspace,
        isDirectory: true,
        isWorkspace: true
      });
    });
  }

  selectItem(item) {
    this.selected = item;
    this.render();
  }

  getTargetDirectory() {
    if (!this.selected) return this.currentWorkspace;
    if (this.selected.isDirectory) return this.selected.path;
    return this.selected.path.replace(/[/\\][^/\\]+$/, '');
  }

  /* ---------------- Context Menu ---------------- */

  initContextActions() {
    window.electronAPI.onExplorerContextAction((_, action) => {
      if (action === 'new-file') this.newFile();
      if (action === 'new-folder') this.newFolder();
      if (action === 'delete') this.deleteSelected();
      if (action === 'rename') this.renameSelected();
    });
  }

  async deleteSelected() {
    if (!this.selected || this.selected.isWorkspace) return;
    if (!confirm('Delete this item?')) return;

    await window.electronAPI.deleteItem(
      this.selected.path,
      this.selected.isDirectory
    );
    await this.refresh();
  }

  async renameSelected() {
    if (!this.selected || this.selected.isWorkspace) return;

    const name = prompt('New name');
    if (!name) return;

    const newPath =
      this.selected.path.replace(/[/\\][^/\\]+$/, '/') + name;

    await window.electronAPI.renameItem(this.selected.path, newPath);
    await this.refresh();
  }

  /* ---------------- Explorer Ops ---------------- */

 async openFolder() {
  const result = await window.electronAPI.openFolderDialog();
  if (!result || !result.success) return;

  this.currentWorkspace = result.path;
  this.treeData = this.normalize(result.items);
  this.expanded.clear();
  this.selected = null;

  this.render();
}

  async refresh() {
    if (!this.currentWorkspace) return;

    const result = await window.electronAPI.readDirectory(this.currentWorkspace);
    if (!result.success) return;

    this.treeData = this.normalize(result.items);
    this.render();
  }

  normalize(items) {
    return items
      .sort((a, b) =>
        a.isDirectory === b.isDirectory
          ? a.name.localeCompare(b.name)
          : a.isDirectory ? -1 : 1
      )
      .map(i => ({ ...i, children: [] }));
  }

  /* ---------------- Rendering ---------------- */

  render() {
    this.container.innerHTML = '';
    this.treeData.forEach(item => {
      this.container.appendChild(this.renderItem(item, 0));
    });
  }

  renderItem(item, depth) {
    const row = document.createElement('div');
    row.className = 'tree-item';
    row.style.paddingLeft = `${depth * 16}px`;

    if (this.selected?.path === item.path) {
      row.classList.add('selected');
    }

    row.textContent = item.name;

    row.addEventListener('click', async e => {
      e.stopPropagation();
      this.selectItem(item);

      if (item.isDirectory) {
        if (this.expanded.has(item.path)) {
          this.expanded.delete(item.path);
        } else {
          this.expanded.add(item.path);

          if (!item.children.length) {
            const result = await window.electronAPI.readDirectory(item.path);
            if (result.success) {
              item.children = this.normalize(result.items);
            }
          }
        }
        this.render();
      } else {
        const result = await window.electronAPI.readFile(item.path);
        if (result.success && window.editorUI) {
          window.editorUI.openFileFromPath(item.path, result.content);
        }
      }
    });

    row.addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopPropagation();

      this.selectItem(item);

      window.electronAPI.showExplorerContextMenu({
        path: item.path,
        isDirectory: item.isDirectory
      });
    });

    if (item.isDirectory && this.expanded.has(item.path)) {
      item.children.forEach(child => {
        row.appendChild(this.renderItem(child, depth + 1));
      });
    }

    return row;
  }

  /* ---------------- Create ---------------- */

  async createFromPath(base, input) {
    const parts = input.split(/[\\/]/);
    let current = base;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const next = `${current}/${part}`;

      if (isLast && part.includes('.')) {
        await window.electronAPI.createFile(current, part);
        return next;
      }

      const exists = await window.electronAPI.fileExists(next);
      if (!exists) {
        await window.electronAPI.createDirectory(current, part);
      }

      current = next;
    }
  }

  async newFile() {
    if (!this.currentWorkspace) return;

    const name = prompt('File name (supports paths)');
    if (!name) return;

    const base = this.getTargetDirectory();
    const fullPath = await this.createFromPath(base, name);

    await this.refresh();

    const result = await window.electronAPI.readFile(fullPath);
    if (result.success && window.editorUI) {
      window.editorUI.openFileFromPath(fullPath, result.content);
    }
  }

  async newFolder() {
    if (!this.currentWorkspace) return;

    const name = prompt('Folder name (supports paths)');
    if (!name) return;

    const base = this.getTargetDirectory();
    await this.createFromPath(base, name);
    await this.refresh();
  }

  collapseAll() {
    this.expanded.clear();
    this.render();
  }
}

/* ---------------- Init ---------------- */

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('explorerTree');
  window.treeView = new TreeViewManager(container);
});
