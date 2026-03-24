import { exec } from 'child_process'
import { join } from 'path'
import { promisify } from 'util'
import { promises as fs } from 'fs'
import { configManager } from './ConfigManager'

const execAsync = promisify(exec)

export class GitSyncService {
    /**
     * 执行 Git Clone（或对已存在的本地文件夹进行绑定）
     * @param repoUrl GitHub 仓库地址
     * @param folderName 目标文件夹名
     */
    async cloneSkill(repoUrl: string, folderName: string): Promise<void> {
        const config = await configManager.loadConfig()
        if (!config.rootDir) throw new Error('未设置 Skill 根目录')

        const targetDir = join(config.rootDir, folderName)

        let isExist = false
        try {
            await fs.access(targetDir)
            isExist = true
        } catch (e: any) {
            if (e.code !== 'ENOENT') throw e
        }

        // URL 净化与子目录解析
        let cleanRepoUrl = repoUrl
        let subPath = ''
        try {
            const parsedUrl = new URL(repoUrl)
            if (parsedUrl.hostname === 'github.com') {
                const parts = parsedUrl.pathname.split('/').filter(Boolean)
                if (parts.length >= 2) {
                    let repoName = parts[1]
                    if (repoName.endsWith('.git')) {
                        repoName = repoName.slice(0, -4)
                    }
                    cleanRepoUrl = `https://github.com/${parts[0]}/${repoName}`
                    
                    if (parts.length >= 4 && (parts[2] === 'tree' || parts[2] === 'blob')) {
                        if (parts.length > 4) {
                            let pathParts = parts.slice(4)
                            if (parts[2] === 'blob' && pathParts.length > 0) {
                                pathParts.pop() // 如果是具体文件链接，去掉文件名，只保留所在文件夹作为下载目标
                            }
                            if (pathParts.length > 0) {
                                subPath = pathParts.join('/')
                            }
                        }
                    }
                }
            }
        } catch (e) {
            // invalid url, keep original
        }

        if (!isExist) {
            // 初始化 git 仓库并进行精细克隆
            await fs.mkdir(targetDir, { recursive: true })
            await execAsync(`git init`, { cwd: targetDir })
            await execAsync(`git remote add origin "${cleanRepoUrl}"`, { cwd: targetDir })
            
            try {
                // 对于新克隆，取回最新一次提交记录
                await execAsync(`git fetch --depth 1 origin`, { cwd: targetDir })
                
                if (subPath) {
                    await execAsync(`git config core.sparseCheckout false`, { cwd: targetDir }).catch(() => {})
                    try {
                        await execAsync(`git read-tree -u --reset origin/main:${subPath}`, { cwd: targetDir })
                    } catch {
                        try {
                            await execAsync(`git read-tree -u --reset origin/master:${subPath}`, { cwd: targetDir })
                        } catch {
                            await execAsync(`git pull`, { cwd: targetDir })
                        }
                    }
                } else {
                    // 开启 Sparse-checkout
                    await execAsync(`git config core.sparseCheckout true`, { cwd: targetDir })
                    const infoDir = join(targetDir, '.git', 'info')
                    await fs.mkdir(infoDir, { recursive: true })
                    await fs.writeFile(join(infoDir, 'sparse-checkout'), '/*\n', 'utf-8')

                    try {
                        await execAsync(`git reset --hard origin/main`, { cwd: targetDir })
                    } catch {
                        try {
                            await execAsync(`git reset --hard origin/master`, { cwd: targetDir })
                        } catch {
                            await execAsync(`git pull`, { cwd: targetDir })
                        }
                    }
                }
            } catch (err: any) {
                // 如果 fetch 都失败了，清理一下保证状态复原（因为文件夹是新建的）
                throw new Error('未拉取到远端内容: ' + err.message)
            }
        }

        // 保存映射配置。注意：保存的依然是用户输入的最初 URL，方便以后或许要做特定分支/特定文件夹的精细解析
        config.syncUrls = config.syncUrls || {}
        config.syncUrls[folderName] = repoUrl
        await configManager.saveConfig(config)
        
        // 如果是绑定到现存目录，则直接尝试更新并初始化为 git 仓库
        if (isExist) {
            await this.updateSkill(folderName)
        }
    }

