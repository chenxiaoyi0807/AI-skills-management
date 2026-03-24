import { promises as fs, Dirent } from 'fs'
import { join, extname } from 'path'
import type { SkillCard, FileTreeNode } from '../../shared/types'
import { configManager } from './ConfigManager'

/**
 * 文件扫描器
 * 负责扫描 Skills 根目录和构建文件树
 */
export class FileScanner {
    /**
     * 扫描根目录下的一级子文件夹
     * 每个子文件夹映射为一个 SkillCard
     */
    async scanRootDir(rootDir: string): Promise<SkillCard[]> {
        let entries: Dirent[]
        try {
            entries = await fs.readdir(rootDir, { withFileTypes: true })
        } catch {
            return []
        }

        const config = await configManager.loadConfig()
        const cards: SkillCard[] = []

        for (const entry of entries) {
            // 忽略隐藏文件夹和非目录条目
            if (!entry.isDirectory() || entry.name.startsWith('.')) continue

            const folderPath = join(rootDir, entry.name)
            
            // 递归读取目录下最新文件的修改时间作为该技能的更新时间
            const { count: fileCount, latestDate } = await this.countFilesAndLatestUpdate(folderPath)

            let updatedAt = latestDate
            if (updatedAt === 0) {
                try {
                    const stat = await fs.stat(folderPath)
                    updatedAt = Math.max(stat.mtimeMs, stat.birthtimeMs)
                } catch {
                    updatedAt = Date.now()
                }
            }

            cards.push({
                name: entry.name,
                fileCount,
                tags: config.tags[entry.name] || [],
                path: folderPath,
                syncUrl: config.syncUrls?.[entry.name],
                updatedAt
            })
        }

        // 按名称排序
        cards.sort((a, b) => a.name.localeCompare(b.name))
        return cards
    }

    /**
     * 获取指定文件夹的完整文件树
     * 包含所有文件（不限 .md 格式）
     */
    async getFileTree(folderPath: string): Promise<FileTreeNode[]> {
        return this.buildTree(folderPath, '')
    }

    /** 递归构建文件树 */
    private async buildTree(basePath: string, relativePath: string): Promise<FileTreeNode[]> {
        const currentPath = relativePath ? join(basePath, relativePath) : basePath
        let entries: Dirent[]
        try {
            entries = await fs.readdir(currentPath, { withFileTypes: true })
        } catch {
            return []
        }
        const nodes: FileTreeNode[] = []

        for (const entry of entries) {
            // 忽略隐藏文件/文件夹
            if (entry.name.startsWith('.')) continue

            const entryRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name

            if (entry.isDirectory()) {
                const children = await this.buildTree(basePath, entryRelativePath)
                if (children.length > 0) {
                    nodes.push({
                        name: entry.name,
                        type: 'directory',
                        relativePath: entryRelativePath,
                        children
                    })
                }
            } else if (entry.isFile()) {
                // 所有非隐藏文件都加入树
                nodes.push({
                    name: entry.name,
                    type: 'file',
                    relativePath: entryRelativePath
                })
            }
        }

        // 目录在前，文件在后；同类型按名称排序
        nodes.sort((a, b) => {
            if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
            return a.name.localeCompare(b.name)
        })

        return nodes
    }

    /** 递归统计文件夹内的所有非隐藏文件数量，并返回最新文件的修改时间戳 */
    async countFilesAndLatestUpdate(folderPath: string): Promise<{count: number, latestDate: number}> {
        let count = 0
        let latestDate = 0
        
        let entries: Dirent[]
        try {
            entries = await fs.readdir(folderPath, { withFileTypes: true })
        } catch {
            return { count: 0, latestDate: 0 }
        }

        try {
            const stat = await fs.stat(folderPath)
            latestDate = Math.max(latestDate, stat.mtimeMs, stat.birthtimeMs)
        } catch {}

        for (const entry of entries) {
            if (entry.name.startsWith('.')) continue
            const fullPath = join(folderPath, entry.name)
            if (entry.isDirectory()) {
                const result = await this.countFilesAndLatestUpdate(fullPath)
                count += result.count
                latestDate = Math.max(latestDate, result.latestDate)
            } else if (entry.isFile()) {
                count++
                try {
                    const stat = await fs.stat(fullPath)
                    latestDate = Math.max(latestDate, stat.mtimeMs, stat.birthtimeMs)
                } catch {}
            }
        }
        return { count, latestDate }
    }

    /** 判断文件是否为可预览的 Markdown 文件 */
    static isMarkdown(fileName: string): boolean {
        const ext = extname(fileName).toLowerCase()
        return ext === '.md' || ext === '.mdx' || ext === '.markdown'
    }
}

export const fileScanner = new FileScanner()
