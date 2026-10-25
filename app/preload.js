const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('kovDesk', {
  cfg: {},
  shellVersion: () => ipcRenderer.invoke('kov:shellVersion'),
  checkUpdate: () => ipcRenderer.invoke('kov:check'),
  applyUpdate: () => ipcRenderer.invoke('kov:apply')
});
