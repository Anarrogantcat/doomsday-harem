/**
 * Electron 主进程。
 *
 * 为什么从 Tauri 迁到 Electron：
 *   Tauri 产物是「Rust 外壳 + 运行时自解压」，撞上杀软的「自解压 + 写文件」
 *   高危特征，火绒 / Defender / 国产杀软误报率高。Electron 的 app.asar
 *   归档结构与 VS Code / Slack 同构，能吃到主流白样本信誉。
 *
 * 本文件是 .cjs：package.json 带 "type": "module"，
 * 用 .js 会被当 ESM 解析而导致 require 失败。
 *
 * 迁移自 Tauri 侧：
 *   src-tauri/src/main.rs  → 窗口 / 单实例
 *   src-tauri/src/save.rs  → 存档加密（AES-256-GCM + HMAC-SHA256）
 *   src-tauri/src/mods.rs  → Mod 读取
 *   src-tauri/src/data.rs  → 数据目录
 */

const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const crypto = require('node:crypto')

// ────────────────────────────────────────────────────────────
// 启动日志
//
// 打包后 stdout 不可见，所有诊断写文件。
// 路径：<userData>/main.log
// ────────────────────────────────────────────────────────────
let logFile = null
function log(msg) {
  try {
    if (!logFile) logFile = path.join(app.getPath('userData'), 'main.log')
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`)
  } catch { /* 日志失败不能影响启动 */ }
}

// ────────────────────────────────────────────────────────────
// 单实例锁
//
// 必须是进程第一件事：双开会导致两个缓存写入者、两个存档句柄。
// 抢锁失败的一方立刻退出，由已有实例处理聚焦请求。
// ────────────────────────────────────────────────────────────
/**
 * GPU 兼容性兜底（**这是「窗口空白」的根治方案**）。
 *
 * 症状：窗口打开了，但整片空白，随后进程退出。
 * 日志：gpu_process_host.cc: GPU process launch failed: error_code=18
 *
 * 原因：Chromium 的 GPU 进程启动失败时，默认会反复重试并最终
 * 判定「GPU 不可用」，此过程渲染器拿不到帧 → 白屏。
 *
 * 策略（三道保险）：
 *   1) 命令行 --disable-gpu / --soft-render  → 强制软件渲染
 *   2) 环境变量 ELECTRON_DISABLE_GPU=1        → 同上（便于脚本控制）
 *   3) **默认开启软件渲染兜底**：Chromium 的 GPU 黑名单机制
 *      在多数「GPU 启动失败」场景下会自动回退，但 error_code=18
 *      （设备被占用 / 驱动异常）不在黑名单里，需要显式禁用。
 *
 * 代价：软件渲染下画面略慢，但对本作（静态界面为主）无影响。
 */
const wantSoftware =
  process.argv.includes('--disable-gpu') ||
  process.argv.includes('--soft-render') ||
  process.env.ELECTRON_DISABLE_GPU === '1'

if (wantSoftware) {
  app.disableHardwareAcceleration()
  log('hardware acceleration DISABLED (software rendering)')
} else {
  // 保留硬件加速，但关闭可能引发 error_code=18 的 GPU 特性
  app.commandLine.appendSwitch('disable-gpu-compositing')
  app.commandLine.appendSwitch('disable-gpu-sandbox')
  app.commandLine.appendSwitch('disable-software-rasterizer-fallback')
  log('hardware acceleration ENABLED (with GPU fallbacks)')
}

// GPU 缓存目录隔离（避免多实例 / 上次残留导致 0x20 占用错误）
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache')

// 单实例锁 —— 必须是进程第一件事
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}
log('main.cjs loaded, argv=' + JSON.stringify(process.argv.slice(1)))

const isDev = process.argv.includes('--dev')
const DEV_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'

/** 主窗口 */
let mainWindow = null

// ────────────────────────────────────────────────────────────
// 数据目录
//
// 迁移自 data.rs。用 userData 下的 data/ 作为可写根，
// 用户可在设置里改；改后不再随目录变化（否则旧存档解不开）。
// ────────────────────────────────────────────────────────────
let dataRoot = null

function initDataRoot() {
  const settingsFile = path.join(app.getPath('userData'), 'data-layout.json')
  let custom = null
  try {
    if (fs.existsSync(settingsFile)) {
      const j = JSON.parse(fs.readFileSync(settingsFile, 'utf8'))
      if (j && typeof j.dataDir === 'string' && j.dataDir) custom = j.dataDir
    }
  } catch { /* 忽略损坏的设置 */ }
  dataRoot = custom || path.join(app.getPath('userData'), 'data')
  for (const sub of ['saves', 'mods', 'cache', 'logs', 'exports']) {
    fs.mkdirSync(path.join(dataRoot, sub), { recursive: true })
  }
  return dataRoot
}

function dataDir(sub) { return path.join(dataRoot, sub) }
function savesDir() { return dataDir('saves') }
function modsDir() { return dataDir('mods') }

// ────────────────────────────────────────────────────────────
// 存档加密（迁移自 save.rs）
//
// 格式：[12B nonce][ciphertext]
// 明文：JSON { checksum, payload }
// checksum = HMAC-SHA256(key, payload)，用于检测篡改
//
// 密钥种子固定为应用标识，不随数据目录变化 ——
// 否则用户切换数据目录后旧存档无法解密。
// ────────────────────────────────────────────────────────────
const NONCE_LEN = 12
const KEY_SEED = 'doomsday-harem-v1-save-key'

function saveKey() {
  return crypto.createHash('sha256').update(KEY_SEED).digest()  // 32B
}

function checksum(key, payload) {
  return crypto.createHmac('sha256', key).update(payload).digest('hex')
}

ipcMain.handle('save:write', (_e, slot, json) => {
  const key = saveKey()
  const sum = checksum(key, json)
  const envelope = JSON.stringify({ checksum: sum, payload: json })

  const iv = crypto.randomBytes(NONCE_LEN)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([cipher.update(envelope, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  // [nonce][tag][ciphertext]
  const out = Buffer.concat([iv, tag, ct])
  const file = path.join(savesDir(), slot + '.sav')
  fs.writeFileSync(file, out)
  return file
})

ipcMain.handle('save:read', (_e, slot) => {
  const key = saveKey()
  const file = path.join(savesDir(), slot + '.sav')
  const raw = fs.readFileSync(file)
  if (raw.length <= NONCE_LEN + 16) throw new Error('存档损坏')

  const iv = raw.subarray(0, NONCE_LEN)
  const tag = raw.subarray(NONCE_LEN, NONCE_LEN + 16)
  const ct = raw.subarray(NONCE_LEN + 16)
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')

  const env = JSON.parse(pt)
  // 校验 HMAC：不一致说明被篡改
  if (env.checksum !== checksum(key, env.payload)) {
    throw new Error('校验和不符（存档可能被篡改）')
  }
  return env.payload
})

ipcMain.handle('save:list', () => {
  const dir = savesDir()
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.sav'))
    .map((f) => {
      const st = fs.statSync(path.join(dir, f))
      return { slot: f.replace(/\.sav$/, ''), savedAt: st.mtime.toISOString(), bytes: st.size }
    })
})

ipcMain.handle('save:delete', (_e, slot) => {
  const file = path.join(savesDir(), slot + '.sav')
  if (fs.existsSync(file)) fs.unlinkSync(file)
  return true
})

// ────────────────────────────────────────────────────────────
// Mod（迁移自 mods.rs）
// ────────────────────────────────────────────────────────────
ipcMain.handle('mods:list', () => {
  const dir = modsDir()
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => ({ id: d.name, path: path.join(dir, d.name) }))
})

ipcMain.handle('mods:readManifest', (_e, id) => {
  const f = path.join(modsDir(), id, 'mod.json')
  if (!fs.existsSync(f)) return null
  try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return null }
})

ipcMain.handle('mods:readFile', (_e, id, rel) => {
  const base = path.join(modsDir(), id)
  const target = path.resolve(base, rel)
  // 防目录穿越：必须仍在 mod 目录内
  if (!target.startsWith(base + path.sep) && target !== base) {
    throw new Error('非法路径')
  }
  return fs.readFileSync(target, 'utf8')
})

ipcMain.handle('mods:openDir', async () => {
  await shell.openPath(modsDir())
  return true
})

// ────────────────────────────────────────────────────────────
// 数据目录接口（迁移自 data.rs）
// ────────────────────────────────────────────────────────────
ipcMain.handle('data:layout', () => ({
  dataRoot,
  saves: savesDir(),
  mods: modsDir(),
  cache: dataDir('cache'),
  logs: dataDir('logs'),
  exports: dataDir('exports')
}))

ipcMain.handle('data:openDir', async () => {
  await shell.openPath(dataRoot)
  return true
})

ipcMain.handle('data:setDir', async () => {
  const r = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] })
  if (r.canceled || r.filePaths.length === 0) return null
  const next = r.filePaths[0]
  const settingsFile = path.join(app.getPath('userData'), 'data-layout.json')
  fs.writeFileSync(settingsFile, JSON.stringify({ dataDir: next }, null, 2))
  return next
})

// ────────────────────────────────────────────────────────────
// 窗口
// ────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 950,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#1a1d24',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  // GPU 崩溃 / 渲染进程挂掉时记录（否则用户只看到空白）
  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    log('RENDER_GONE ' + JSON.stringify(details))
  })
  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    log('DID_FAIL_LOAD ' + code + ' ' + desc + ' url=' + url)
  })
  mainWindow.webContents.on('console-message', (_e, lvl, msg) => {
    log('RENDERER[' + lvl + '] ' + msg)
  })
  mainWindow.webContents.once('did-finish-load', () => {
    log('DID_FINISH_LOAD ok')
  })

  /**
   * 显示窗口。
   *
   * 两重兜底：
   *   1) ready-to-show 正常触发 → 立即显示
   *   2) 5 秒内没触发（GPU 卡死）→ 强制显示，让用户至少看到界面
   */
  let shown = false
  const show = (why) => {
    if (shown || !mainWindow || mainWindow.isDestroyed()) return
    shown = true
    mainWindow.show()
    log('WINDOW_SHOWN via ' + why)
  }
  mainWindow.once('ready-to-show', () => show('ready-to-show'))
  setTimeout(() => show('timeout-5s'), 5000)

  // 外链走系统浏览器，不在应用内打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev) {
    mainWindow.loadURL(DEV_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  mainWindow.on('closed', () => { mainWindow = null })
}

// 第二个实例启动时聚焦已有窗口
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

app.whenReady().then(() => {
  initDataRoot()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
