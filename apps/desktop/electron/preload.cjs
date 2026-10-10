/**
 * Electron preload —— 渲染进程与主进程之间的安全桥。
 *
 * 只暴露白名单 API，不开放 Node 能力（contextIsolation: true）。
 * 渲染侧通过 window.dh.* 调用。
 *
 * 与 Tauri 的对应关系：
 *   invoke('save_game', {...})  →  window.dh.save.write(slot, json)
 *   invoke('load_game', {...})  →  window.dh.save.read(slot)
 *   invoke('list_mods')         →  window.dh.mods.list()
 *   invoke('get_data_layout')   →  window.dh.data.layout()
 */
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('dh', {
  /** 是否运行在 Electron 内（渲染侧可据此降级到浏览器存储） */
  isElectron: true,
  platform: process.platform,

  save: {
    write: (slot, json) => ipcRenderer.invoke('save:write', slot, json),
    read: (slot) => ipcRenderer.invoke('save:read', slot),
    list: () => ipcRenderer.invoke('save:list'),
    remove: (slot) => ipcRenderer.invoke('save:delete', slot)
  },

  mods: {
    list: () => ipcRenderer.invoke('mods:list'),
    readManifest: (id) => ipcRenderer.invoke('mods:readManifest', id),
    readFile: (id, rel) => ipcRenderer.invoke('mods:readFile', id, rel),
    openDir: () => ipcRenderer.invoke('mods:openDir')
  },

  data: {
    layout: () => ipcRenderer.invoke('data:layout'),
    openDir: () => ipcRenderer.invoke('data:openDir'),
    setDir: () => ipcRenderer.invoke('data:setDir')
  }
})
