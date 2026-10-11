/**
 * 打包后校验（electron-builder afterPack 钩子）。
 *
 * 照 sillytavern-shell 的做法：**缺文件就硬失败**，
 * 而不是只打日志然后构建成功 —— 避免「装完才发现打不开」。
 *
 * 校验项：
 *   1. 主进程入口存在
 *   2. 预加载脚本存在
 *   3. 渲染层 index.html 存在
 *   4. index.html 用的是**相对路径**（file:// 下绝对路径会 404 → 白屏）
 */
const fs = require('node:fs')
const path = require('node:path')

module.exports = async function afterPack(context) {
  const { appOutDir } = context
  const resDir = path.join(appOutDir, 'resources', 'app')

  const must = [
    ['electron/main.cjs', '主进程入口'],
    ['electron/preload.cjs', '预加载脚本'],
    ['dist/index.html', '渲染层入口'],
    ['package.json', '应用清单']
  ]

  const missing = []
  for (const [rel, label] of must) {
    if (!fs.existsSync(path.join(resDir, rel))) missing.push(label + '（' + rel + '）')
  }
  if (missing.length > 0) {
    throw new Error('[afterPack] 打包不完整，缺少：' + missing.join('、'))
  }

  // index.html 必须是相对路径 —— Electron 用 file:// 加载，
  // 绝对路径 /assets/... 会指向磁盘根导致资源 404（白屏）。
  const html = fs.readFileSync(path.join(resDir, 'dist', 'index.html'), 'utf8')
  if (/src="\/|href="\//.test(html)) {
    throw new Error('[afterPack] dist/index.html 含绝对路径 —— file:// 下会 404 白屏，请设 vite base: "./"')
  }

  console.log('[afterPack] 校验通过：入口完整，资源路径为相对路径')
}
