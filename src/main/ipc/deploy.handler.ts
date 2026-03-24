import { ipcMain } from 'electron'
import { deployEngine } from '../services/DeployEngine'
import type { DeployRequest } from '../../shared/types'

/** 注册部署相关的 IPC 处理器 */
export function registerDeployHandlers(): void {
    // 冲突预检
    ipcMain.handle('deploy:check', async (_event, req: DeployRequest) => {
        try {
            const conflicts = await deployEngine.checkConflicts(req)
            return { success: true, conflicts }
        } catch (err) {
            return {
                success: false,
                conflicts: [],
                message: err instanceof Error ? err.message : '冲突检测失败'
            }
        }
    })

    // 执行部署
    ipcMain.handle(
        'deploy:execute',
        async (
            _event,
            req: DeployRequest,
            resolutions: Record<string, 'overwrite' | 'skip'>
        ) => {
            try {
                const results = await deployEngine.executeDeploy(req, resolutions)
                return { success: true, results }
            } catch (err) {
                return {
                    success: false,
                    results: [],
                    message: err instanceof Error ? err.message : '部署执行失败'
                }
            }
        }
    )
}
