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
  },

  /**
   * 自动更新（照 sillytavern-shell）。
   *
   * 流程：check() → 有新版本 → download() → 进度事件 → downloaded → install()
   * 全程由用户确认，不后台静默下载。
   */
  update: {
    /** 当前版本 */
    version: () => ipcRenderer.invoke('update:version'),
    /** 检查更新 → { hasUpdate, version, current } 或 { error } */
    check: () => ipcRenderer.invoke('update:check'),
    /** 开始下载 → { success } 或 { error } */
    download: () => ipcRenderer.invoke('update:download'),
    /** 安装并重启 */
    install: () => ipcRenderer.invoke('update:install'),

    /** 下载进度：{ percent, transferred, total, bytesPerSecond } */
    onProgress: (cb) => {
      const h = (_e, p) => cb(p)
      ipcRenderer.on('update:progress', h)
      return () => ipcRenderer.removeListener('update:progress', h)
    },
    /** 下载完成 */
    onDownloaded: (cb) => {
      const h = () => cb()
      ipcRenderer.on('update:downloaded', h)
      return () => ipcRenderer.removeListener('update:downloaded', h)
    },
    /** 出错 */
    onError: (cb) => {
      const h = (_e, m) => cb(m)
      ipcRenderer.on('update:error', h)
      return () => ipcRenderer.removeListener('update:error', h)
    }
  }
})
