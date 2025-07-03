import { contextBridge, ipcRenderer } from 'electron'
import { domReady } from './utils'
import { useLoading } from './loading'

const { append, remove } = useLoading()

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...listener] = args
    return ipcRenderer.off(channel, ...listener)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...data] = args
    ipcRenderer.send(channel, ...data)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...data] = args
    return ipcRenderer.invoke(channel, ...data)
  },
})


// --------- Preload scripts for renderer ---------
domReady().then(append)

window.onunload = remove
