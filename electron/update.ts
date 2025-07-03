import { type BrowserWindow, app, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'

export function update(win: BrowserWindow) {
  // When set to false, the update download will be triggered through the API
  autoUpdater.autoDownload = false
  autoUpdater.disableWebInstaller = false
  autoUpdater.allowDowngrade = false

  // start check
  autoUpdater.on('checking-for-update', function () { })
  // update available
  autoUpdater.on('update-available', (arg) => {
    win.webContents.send('update-can-available', { update: true, version: app.getVersion(), newVersion: arg?.version })
  })
  // update not available
  autoUpdater.on('update-not-available', (arg) => {
    win.webContents.send('update-can-available', { update: false, version: app.getVersion(), newVersion: arg?.version })
  })

  // Find update and download it
  ipcMain.handle('download-update', () => {
    autoUpdater.downloadUpdate()
  })
  // download progress
  autoUpdater.on('download-progress', (progressObj) => {
    win.webContents.send('download-progress', progressObj)
  })
  // download success
  autoUpdater.on('update-downloaded', () => {
    win.webContents.send('update-downloaded')
  })
  // install success
  ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall()
  })
}
