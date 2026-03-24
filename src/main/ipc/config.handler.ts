import { ipcMain } from 'electron'
import { configManager } from '../services/ConfigManager'

/** 注册配置相关的 IPC 处理器 */
export function registerConfigHandlers(): void {
    // 获取当前配置
    ipcMain.handle('config:get', async () => {
        return await configManager.loadConfig()
    })

    // 设置根目录
    ipcMain.handle('config:setRootDir', async (_event, dirPath: string) => {
        try {
            await configManager.setRootDir(dirPath)
            return { success: true }
        } catch (err) {
            return {
                success: false,
                message: err instanceof Error ? err.message : '设置根目录失败'
            }
        }
    })

    ipcMain.handle('config:updateCloud', async (_event, githubToken: string, syncRepoUrl: string) => {
        try {
            await configManager.updateCloudConfig(githubToken, syncRepoUrl)
            return { success: true }
        } catch (err) {
            return {
                success: false,
                message: err instanceof Error ? err.message : '保存云端同步配置失败'
            }
        }
    })
}
