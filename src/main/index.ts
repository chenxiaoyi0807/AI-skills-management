import { app, BrowserWindow, shell } from 'electron'
import { join, resolve } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerConfigHandlers } from './ipc/config.handler'
import { registerSkillsHandlers } from './ipc/skills.handler'
import { registerDeployHandlers } from './ipc/deploy.handler'
import { registerDialogHandlers } from './ipc/dialog.handler'
import { registerSyncHandlers } from './ipc/sync.handler'

// 创建主窗口
function createWindow(): void {
    const mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        show: false,
        autoHideMenuBar: true,
        title: 'AI skills 管理',
        icon: resolve(__dirname, '../../resources/icon.png'),
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            sandbox: false,
            contextIsolation: true,
            nodeIntegration: false
        }
    })

    mainWindow.on('ready-to-show', () => {
        mainWindow.show()
    })

    // 外部链接用系统浏览器打开
    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url)
        return { action: 'deny' }
    })

    // 开发模式加载 Vite dev server，生产模式加载构建产物
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
}

// 设置应用名称
app.name = 'Skill 管理工具'

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
    app.quit()
} else {
    app.on('second-instance', () => {
        // 当运行第二个实例时，将会聚焦到 mainWindow 这个窗口
        const windows = BrowserWindow.getAllWindows()
        if (windows.length) {
            const mainWindow = windows[0]
            if (mainWindow.isMinimized()) mainWindow.restore()
            mainWindow.focus()
        }
    })

    // 应用初始化
    app.whenReady().then(() => {
    // 设置应用 ID
    electronApp.setAppUserModelId('com.ai-skills-manager')

    // 注册所有 IPC 处理器
    registerConfigHandlers()
    registerSkillsHandlers()
    registerDeployHandlers()
    registerDialogHandlers()
    registerSyncHandlers()

    // 开发模式下默认用 F12 打开 DevTools
    app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window)
    })

    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

// macOS 以外的平台，所有窗口关闭时退出应用
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
}
