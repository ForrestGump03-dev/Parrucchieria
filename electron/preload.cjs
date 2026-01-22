const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // Qui puoi esporre funzioni sicure al frontend
  // es: openExternal: (url) => ipcRenderer.invoke('open-external', url)
  platform: process.platform
});
