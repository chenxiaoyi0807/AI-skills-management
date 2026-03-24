import { promises as fs } from 'fs'
import { join, dirname } from 'path'
import type { DeployRequest, ConflictItem, DeployResult } from '../../shared/types'
import { configManager } from './ConfigManager'

/**
 * 部署引擎
 * 负责将选中的文件复制到用户指定的目标目录
 */
export class DeployEngine {
    /**
     * 冲突预检
     * 检查目标目录中是否存在同名文件
     */
    async checkConflicts(req: DeployRequest): Promise<ConflictItem[]> {
        const config = await configManager.loadConfig()
        const skillPath = join(config.rootDir, req.skillName)
        const deployTargetBase = join(req.targetDir, req.skillName)
        const conflicts: ConflictItem[] = []

        for (const file of req.files) {
            const sourcePath = join(skillPath, file)
            const targetPath = join(deployTargetBase, file)

            try {
                await fs.access(targetPath)
                // 文件存在，记录冲突
                conflicts.push({
                    fileName: file,
                    sourcePath,
                    targetPath
                })
            } catch {
                // 文件不存在，无冲突
            }
        }

        return conflicts
    }

    /**
     * 执行部署
     * 将文件从源目录复制到目标目录
     * @param req 部署请求
     * @param resolutions 冲突处理策略 { 文件相对路径: 'overwrite' | 'skip' }
     */
    async executeDeploy(
        req: DeployRequest,
        resolutions: Record<string, 'overwrite' | 'skip'> = {}
    ): Promise<DeployResult[]> {
        const config = await configManager.loadConfig()
        const skillPath = join(config.rootDir, req.skillName)
        const deployTargetBase = join(req.targetDir, req.skillName)
        const results: DeployResult[] = []

        for (const file of req.files) {
            const sourcePath = join(skillPath, file)
            const targetPath = join(deployTargetBase, file)

            try {
                // 检查目标文件是否已存在
                let exists = false
                try {
                    await fs.access(targetPath)
                    exists = true
                } catch {
                    // 不存在
                }

                if (exists) {
                    const resolution = resolutions[file]
                    if (resolution === 'skip') {
                        results.push({ fileName: file, status: 'skipped', message: '用户选择跳过' })
                        continue
                    }
                    // overwrite 或未指定（默认覆盖）
                }

                // 确保目标目录存在
                await fs.mkdir(dirname(targetPath), { recursive: true })

                // 执行复制
                await fs.copyFile(sourcePath, targetPath)

                results.push({
                    fileName: file,
                    status: exists ? 'overwritten' : 'copied'
                })
            } catch (err) {
                results.push({
                    fileName: file,
                    status: 'error',
                    message: err instanceof Error ? err.message : '未知错误'
                })
            }
        }

        return results
    }
}

export const deployEngine = new DeployEngine()
