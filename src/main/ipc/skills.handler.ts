import { ipcMain } from 'electron'
import { join } from 'path'
import { fileScanner } from '../services/FileScanner'
import { markdownReader } from '../services/MarkdownReader'
import { configManager } from '../services/ConfigManager'

/** 注册 Skills 相关的 IPC 处理器 */
export function registerSkillsHandlers(): void {
    // 获取所有 Skill 分类列表
    ipcMain.handle('skills:list', async () => {
        const config = await configManager.loadConfig()
        if (!config.rootDir) return []
        return await fileScanner.scanRootDir(config.rootDir)
    })

    // 获取指定分类的文件树
    ipcMain.handle('skills:fileTree', async (_event, skillName: string) => {
        const config = await configManager.loadConfig()
        if (!config.rootDir) return []
        const folderPath = join(config.rootDir, skillName)
        return await fileScanner.getFileTree(folderPath)
    })

    // 获取指定文件内容
    ipcMain.handle(
        'skills:fileContent',
        async (_event, skillName: string, relativePath: string) => {
            try {
                const content = await markdownReader.readFile(skillName, relativePath)
                return { success: true, content }
            } catch (err) {
                return {
                    success: false,
                    content: '',
                    message: err instanceof Error ? err.message : '读取文件失败'
                }
            }
        }
    )

    // 更新标签
    ipcMain.handle(
        'skills:updateTags',
        async (_event, skillName: string, tags: string[]) => {
            try {
                await configManager.updateTags(skillName, tags)
                return { success: true }
            } catch (err) {
                return {
                    success: false,
                    message: err instanceof Error ? err.message : '更新标签失败'
                }
            }
        }
    )

    // 保存文件内容
    ipcMain.handle(
        'skills:saveFileContent',
        async (_event, skillName: string, relativePath: string, content: string) => {
            try {
                await markdownReader.writeFile(skillName, relativePath, content)
                return { success: true }
            } catch (err) {
                return {
                    success: false,
                    message: err instanceof Error ? err.message : '保存文件失败'
                }
            }
        }
    )
}
