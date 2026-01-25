const { contextBridge, ipcRenderer } = require("electron");

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  // File operations
  writeFile: (path, content) =>
    ipcRenderer.invoke("write-file", { path, content }),
  readFile: (path) => ipcRenderer.invoke("read-file", path),

  readDirectory: (path) => ipcRenderer.invoke("read-directory", path),
  openFolderDialog: () => ipcRenderer.invoke("open-folder-dialog"),
  createFile: (path, name) => ipcRenderer.invoke("create-file", { path, name }),
  createDirectory: (path, name) =>
    ipcRenderer.invoke("create-directory", { path, name }),
  deleteItem: (path, isDirectory) =>
    ipcRenderer.invoke("delete-item", { path, isDirectory }),
  renameItem: (oldPath, newPath) =>
    ipcRenderer.invoke("rename-item", { oldPath, newPath }),
  fileExists: (path) => ipcRenderer.invoke("file-exists", path),

  // Session persistence API
  saveSession: (sessionData) => ipcRenderer.invoke("save-session", sessionData),
  loadSession: () => ipcRenderer.invoke("load-session"),
  clearSession: () => ipcRenderer.invoke("clear-session"),

  // Session events
  onSessionLoaded: (callback) => ipcRenderer.on("session-loaded", callback),
  onSaveSessionRequest: (callback) =>
    ipcRenderer.on("save-session-request", callback),
  onClearSessionRequest: (callback) =>
    ipcRenderer.on("clear-session-request", callback),

  // Remove session listeners
  removeSessionLoadedListener: () =>
    ipcRenderer.removeAllListeners("session-loaded"),
  removeSaveSessionRequestListener: () =>
    ipcRenderer.removeAllListeners("save-session-request"),

  // Context menu events
  showTabContextMenu: () => ipcRenderer.send("show-tab-context-menu"),
  showEditorContextMenu: () => ipcRenderer.send("show-editor-context-menu"),
  showExplorerContextMenu: (data) =>
    ipcRenderer.send("show-explorer-context-menu", data),

  onExplorerContextAction: (callback) =>
    ipcRenderer.on("explorer-context-action", callback),

  // Listen for context menu actions from main process
  onTabContextMenuAction: (callback) =>
    ipcRenderer.on("tab-context-menu-action", callback),
  onEditorContextMenuAction: (callback) =>
    ipcRenderer.on("editor-context-menu-action", callback),

  // Remove context menu listeners
  removeTabContextMenuListener: () =>
    ipcRenderer.removeAllListeners("tab-context-menu-action"),
  removeEditorContextMenuListener: () =>
    ipcRenderer.removeAllListeners("editor-context-menu-action"),

  // Events from main process
  onFileOpened: (callback) => ipcRenderer.on("file-opened", callback),
  onFileSave: (callback) => ipcRenderer.on("file-save", callback),
  onFileNew: (callback) => ipcRenderer.on("file-new", callback),
  onDebugRun: (callback) => ipcRenderer.on("debug-run", callback),
  onDebugStop: (callback) => ipcRenderer.on("debug-stop", callback),

  // for git log
  onGitLog: (callback) => ipcRenderer.on("git-log", callback),

  //folders
  onFolderOpened: (callback) => ipcRenderer.on("folder-opened", callback),

  // Remove listeners
  removeFileOpenedListener: () => ipcRenderer.removeAllListeners("file-opened"),
  removeFileSaveListener: () => ipcRenderer.removeAllListeners("file-save"),
  removeFileNewListener: () => ipcRenderer.removeAllListeners("file-new"),
  removeDebugRunListener: () => ipcRenderer.removeAllListeners("debug-run"),
  removeDebugStopListener: () => ipcRenderer.removeAllListeners("debug-stop"),
});
