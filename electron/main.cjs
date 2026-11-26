// Electron main process: a native macOS window around the Vite-built React app.
const { app, BrowserWindow, Menu, ipcMain, nativeTheme, shell } = require('electron');
const path = require('node:path');

const isMac = process.platform === 'darwin';
const devUrl = process.env.VITE_DEV_SERVER_URL;
let win;

function send(cmd) {
  win?.webContents.send('menu', cmd);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 760,
    minHeight: 520,
    title: 'Glass Calendar',
    show: false,
    // Native macOS chrome: inset traffic lights over the frosted sidebar.
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 18, y: 18 },
    vibrancy: isMac ? 'sidebar' : undefined,
    visualEffectState: 'followWindow',
    backgroundColor: isMac ? '#00000000' : '#FFFFFF',
    transparent: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once('ready-to-show', () => win.show());

  // Open external links in the default browser, never inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (devUrl) win.loadURL(devUrl);
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  win.on('closed', () => (win = null));
}

function buildMenu() {
  const template = [
    ...(isMac
      ? [{
          label: app.name,
          submenu: [
            { role: 'about' },
            { type: 'separator' },
            { role: 'services' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' },
          ],
        }]
      : []),
    {
      label: 'File',
      submenu: [
        { label: 'New Event', accelerator: 'CmdOrCtrl+N', click: () => send('new-event') },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
        { type: 'separator' },
        { label: 'Find…', accelerator: 'CmdOrCtrl+F', click: () => send('search') },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Day', accelerator: 'CmdOrCtrl+1', click: () => send('view:day') },
        { label: 'Week', accelerator: 'CmdOrCtrl+2', click: () => send('view:week') },
        { label: 'Month', accelerator: 'CmdOrCtrl+3', click: () => send('view:month') },
        { label: 'Year', accelerator: 'CmdOrCtrl+4', click: () => send('view:year') },
        { type: 'separator' },
        { label: 'Toggle Sidebar', accelerator: 'CmdOrCtrl+Alt+S', click: () => send('toggle-sidebar') },
        { label: 'Toggle Dark Mode', accelerator: 'CmdOrCtrl+Shift+D', click: () => send('toggle-dark') },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Go',
      submenu: [
        { label: 'Today', accelerator: 'CmdOrCtrl+T', click: () => send('today') },
        { label: 'Previous', accelerator: 'CmdOrCtrl+Left', click: () => send('prev') },
        { label: 'Next', accelerator: 'CmdOrCtrl+Right', click: () => send('next') },
      ],
    },
    { role: 'windowMenu' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// Keep native vibrancy and window chrome in step with the in-app theme toggle.
ipcMain.on('set-theme', (_e, theme) => {
  nativeTheme.themeSource = theme === 'dark' ? 'dark' : 'light';
});

app.whenReady().then(() => {
  buildMenu();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});
