const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let filePath = null;

// Create the main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  // Load the index.html
  mainWindow.loadFile('index.html');

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Create application menu
  createMenu();
}

// Create application menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            filePath = null;
            mainWindow.webContents.send('file-new');
          }
        },
        {
          label: 'Open',
          accelerator: 'CmdOrCtrl+O',
          click: openFile
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: saveFile
        },
        {
          label: 'Save As',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: saveFileAs
        },
        {
            label: 'Open Folder',
            accelerator: 'CmdOrCtrl+Shift+O',
            click: openFolder
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Redo', accelerator: 'CmdOrCtrl+Shift+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: 'Select All', accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: 'Toggle Developer Tools', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+=', role: 'zoomIn' },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { label: 'Reset Zoom', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' }
      ]
    },
    {
      label: 'Debug',
      submenu: [
        {
          label: 'Run Code',
          accelerator: 'F5',
          click: () => mainWindow.webContents.send('debug-run')
        },
        {
          label: 'Stop Execution',
          accelerator: 'Shift+F5',
          click: () => mainWindow.webContents.send('debug-stop')
        }
      ]
    }
  ];

  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Open folder
async function openFolder() {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        title: 'Select Workspace Folder'
    });

    if (!result.canceled && result.filePaths.length > 0) {
        const folderPath = result.filePaths[0];
        
        try {
            const items = fs.readdirSync(folderPath, { withFileTypes: true });
            mainWindow.webContents.send('folder-opened', { 
                success: true,
                path: folderPath,
                items: items.map(item => ({
                    name: item.name,
                    path: path.join(folderPath, item.name),
                    type: item.isDirectory() ? 'directory' : 'file',
                    isDirectory: item.isDirectory(),
                    isFile: item.isFile()
                }))
            });
        } catch (error) {
            console.error('Error reading folder:', error);
        }
    }
}

// Open file dialog
async function openFile() {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'All Files', extensions: ['*'] },
      { name: 'JavaScript', extensions: ['js', 'jsx', 'mjs'] },
      { name: 'HTML', extensions: ['html', 'htm'] },
      { name: 'CSS', extensions: ['css'] },
      { name: 'JSON', extensions: ['json'] },
      { name: 'Text', extensions: ['txt', 'md'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    filePath = result.filePaths[0];
    const content = fs.readFileSync(filePath, 'utf-8');
    mainWindow.webContents.send('file-opened', { path: filePath, content });
  }
}

// Save file
async function saveFile() {
  if (filePath) {
    mainWindow.webContents.send('file-save', filePath);
  } else {
    saveFileAs();
  }
}

// Save file as
async function saveFileAs() {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: 'All Files', extensions: ['*'] },
      { name: 'JavaScript', extensions: ['js'] },
      { name: 'HTML', extensions: ['html'] },
      { name: 'CSS', extensions: ['css'] },
      { name: 'Text', extensions: ['txt'] }
    ]
  });

  if (!result.canceled) {
    filePath = result.filePath;
    mainWindow.webContents.send('file-save', filePath);
  }
}

// IPC handlers
ipcMain.handle('write-file', async (event, { path, content }) => {
  try {
    fs.writeFileSync(path, content);
    return { success: true, path };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('read-file', async (event, path) => {
  try {
    const content = fs.readFileSync(path, 'utf-8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// App lifecycle events
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('read-directory', async (event, path) => {
  try {
    const items = fs.readdirSync(path, { withFileTypes: true });
    return {
      success: true,
      items: items.map(item => ({
        name: item.name,
        path: path + '/' + item.name,
        type: item.isDirectory() ? 'directory' : 'file',
        isDirectory: item.isDirectory(),
        isFile: item.isFile()
      }))
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('create-file', async (event, { path: folderPath, name: relativePath }) => {
  try {
    const fullPath = path.join(folderPath, relativePath);
    const directory = path.dirname(fullPath);

    // Create directories recursively if they don't exist
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }

    // Create the file only if it doesn't exist
    if (!fs.existsSync(fullPath)) {
      fs.writeFileSync(fullPath, '');
    }

    return { success: true, path: fullPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('create-directory', async (event, { path: folderPath, name: relativePath }) => {
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
});

ipcMain.handle('delete-item', async (event, { path, isDirectory }) => {
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

ipcMain.handle('rename-item', async (event, { oldPath, newPath }) => {
  try {
    fs.renameSync(oldPath, newPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('file-exists', async (event, path) => {
  try {
    const exists = fs.existsSync(path);
    return { success: true, exists };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-folder-dialog', async (event) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Workspace Folder'
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const folderPath = result.filePaths[0];
    
    // Read the folder contents
    try {
      const items = fs.readdirSync(folderPath, { withFileTypes: true });
      return {
        success: true,
        path: folderPath,
        items: items.map(item => ({
          name: item.name,
          path: path.join(folderPath, item.name),
          type: item.isDirectory() ? 'directory' : 'file',
          isDirectory: item.isDirectory(),
          isFile: item.isFile()
        }))
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  return { success: false, canceled: true };
});

ipcMain.on('show-explorer-context-menu', (event, data) => {
  const template = [];

  if (data.isDirectory) {
    template.push(
      {
        label: 'New File',
        click: () => event.sender.send('explorer-context-action', 'new-file')
      },
      {
        label: 'New Folder',
        click: () => event.sender.send('explorer-context-action', 'new-folder')
      }
    );
  }

  if (!data.isWorkspace) {
    template.push(
      { type: 'separator' },
      {
        label: 'Rename',
        click: () => event.sender.send('explorer-context-action', 'rename')
      },
      {
        label: 'Delete',
        click: () => event.sender.send('explorer-context-action', 'delete')
      }
    );
  }

  const menu = Menu.buildFromTemplate(template);
  menu.popup(BrowserWindow.fromWebContents(event.sender));
});