import { exec } from 'child_process'
import { join } from 'path'
import { promisify } from 'util'
import { promises as fs } from 'fs'
import { configManager } from './ConfigManager'

const execAsync = promisify(exec)

export class CloudSyncService {
    /**
     * 将整个 rootDir 中的所有的子层级 `.git` 改名为 `._git` (如果 targetName='._git')
     * 或者将所有的 `._git` 恢复为 `.git` (如果 targetName='.git')
     * 只有这样才能骗过外部根目录的 git 使得它将这些子系统仅仅当成受控的文件库推送。
     */
    private async renameGitFolders(targetName: '.git' | '._git'): Promise<void> {
        const config = await configManager.loadConfig()
        if (!config.rootDir) return

        const sourceName = targetName === '.git' ? '._git' : '.git'
        
        try {
            const items = await fs.readdir(config.rootDir, { withFileTypes: true })
            for (const item of items) {
                // 我们只关心一级子文件夹，因为我们的技能包都是平级放的
                if (item.isDirectory() && !item.name.startsWith('.')) {
                    const skillPath = join(config.rootDir, item.name)
                    const sourceGitPath = join(skillPath, sourceName)
                    try {
                        const stat = await fs.stat(sourceGitPath)
                        if (stat.isDirectory()) {
                            await fs.rename(sourceGitPath, join(skillPath, targetName))
                        }
                    } catch (e: any) {
                        // 忽略找不到文件的情况
                        if (e.code !== 'ENOENT') {
                            console.error(`重命名失败 ${sourceGitPath}:`, e)
                        }
                    }
                }
            }
        } catch (error) {
            console.error('遍历根目录失败:', error)
        }
    }

    /**
     * 一键将所有的技能库打包推送到您的私有 Github 云端仓库
     */
    async syncToCloud(): Promise<void> {
        const config = await configManager.loadConfig()
        if (!config.rootDir) throw new Error('未设置技能根目录。')
        if (!config.syncRepoUrl || !config.githubToken) throw new Error('未配置私有云端仓库地址或 Github Token。请在设置中配置。')

        const token = config.githubToken.trim()
        const repoUrl = config.syncRepoUrl.trim()
        // 构建带有授权的地址 (https://<token>@github.com/...)
        const authUrl = repoUrl.replace('https://', `https://${token}@`)

        try {
            // 1. 开始欺骗手法，隐藏所有子系统的 .git
            await this.renameGitFolders('._git')

            const targetDir = config.rootDir

            // 2. 初始化最外层的追踪库 (如果还没初始化)
            try {
                await fs.access(join(targetDir, '.git'))
                // 已存在，修正 remote
                try {
                    await execAsync(`git remote set-url origin "${authUrl}"`, { cwd: targetDir })
                } catch {
                    await execAsync(`git remote add origin "${authUrl}"`, { cwd: targetDir })
                }
            } catch {
                await execAsync(`git init`, { cwd: targetDir })
                await execAsync(`git remote add origin "${authUrl}"`, { cwd: targetDir })
            }

            // 3. 全局提交
            await execAsync(`git add .`, { cwd: targetDir })
            
            // 避免 Nothing to commit 报错
            try {
                await execAsync(`git commit -m "Auto sync from Skill Manager - ${new Date().toISOString()}"`, { cwd: targetDir })
            } catch (e: any) {
                // 如果没有变化并且工作树干净，忽略报错
                if (!e.stdout?.includes('nothing to commit')) {
                    throw e
                }
            }

            // 4. 强制推送 (因为是私人备份仓库，强制同步)
            await execAsync(`git push -f -u origin HEAD:main`, { cwd: targetDir })

            // 更新同步时间戳
            config.lastCloudSyncTime = Date.now()
            await configManager.saveConfig(config)

        } finally {
            // 5. 不管成功还是失败，一定要恢复所有的 ._git 到 .git，否则那些绑定的 github 的组件将失去灵魂
            await this.renameGitFolders('.git')
        }
    }

    /**
     * 从您的私有 Github 云端仓库一次性全量拉取，直接冲刷并覆盖本设备上的技能库
     */
    async pullFromCloud(): Promise<void> {
        const config = await configManager.loadConfig()
        if (!config.rootDir) throw new Error('未设置技能根目录。')
        if (!config.syncRepoUrl || !config.githubToken) throw new Error('未配置私有云端仓库地址或 Github Token。请在设置中配置。')

        const token = config.githubToken.trim()
        const repoUrl = config.syncRepoUrl.trim()
        const authUrl = repoUrl.replace('https://', `https://${token}@`)

        try {
            // 1. 隐藏本地子 .git (避免 fetch 报错或者文件占用拉扯冲突)
            await this.renameGitFolders('._git')

            const targetDir = config.rootDir

            // 2. 设置或者新建
            try {
                await fs.access(join(targetDir, '.git'))
                try {
                    await execAsync(`git remote set-url origin "${authUrl}"`, { cwd: targetDir })
                } catch {
                    await execAsync(`git remote add origin "${authUrl}"`, { cwd: targetDir })
                }
            } catch {
                await execAsync(`git init`, { cwd: targetDir })
                await execAsync(`git remote add origin "${authUrl}"`, { cwd: targetDir })
            }

            // 3. fetch 并重置到云端最新
            await execAsync(`git fetch --all`, { cwd: targetDir })
            await execAsync(`git reset --hard origin/main`, { cwd: targetDir })
            await execAsync(`git clean -fd`, { cwd: targetDir }) // 确保删除任何多余的垃圾

            // 更新时间
            config.lastCloudSyncTime = Date.now()
            await configManager.saveConfig(config)

        } finally {
            // 4. 洗礼完毕，唤醒所有的子系统的 git (刚才被云推下来的其实是 ._git 文件夹)
            await this.renameGitFolders('.git')
        }
    }
}

export const cloudSyncService = new CloudSyncService()
