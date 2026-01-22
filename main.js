const { app, BrowserWindow, Menu, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");

let mainWindow = null;
let filePath = null;
const userDataPath = app.getPath("userData");
const sessionFile = path.join(userDataPath, "session.json");

// Create the main window
function createWindow() {
  const session = loadSession();

  // Restore window position and size from session
  const windowState = session.layout?.windowState || {
    width: 1200,
    height: 800,
    x: undefined,
    y: undefined,
    isMaximized: false,
  };

  mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    icon: path.join(__dirname, "assets", "icon.png"),
    show: false,
  });

  // Load the index.html
  mainWindow.loadFile("index.html");

  // Restore maximized state
  if (windowState.isMaximized) {
    mainWindow.maximize();
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();

    // Send session data to renderer
    setTimeout(() => {
      mainWindow.webContents.send("session-loaded", session);
    }, 500);
  });

  // Track window state changes
  let saveStateTimeout;
  mainWindow.on("resize", () => debounceSaveWindowState());
  mainWindow.on("move", () => debounceSaveWindowState());
  mainWindow.on("close", (event) => {
    // Don't prevent close, just save state before closing
    debounceSaveWindowState(true);

    // Request session data from renderer
    mainWindow.webContents.send("save-session-request");

    // Wait a bit for renderer to respond
    setTimeout(() => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.destroy();
      }
    }, 500);
  });

  function debounceSaveWindowState(immediate = false) {
    if (saveStateTimeout) {
      clearTimeout(saveStateTimeout);
    }

    if (immediate) {
      saveWindowState();
    } else {
      saveStateTimeout = setTimeout(saveWindowState, 1000);
    }
  }

  function saveWindowState() {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    const bounds = mainWindow.getBounds();
    const session = loadSession();

    session.layout = session.layout || {};
    session.layout.windowState = {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      isMaximized: mainWindow.isMaximized(),
    };

    saveSession(session);
  }

  // Open DevTools in development
  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
  }

  // Handle window closed
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Create application menu
  createMenu();
}

// Load session data
function loadSession() {
  try {
    if (fs.existsSync(sessionFile)) {
      const data = fs.readFileSync(sessionFile, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error loading session:", error);
  }
  return {
    tabs: [],
    workspace: null,
    layout: {},
    settings: {},
  };
}

// Save session data
function saveSession(sessionData) {
  try {
    fs.writeFileSync(
      sessionFile,
      JSON.stringify(sessionData, null, 2),
      "utf-8",
    );
  } catch (error) {
    console.error("Error saving session:", error);
  }
}

// Create application menu
function createMenu() {
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "New",
          accelerator: "CmdOrCtrl+N",
          click: () => {
            filePath = null;
            mainWindow.webContents.send("file-new");
          },
        },
        {
          label: "Open",
          accelerator: "CmdOrCtrl+O",
          click: openFile,
        },
        {
          label: "Save",
          accelerator: "CmdOrCtrl+S",
          click: saveFile,
        },
        {
          label: "Save As",
          accelerator: "CmdOrCtrl+Shift+S",
          click: saveFileAs,
        },
        {
          label: "Open Folder",
          accelerator: "CmdOrCtrl+Shift+O",
          click: openFolder,
        },
        { type: "separator" },
        {
          label: "Exit",
          accelerator: "CmdOrCtrl+Q",
          click: () => app.quit(),
        },
        {
          label: "Clear Session Data",
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send("clear-session-request");
            }
          },
        },
        { type: "separator" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { label: "Undo", accelerator: "CmdOrCtrl+Z", role: "undo" },
        { label: "Redo", accelerator: "CmdOrCtrl+Shift+Z", role: "redo" },
        { type: "separator" },
        { label: "Cut", accelerator: "CmdOrCtrl+X", role: "cut" },
        { label: "Copy", accelerator: "CmdOrCtrl+C", role: "copy" },
        { label: "Paste", accelerator: "CmdOrCtrl+V", role: "paste" },
        { label: "Select All", accelerator: "CmdOrCtrl+A", role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { label: "Reload", accelerator: "CmdOrCtrl+R", role: "reload" },
        {
          label: "Toggle Developer Tools",
          accelerator: "F12",
          role: "toggleDevTools",
        },
        { type: "separator" },
        { label: "Zoom In", accelerator: "CmdOrCtrl+=", role: "zoomIn" },
        { label: "Zoom Out", accelerator: "CmdOrCtrl+-", role: "zoomOut" },
        { label: "Reset Zoom", accelerator: "CmdOrCtrl+0", role: "resetZoom" },
      ],
    },
    {
      label: "Debug",
      submenu: [
        {
          label: "Run Code",
          accelerator: "F5",
          click: () => mainWindow.webContents.send("debug-run"),
        },
        {
          label: "Stop Execution",
          accelerator: "Shift+F5",
          click: () => mainWindow.webContents.send("debug-stop"),
        },
      ],
    },
  ];

  if (process.platform === "darwin") {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Open folder
async function openFolder() {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
    title: "Select Workspace Folder",
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const folderPath = result.filePaths[0];

    try {
      const items = fs.readdirSync(folderPath, { withFileTypes: true });
      mainWindow.webContents.send("folder-opened", {
        success: true,
        path: folderPath,
        items: items.map((item) => ({
          name: item.name,
          path: path.join(folderPath, item.name),
          type: item.isDirectory() ? "directory" : "file",
          isDirectory: item.isDirectory(),
          isFile: item.isFile(),
        })),
      });
    } catch (error) {
      console.error("Error reading folder:", error);
    }
  }
}

