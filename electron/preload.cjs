const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  checkLicense: (simDay) => ipcRenderer.invoke('check-license', simDay),
  validateLicense: (key) => ipcRenderer.invoke('validate-license', key),
  closeApp: () => ipcRenderer.send('close-app'),
  triggerAlarmNotification: (title, body) => ipcRenderer.send('trigger-alarm-notification', title, body),
  setHeight: (height) => ipcRenderer.send('set-height', height),
  cardBounds: (bounds) => ipcRenderer.send('card-bounds', bounds),
  scaleStart: () => ipcRenderer.send('scale-start'),
  scaleEnd: (scale) => ipcRenderer.send('scale-end', scale),
  setIgnoreMouseEvents: (ignore, options) => ipcRenderer.send('set-ignore-mouse-events', ignore, options),
  saveIcon: (dataUrl) => ipcRenderer.send('save-icon', dataUrl),
  installUpdate: () => ipcRenderer.send('install-update'),
  onUpdateAvailable: (cb) => {
    ipcRenderer.on('update-available', (event, version) => cb(version));
  },
  onDownloadProgress: (cb) => {
    ipcRenderer.on('download-progress', (event, percent) => cb(percent));
  },
  onUpdateDownloaded: (cb) => {
    ipcRenderer.on('update-downloaded', () => cb());
  },
  onUpdateError: (cb) => {
    ipcRenderer.on('update-error', (event, err) => cb(err));
  }
});
