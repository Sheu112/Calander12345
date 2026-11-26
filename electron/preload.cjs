// Small, explicit bridge between the app UI and the main process.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform,
  setTheme: (theme) => ipcRenderer.send('set-theme', theme),
  onMenu: (cb) => {
    const listener = (_e, cmd) => cb(cmd);
    ipcRenderer.on('menu', listener);
    return () => ipcRenderer.removeListener('menu', listener);
  },
});
