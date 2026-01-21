class TreeViewManager {
  constructor() {
    this.container = document.getElementById('treeViewContainer');
    this.currentWorkspace = null;
    this.tree = [];
    this.expanded = new Set();

    this.bindToolbar();
    this.bindFolderEvents();
  }

  /* ---------------- Toolbar ---------------- */

  bindToolbar() {
    document.getElementById('openFolderBtn')?.addEventListener('click', () => this.openFolder());
    document.getElementById('newFileBtn')?.addEventListener('click', () => this.newFile());
    document.getElementById('newFolderBtn')?.addEventListener('click', () => this.newFolder());
    document.getElementById('refreshExplorer')?.addEventListener('click', () => this.refresh());
    document.getElementById('collapseAllBtn')?.addEventListener('click', () => this.collapseAll());
  }

  bindFolderEvents() {
    window.electronAPI.onFolderOpened((_, data) => {
      this.currentWorkspace = data.path;
      this.tree = this.normalize(data.items);
      this.expanded.clear();
      this.render();
    });
  }

  /* ---------------- Workspace ---------------- */

  async openFolder() {
    const result = await window.electronAPI.openFolderDialog();
    if (!result.success) return;

    this.currentWorkspace = result.path;
    this.tree = this.normalize(result.items);
    this.expanded.clear();
    this.render();
  }

  async refresh() {
    if (!this.currentWorkspace) return;

    const result = await window.electronAPI.readDirectory(this.currentWorkspace);
    if (!result.success) return;

    this.tree = this.normalize(result.items);
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
    this.tree.forEach(item => {
      this.container.appendChild(this.renderItem(item, 0));
    });
  }

  renderItem(item, depth) {
    const wrapper = document.createElement('div');

    const row = document.createElement('div');
    row.className = 'tree-item';
    row.style.paddingLeft = `${depth * 16}px`;

    row.innerHTML = `
      <span class="toggle">${item.isDirectory ? (this.expanded.has(item.path) ? '▾' : '▸') : ''}</span>
      <span class="icon">${item.isDirectory ? '📁' : '📄'}</span>
      <span class="name">${item.name}</span>
    `;

    row.addEventListener('click', () => this.onClick(item));
    row.addEventListener('contextmenu', e => this.onContext(e, item));

    wrapper.appendChild(row);

    if (item.isDirectory && this.expanded.has(item.path)) {
      item.children.forEach(child => {
        wrapper.appendChild(this.renderItem(child, depth + 1));
      });
    }

    return wrapper;
  }

  /* ---------------- Actions ---------------- */

  async onClick(item) {
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
  }

  async onContext(e, item) {
    e.preventDefault();

    const action = prompt('Type: rename or delete');
    if (!action) return;

    if (action === 'rename') {
      const newName = prompt('New name');
      if (!newName) return;

      const newPath = item.path.replace(/[^/\\]+$/, newName);
      await window.electronAPI.renameItem(item.path, newPath);
      this.refresh();
    }

    if (action === 'delete') {
      if (!confirm('Delete this item?')) return;
      await window.electronAPI.deleteItem(item.path, item.isDirectory);
      this.refresh();
    }
  }

  /* ---------------- Create ---------------- */

  async newFile() {
    if (!this.currentWorkspace) return alert('Open a folder first');
    const name = prompt('File name');
    if (!name) return;

    await window.electronAPI.createFile(this.currentWorkspace, name);
    this.refresh();
  }

  async newFolder() {
    if (!this.currentWorkspace) return alert('Open a folder first');
    const name = prompt('Folder name');
    if (!name) return;

    await window.electronAPI.createDirectory(this.currentWorkspace, name);
    this.refresh();
  }

  collapseAll() {
    this.expanded.clear();
    this.render();
  }
}

/* ---------------- Init ---------------- */

document.addEventListener('DOMContentLoaded', () => {
  window.treeView = new TreeViewManager();
});
