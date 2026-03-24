import { ipcMain, dialog, BrowserWindow } from 'electron'

/** 注册原生对话框相关的 IPC 处理器 */
export function registerDialogHandlers(): void {
    // 选择部署目标文件夹
    ipcMain.handle('dialog:selectFolder', async () => {
        const win = BrowserWindow.getFocusedWindow()
        if (!win) return { canceled: true, path: '' }

        const result = await dialog.showOpenDialog(win, {
            title: '选择部署目标目录',
            properties: ['openDirectory']
        })

        if (result.canceled || result.filePaths.length === 0) {
            return { canceled: true, path: '' }
        }

        return { canceled: false, path: result.filePaths[0] }
    })

    // 选择 Skills 根目录
    ipcMain.handle('dialog:selectRootDir', async () => {
        const win = BrowserWindow.getFocusedWindow()
        if (!win) return { canceled: true, path: '' }

        const result = await dialog.showOpenDialog(win, {
            title: '选择 Skills 根目录',
            properties: ['openDirectory'],
            message: '请选择包含所有 Skill 文件夹的根目录'
        })

        if (result.canceled || result.filePaths.length === 0) {
            return { canceled: true, path: '' }
        }

        return { canceled: false, path: result.filePaths[0] }
    })
}
