const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getHtmlFiles: () => ipcRenderer.invoke('get-html-files'),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  onWindowState: (cb) => ipcRenderer.on('window-state', (_, state) => cb(state)),
});
