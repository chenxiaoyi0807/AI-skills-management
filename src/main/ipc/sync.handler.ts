import { ipcMain } from 'electron'
import { gitSyncService } from '../services/GitSyncService'
import { cloudSyncService } from '../services/CloudSyncService'

export function registerSyncHandlers() {
    // 导入新的 Skill
    ipcMain.handle('sync:clone-skill', async (_, repoUrl: string, folderName: string) => {
        try {
            await gitSyncService.cloneSkill(repoUrl, folderName)
            return { success: true }
        } catch (error: any) {
            return { success: false, message: error.message || String(error) }
        }
    })

    // 更新特定的 Skill
    ipcMain.handle('sync:update-skill', async (_, folderName: string) => {
        try {
            await gitSyncService.updateSkill(folderName)
            return { success: true }
        } catch (error: any) {
            return { success: false, message: error.message || String(error) }
        }
    })

    // 一键更新所有的 Git Skills
    ipcMain.handle('sync:update-all-skills', async () => {
        try {
            const result = await gitSyncService.updateAllSkills()
            return { success: true, data: result }
        } catch (error: any) {
            return { success: false, message: error.message || String(error) }
        }
    })

    // 检查是否需要自动更新
    ipcMain.handle('sync:check-auto', async () => {
        try {
            const triggered = await gitSyncService.checkAndAutoSync()
            return { success: true, data: triggered }
        } catch (error: any) {
             return { success: false, message: error.message || String(error) }
        }
    })

    // --- 云端同步接口 ---
    ipcMain.handle('cloudSync:push', async () => {
        try {
            await cloudSyncService.syncToCloud()
            return { success: true }
        } catch (error: any) {
            return { success: false, message: error.message || String(error) }
        }
    })

    ipcMain.handle('cloudSync:pull', async () => {
        try {
            await cloudSyncService.pullFromCloud()
            return { success: true }
        } catch (error: any) {
             return { success: false, message: error.message || String(error) }
        }
    })
}
