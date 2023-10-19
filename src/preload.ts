const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  usersLoad: () => ipcRenderer.invoke('users:load'),
  usersSave: (data: Record<string, string>) => ipcRenderer.invoke('users:save', data),
  usersDelete: (id: string) => ipcRenderer.invoke('users:delete', id),
});
