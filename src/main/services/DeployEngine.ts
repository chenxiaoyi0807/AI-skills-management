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
        const conflicts: ConflictItem[] = []
        
        const skillsToDeploy = req.skills && req.skills.length > 0 
            ? req.skills 
            : [{ skillName: req.skillName, files: req.files }]

        for (const skill of skillsToDeploy) {
            const skillPath = join(config.rootDir, skill.skillName)
            const deployTargetBase = join(req.targetDir, skill.skillName)

            for (const file of skill.files) {
                const sourcePath = join(skillPath, file)
                const targetPath = join(deployTargetBase, file)
                const combinedFileName = req.skills ? `${skill.skillName}/${file}` : file

                try {
                    await fs.access(targetPath)
                    // 文件存在，记录冲突
                    conflicts.push({
                        fileName: combinedFileName,
                        sourcePath,
                        targetPath
                    })
                } catch {
                    // 文件不存在，无冲突
                }
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
        const results: DeployResult[] = []

        const skillsToDeploy = req.skills && req.skills.length > 0 
            ? req.skills 
            : [{ skillName: req.skillName, files: req.files }]

        for (const skill of skillsToDeploy) {
            const skillPath = join(config.rootDir, skill.skillName)
            const deployTargetBase = join(req.targetDir, skill.skillName)

            for (const file of skill.files) {
                const sourcePath = join(skillPath, file)
                const targetPath = join(deployTargetBase, file)
                const combinedFileName = req.skills ? `${skill.skillName}/${file}` : file

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
                        const resolution = resolutions[combinedFileName]
                        if (resolution === 'skip') {
                            results.push({ skillName: skill.skillName, fileName: combinedFileName, status: 'skipped', message: '用户选择跳过' })
                            continue
                        }
                        // overwrite 或未指定（默认覆盖）
                    }

                    // 确保目标目录存在
                    await fs.mkdir(dirname(targetPath), { recursive: true })

                    // 执行复制
                    await fs.copyFile(sourcePath, targetPath)

                    results.push({
                        skillName: skill.skillName,
                        fileName: combinedFileName,
                        status: exists ? 'overwritten' : 'copied'
                    })
                } catch (err) {
                    results.push({
                        skillName: skill.skillName,
                        fileName: combinedFileName,
                        status: 'error',
                        message: err instanceof Error ? err.message : '未知错误'
                    })
                }
            }
        }

        return results
    }
}

export const deployEngine = new DeployEngine()