    /**
     * 执行 Git Pull 更新指定 Skill（带强制初始化与覆盖机制，确保总能同步最新仓库内容）
     * @param folderName 指定文件夹名
     */
    async updateSkill(folderName: string): Promise<void> {
        const config = await configManager.loadConfig()
        if (!config.rootDir) throw new Error('未设置 Skill 根目录')

        const targetDir = join(config.rootDir, folderName)

        // 判断该目录是否配置了 syncUrl
        let repoUrl = config.syncUrls?.[folderName]
        if (!repoUrl) {
            throw new Error(`未找到 ${folderName} 的绑定的 GitHub 地址，无法更新`)
        }

        // --- URL 净化与子目录解析 ---
        let subPath = ''
        try {
            const parsedUrl = new URL(repoUrl)
            if (parsedUrl.hostname === 'github.com') {
                const parts = parsedUrl.pathname.split('/').filter(Boolean)
                if (parts.length >= 2) {
                    let repoName = parts[1]
                    if (repoName.endsWith('.git')) {
                        repoName = repoName.slice(0, -4)
                    }
                    repoUrl = `https://github.com/${parts[0]}/${repoName}`
                    
                    if (parts.length >= 4 && (parts[2] === 'tree' || parts[2] === 'blob')) {
                        if (parts.length > 4) {
                            let pathParts = parts.slice(4)
                            if (parts[2] === 'blob' && pathParts.length > 0) {
                                pathParts.pop() // 如果是具体文件链接，去掉文件名，只保留所在文件夹作为下载目标
                            }
                            if (pathParts.length > 0) {
                                subPath = pathParts.join('/')
                            }
                        }
                    }
                }
            }
        } catch (e) {
            // invalid url, keep original
        }

        // 检查是不是合法的 git 仓库
        try {
            await fs.access(join(targetDir, '.git'))
            try {
                await execAsync(`git remote set-url origin "${repoUrl}"`, { cwd: targetDir })
            } catch {
                await execAsync(`git remote add origin "${repoUrl}"`, { cwd: targetDir })
            }
        } catch {
            await execAsync(`git init`, { cwd: targetDir })
            await execAsync(`git remote add origin "${repoUrl}"`, { cwd: targetDir })
        }

        // 获取远端所有代码，确保能够覆盖本地
        await execAsync(`git fetch --all`, { cwd: targetDir })
        
        if (subPath) {
            // 如果属于带有子目录的链接，关闭稀疏检出，并运用 read-tree 进行扁平化更新
            await execAsync(`git config core.sparseCheckout false`, { cwd: targetDir }).catch(() => {})
            // 清理掉可能的旧 sparse-checkout 痕迹
            const infoDir = join(targetDir, '.git', 'info')
            await fs.mkdir(infoDir, { recursive: true })
            await fs.writeFile(join(infoDir, 'sparse-checkout'), '/*\n', 'utf-8')

            try {
                await execAsync(`git read-tree -u --reset origin/main:${subPath}`, { cwd: targetDir })
            } catch {
                try {
                    await execAsync(`git read-tree -u --reset origin/master:${subPath}`, { cwd: targetDir })
                } catch {
                    await execAsync(`git pull`, { cwd: targetDir })
                }
            }
        } else {
            // --- 追加稀疏检出(Sparse-Checkout)智能白名单机制 ---
            await execAsync(`git config core.sparseCheckout true`, { cwd: targetDir })
            const infoDir = join(targetDir, '.git', 'info')
            await fs.mkdir(infoDir, { recursive: true })
            
            let sparseContent = ''
            const items = await fs.readdir(targetDir)
            const validItems = items.filter(item => item !== '.git')
            if (validItems.length > 0) {
                for (const item of validItems) {
                    const stat = await fs.stat(join(targetDir, item))
                    if (stat.isDirectory()) {
                        sparseContent += `/${item}/\n`
                    } else {
                        sparseContent += `/${item}\n`
                    }
                }
            } else {
                sparseContent = '/*\n'
            }
            await fs.writeFile(join(infoDir, 'sparse-checkout'), sparseContent, 'utf-8')
            // ----------------------------------------------------

            // 由于是技能管理，以云端内容为绝对基准。强行将本地重置为远端最新，规避本地修改冲突
            try {
                await execAsync(`git reset --hard origin/main`, { cwd: targetDir })
            } catch {
                try {
                    await execAsync(`git reset --hard origin/master`, { cwd: targetDir })
                } catch {
                    await execAsync(`git pull`, { cwd: targetDir })
                }
            }
        }
    }

    /**
     * 一键全局更新：遍历 syncUrls 中所有绑定的项目
     */
    async updateAllSkills(): Promise<{ success: string[]; failed: { name: string; error: string }[] }> {
        const config = await configManager.loadConfig()
        if (!config.rootDir || !config.syncUrls) return { success: [], failed: [] }

        const success: string[] = []
        const failed: { name: string; error: string }[] = []

        const folders = Object.keys(config.syncUrls)
        
        for (const folder of folders) {
            try {
                await this.updateSkill(folder)
                success.push(folder)
            } catch (error: any) {
                failed.push({ name: folder, error: error.message || String(error) })
            }
        }

        return { success, failed }
    }

    /**
     * 定时自动检测：如果超过 7 天未更新，则触发后台自动更新
     * 返回 true 代表触发了更新且成功，false 没触发，或抛出错误
     */
    async checkAndAutoSync(): Promise<boolean> {
        const config = await configManager.loadConfig()
        const now = Date.now()
        const lastSync = config.lastAutoSyncTime || 0

        // 7天 = 7 * 24 * 60 * 60 * 1000 = 604800000 ms
        if (now - lastSync >= 604800000) {
            // 需要更新
            console.log('触发后台自动更新所有 Git Skills...')
            await this.updateAllSkills()
            
            // 只要不是全失败（或者根本没任何可更项的情况除外），我们就可以更新时间戳
            // 这里我们认为只要触发了更新行为，不管里面有多少个 failed，都重置时间，避免每次重启一直卡顿重试
            config.lastAutoSyncTime = now
            await configManager.saveConfig(config)
            
            return true
        }

        return false
    }
}

export const gitSyncService = new GitSyncService()
