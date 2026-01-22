class TreeViewManager {
  constructor(container) {
    this.container = container;
    this.treeData = [];
    this.currentWorkspace = null;
    this.workspaceName = "";
    this.selected = null;
    this.expanded = new Set();

    this.bindToolbar();
    this.bindFolderEvents();
    this.initWorkspaceHandlers();
    this.initContextActions();
  }

  normalizePath(p) {
    return p ? p.replace(/\\/g, "/") : p;
  }

  /* ---------------- Modal Utility (Async Prompt Replacement) ---------------- */

  showModal({ title, message, showInput = false, defaultValue = "" }) {
    return new Promise((resolve) => {
      const modal = document.getElementById("customModal");
      const input = document.getElementById("modalInput");
      const confirmBtn = document.getElementById("modalConfirm");
      const cancelBtn = document.getElementById("modalCancel");

      document.getElementById("modalTitle").textContent = title;
      document.getElementById("modalMessage").textContent = message;

      if (showInput) {
        input.classList.remove("hidden");
        input.value = defaultValue;
        setTimeout(() => input.focus(), 50);
      } else {
        input.classList.add("hidden");
      }

      modal.classList.remove("hidden");

      const cleanup = (value) => {
        modal.classList.add("hidden");
        confirmBtn.onclick = null;
        cancelBtn.onclick = null;
        input.onkeydown = null;
        resolve(value);
      };

      confirmBtn.onclick = () => cleanup(showInput ? input.value : true);
      cancelBtn.onclick = () => cleanup(null);
      input.onkeydown = (e) => {
        if (e.key === "Enter") cleanup(input.value);
        if (e.key === "Escape") cleanup(null);
      };
    });
  }

  /* ---------------- Workspace Operations ---------------- */

  bindToolbar() {
    document
      .getElementById("newFileBtn")
      ?.addEventListener("click", () => this.newFile());
    document
      .getElementById("newFolderBtn")
      ?.addEventListener("click", () => this.newFolder());
    document
      .getElementById("refreshExplorer")
      ?.addEventListener("click", () => this.refresh());
    document
      .getElementById("collapseAllBtn")
      ?.addEventListener("click", () => this.collapseAll());
    document
      .getElementById("openFolderBtn")
      ?.addEventListener("click", () => this.openFolder());
  }

  bindFolderEvents() {
    if (window.electronAPI) {
      window.electronAPI.onFolderOpened((_, data) => {
        if (data.success) this.setWorkspace(data.path, data.items);
      });
      window.electronAPI.onFileOpened((_, data) => {
        if (data?.path) this.selectItemByPath(data.path);
      });
    }
  }

  setWorkspace(path, items, expandedPaths = []) {
    this.currentWorkspace = this.normalizePath(path);
    this.workspaceName =
      this.currentWorkspace.split("/").pop() || this.currentWorkspace;
    this.treeData = this.normalize(items);

    // Restore expanded paths from session
    this.expanded.clear();
    this.expanded.add(this.currentWorkspace);

    if (expandedPaths && expandedPaths.length > 0) {
      expandedPaths.forEach((path) => {
        this.expanded.add(this.normalizePath(path));
      });
    }

    this.render();
  }

  getSessionState() {
    return {
      path: this.currentWorkspace,
      items: this.treeData,
      expanded: Array.from(this.expanded),
    };
  }

  async newFile() {
    const inputPath = await this.showModal({
      title: "New File",
      message: "Enter file path (e.g., src/utils/helper.js):",
      showInput: true,
    });

    if (!inputPath || !this.currentWorkspace) return;

    const dest = this.getTargetDirectory();
    // Pass the full relative path to the main process
    const res = await window.electronAPI.createFile(dest, inputPath);

    if (res.success) {
      await this.refresh();

      const fileRes = await window.electronAPI.readFile(res.path);

      if (fileRes.success && window.editorUI) {
        window.editorUI.openFileFromPath(res.path, fileRes.content);

        this.selectItemByPath(res.path);
      }
    } else {
      console.error("Failed to create file:", res.error);
    }
  }

  async newFolder() {
    const inputPath = await this.showModal({
      title: "New Folder",
      message: "Enter folder path (e.g., assets/images/icons):",
      showInput: true,
    });

    if (!inputPath || !this.currentWorkspace) return;

    const dest = this.getTargetDirectory();
    const res = await window.electronAPI.createDirectory(dest, inputPath);

    if (res.success) {
      await this.refresh();
      // Expand the newly created folder path in the tree
      this.selectItemByPath(res.path);
      this.expanded.add(this.normalizePath(res.path));
      this.render();
    }
  }

  async deleteSelected() {
    if (!this.selected || this.selected.isRoot) return;
    const confirmed = await this.showModal({
      title: "Confirm Delete",
      message: `Are you sure you want to delete ${this.selected.name}?`,
    });

    if (confirmed) {
      await window.electronAPI.deleteItem(
        this.selected.path,
        this.selected.isDirectory,
      );
      this.refresh();
    }
  }

  async renameSelected() {
    if (!this.selected || this.selected.isRoot) return;
    const name = await this.showModal({
      title: "Rename",
      message: "Enter new name:",
      showInput: true,
      defaultValue: this.selected.name,
    });

    if (name && name !== this.selected.name) {
      const newPath =
        this.selected.path.replace(/[/\\\\][^/\\\\]+$/, "/") + name;
      await window.electronAPI.renameItem(this.selected.path, newPath);
      this.refresh();
    }
  }

  /* ---------------- Standard Logic ---------------- */

  render() {
    this.container.innerHTML = "";
    if (!this.currentWorkspace) {
      this.container.innerHTML = `<div class="tree-empty"><button id="openFolderBtnInner" class="btn btn-small">Open Folder</button></div>`;
      document
        .getElementById("openFolderBtnInner")
        ?.addEventListener("click", () => this.openFolder());
      return;
    }
    const rootRow = this.createRow(
      {
        name: this.workspaceName,
        path: this.currentWorkspace,
        isDirectory: true,
        isRoot: true,
      },
      0,
    );
    this.container.appendChild(rootRow);
    if (this.expanded.has(this.currentWorkspace))
      this.renderTree(this.treeData, 1);
  }

  renderTree(items, depth) {
    items.forEach((item) => {
      this.container.appendChild(this.createRow(item, depth));
      if (item.isDirectory && this.expanded.has(item.path) && item.children) {
        this.renderTree(item.children, depth + 1);
      }
    });
  }

  createRow(item, depth) {
    const row = document.createElement("div");
    row.className = "tree-item";
    row.style.paddingLeft = `${depth * 12 + 8}px`;
    if (
      this.selected &&
      this.normalizePath(this.selected.path) === this.normalizePath(item.path)
    )
      row.classList.add("selected");

    const iconClass = item.isDirectory
      ? `fas ${this.expanded.has(item.path) ? "fa-folder-open" : "fa-folder"}`
      : this.getFileIcon(item.name);
    const toggleIcon = item.isDirectory
      ? `<i class="tree-toggle fas ${this.expanded.has(item.path) ? "fa-chevron-down" : "fa-chevron-right"}"></i>`
      : `<span style="width:14px; display:inline-block"></span>`;

    row.innerHTML = `${toggleIcon}<i class="tree-icon ${iconClass}"></i><span class="tree-name">${item.name}</span>`;

    row.onclick = async (e) => {
      e.stopPropagation();
      this.selected = item;
      if (item.isDirectory) {
        if (this.expanded.has(item.path)) this.expanded.delete(item.path);
        else {
          this.expanded.add(item.path);
          if (!item.children || item.children.length === 0) {
            const res = await window.electronAPI.readDirectory(item.path);
            if (res.success) item.children = this.normalize(res.items);
          }
        }
      } else {
        const res = await window.electronAPI.readFile(item.path);
        if (res.success)
          window.editorUI.openFileFromPath(item.path, res.content);
      }
      this.render();
    };

    row.oncontextmenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.selected = item;
      this.render();
      window.electronAPI.showExplorerContextMenu({
        path: item.path,
        isDirectory: item.isDirectory,
        isWorkspace: !!item.isRoot,
      });
    };

    return row;
  }

  normalize(items) {
    return (items || [])
      .map((i) => ({
        ...i,
        path: this.normalizePath(i.path),
        children: i.children || [],
      }))
      .sort((a, b) =>
        a.isDirectory === b.isDirectory
          ? a.name.localeCompare(b.name)
          : a.isDirectory
            ? -1
            : 1,
      );
  }

  getFileIcon(name) {
    const ext = name.split(".").pop().toLowerCase();
    const map = {
      js: "fab fa-js",
      html: "fab fa-html5",
      css: "fab fa-css3-alt",
      py: "fab fa-python",
    };
    return map[ext] || "fas fa-file-code";
  }

  getTargetDirectory() {
    if (!this.selected) return this.currentWorkspace;
    return this.selected.isDirectory
      ? this.selected.path
      : this.selected.path.replace(/[/\\\\][^/\\\\]+$/, "");
  }

  async openFolder() {
    const res = await window.electronAPI.openFolderDialog();
    if (res?.success) this.setWorkspace(res.path, res.items);
  }

  async refresh() {
    if (!this.currentWorkspace) return;
    const res = await window.electronAPI.readDirectory(this.currentWorkspace);
    if (res.success) {
      this.treeData = this.normalize(res.items);
      this.render();
    }
  }

  initWorkspaceHandlers() {
    this.container.onclick = () => {
      if (this.currentWorkspace) {
        this.selected = {
          path: this.currentWorkspace,
          isDirectory: true,
          isRoot: true,
        };
        this.render();
      }
    };
  }

  initContextActions() {
    window.electronAPI.onExplorerContextAction((_, action) => {
      if (action === "new-file") this.newFile();
      if (action === "new-folder") this.newFolder();
      if (action === "delete") this.deleteSelected();
      if (action === "rename") this.renameSelected();
    });
  }

  collapseAll() {
    this.expanded.clear();
    if (this.currentWorkspace) this.expanded.add(this.currentWorkspace);
    this.render();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.treeView = new TreeViewManager(
    document.getElementById("treeViewContainer"),
  );
});