// Open file dialog
async function openFile() {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [
      { name: "All Files", extensions: ["*"] },
      { name: "JavaScript", extensions: ["js", "jsx", "mjs"] },
      { name: "HTML", extensions: ["html", "htm"] },
      { name: "CSS", extensions: ["css"] },
      { name: "JSON", extensions: ["json"] },
      { name: "Text", extensions: ["txt", "md"] },
    ],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    filePath = result.filePaths[0];
    const content = fs.readFileSync(filePath, "utf-8");
    mainWindow.webContents.send("file-opened", { path: filePath, content });
  }
}

// Save file
async function saveFile() {
  if (filePath) {
    mainWindow.webContents.send("file-save", filePath);
  } else {
    saveFileAs();
  }
}

// Save file as
async function saveFileAs() {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: "All Files", extensions: ["*"] },
      { name: "JavaScript", extensions: ["js"] },
      { name: "HTML", extensions: ["html"] },
      { name: "CSS", extensions: ["css"] },
      { name: "Text", extensions: ["txt"] },
    ],
  });

  if (!result.canceled) {
    filePath = result.filePath;
    mainWindow.webContents.send("file-save", filePath);
  }
}

// IPC handlers
ipcMain.handle("write-file", async (event, { path, content }) => {
  try {
    fs.writeFileSync(path, content);
    return { success: true, path };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("read-file", async (event, path) => {
  try {
    const content = fs.readFileSync(path, "utf-8");
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// App lifecycle events
app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle("read-directory", async (event, path) => {
  try {
    const items = fs.readdirSync(path, { withFileTypes: true });
    return {
      success: true,
      items: items.map((item) => ({
        name: item.name,
        path: path + "/" + item.name,
        type: item.isDirectory() ? "directory" : "file",
        isDirectory: item.isDirectory(),
        isFile: item.isFile(),
      })),
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle(
  "create-file",
  async (event, { path: folderPath, name: relativePath }) => {
    try {
      const fullPath = path.join(folderPath, relativePath);
      const directory = path.dirname(fullPath);

      // Create directories recursively if they don't exist
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }

      // Create the file only if it doesn't exist
      if (!fs.existsSync(fullPath)) {
        fs.writeFileSync(fullPath, "");
      }

      return { success: true, path: fullPath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
);

ipcMain.handle(
  "create-directory",
  async (event, { path: folderPath, name: relativePath }) => {
    try {
      const fullPath = path.join(folderPath, relativePath);

      // Create directory and parents recursively
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }

      return { success: true, path: fullPath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
);

ipcMain.handle("delete-item", async (event, { path, isDirectory }) => {
  try {
    if (isDirectory) {
      fs.rmdirSync(path, { recursive: true });
    } else {
      fs.unlinkSync(path);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("rename-item", async (event, { oldPath, newPath }) => {
  try {
    fs.renameSync(oldPath, newPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("file-exists", async (event, path) => {
  try {
    const exists = fs.existsSync(path);
    return { success: true, exists };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("open-folder-dialog", async (event) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
    title: "Select Workspace Folder",
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const folderPath = result.filePaths[0];

    // Read the folder contents
    try {
      const items = fs.readdirSync(folderPath, { withFileTypes: true });
      return {
        success: true,
        path: folderPath,
        items: items.map((item) => ({
          name: item.name,
          path: path.join(folderPath, item.name),
          type: item.isDirectory() ? "directory" : "file",
          isDirectory: item.isDirectory(),
          isFile: item.isFile(),
        })),
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  return { success: false, canceled: true };
});

ipcMain.on("show-explorer-context-menu", (event, data) => {
  const template = [];

  if (data.isDirectory) {
    template.push(
      {
        label: "New File",
        click: () => event.sender.send("explorer-context-action", "new-file"),
      },
      {
        label: "New Folder",
        click: () => event.sender.send("explorer-context-action", "new-folder"),
      },
    );
  }

  if (!data.isWorkspace) {
    template.push(
      { type: "separator" },
      {
        label: "Rename",
        click: () => event.sender.send("explorer-context-action", "rename"),
      },
      {
        label: "Delete",
        click: () => event.sender.send("explorer-context-action", "delete"),
      },
    );
  }

  const menu = Menu.buildFromTemplate(template);
  menu.popup(BrowserWindow.fromWebContents(event.sender));
});

// save session

ipcMain.handle("save-session", async (event, sessionData) => {
  try {
    const currentSession = loadSession();

    // Merge with existing session data
    const mergedSession = {
      ...currentSession,
      ...sessionData,
      layout: {
        ...currentSession.layout,
        ...sessionData.layout,
      },
      settings: {
        ...currentSession.settings,
        ...sessionData.settings,
      },
    };

    saveSession(mergedSession);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

//  IPC handler to load session
ipcMain.handle("load-session", async () => {
  return loadSession();
});

//  IPC handler to clear session
ipcMain.handle("clear-session", async () => {
  try {
    if (fs.existsSync(sessionFile)) {
      fs.unlinkSync(sessionFile);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

app.on("before-quit", () => {
  if (mainWindow) {
    // Request final session save
    mainWindow.webContents.send("save-session-request");
  }
});
