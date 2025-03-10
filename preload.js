const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveConfig: users => ipcRenderer.invoke('saveConfig', users),

  loadConfig: () => ipcRenderer.invoke('loadConfig'),

  testAuthentication: user => ipcRenderer.invoke('testAuthentication', user),

  runScript: () => ipcRenderer.invoke('runScript'),

  onScriptOutput: callback => {
    ipcRenderer.on('scriptOutput', (_, data) => callback(data));
  },

  onScriptError: callback => {
    ipcRenderer.on('scriptError', (_, data) => callback(data));
  },
});
