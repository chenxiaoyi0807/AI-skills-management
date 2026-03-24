import { promises as fs } from 'fs'
import { join } from 'path'
import { configManager } from './ConfigManager'

/**
 * Markdown 文件读取器
 * 负责读取指定 .md 文件的原始内容
 */
export class MarkdownReader {
    /**
     * 读取指定 Skill 下的文件内容
     * @param skillName Skill 文件夹名
     * @param relativePath 文件相对路径
     */
    async readFile(skillName: string, relativePath: string): Promise<string> {
        const config = await configManager.loadConfig()
        const filePath = join(config.rootDir, skillName, relativePath)

        // 安全校验：确保路径在根目录范围内
        const normalizedRoot = join(config.rootDir, skillName)
        if (!filePath.startsWith(normalizedRoot)) {
            throw new Error('非法路径访问')
        }

        const content = await fs.readFile(filePath, 'utf-8')
        return content
    }

    /**
     * 将内容写入指定 Skill 下的文件
     * @param skillName Skill 文件夹名
     * @param relativePath 文件相对路径
     * @param content 要写入的文件内容
     */
    async writeFile(skillName: string, relativePath: string, content: string): Promise<void> {
        const config = await configManager.loadConfig()
        const filePath = join(config.rootDir, skillName, relativePath)

        // 安全校验：确保路径在根目录范围内
        const normalizedRoot = join(config.rootDir, skillName)
        if (!filePath.startsWith(normalizedRoot)) {
            throw new Error('非法路径访问')
        }

        await fs.writeFile(filePath, content, 'utf-8')
    }
}

export const markdownReader = new MarkdownReader()
