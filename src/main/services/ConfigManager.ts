import { promises as fs } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import type { AppConfig } from '../../shared/types'

// 默认配置
const DEFAULT_CONFIG: AppConfig = {
    rootDir: '',
    tags: {},
    syncUrls: {},
    githubToken: '',
    syncRepoUrl: ''
}

/**
 * 配置管理器
 * 负责 data.json 的读写操作，采用原子写入防止数据损坏
 */
export class ConfigManager {
    private configPath: string
    private config: AppConfig | null = null

    constructor() {
        // 配置文件保存在应用数据目录下
        const userDataPath = app.getPath('userData')
        this.configPath = join(userDataPath, 'data.json')
    }

    /** 加载配置（带缓存） */
    async loadConfig(): Promise<AppConfig> {
        if (this.config) return this.config

        try {
            const raw = await fs.readFile(this.configPath, 'utf-8')
            this.config = { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
        } catch {
            // 文件不存在或解析失败，使用默认配置
            this.config = { ...DEFAULT_CONFIG }
        }

        return this.config!
    }

    /** 保存配置（原子写入） */
    async saveConfig(config: AppConfig): Promise<void> {
        this.config = config
        const tmpPath = this.configPath + '.tmp'

        // 先写入临时文件
        await fs.writeFile(tmpPath, JSON.stringify(config, null, 2), 'utf-8')
        // 再重命名为正式文件（原子操作）
        await fs.rename(tmpPath, this.configPath)
    }

    /** 设置根目录 */
    async setRootDir(dirPath: string): Promise<void> {
        const config = await this.loadConfig()
        config.rootDir = dirPath
        await this.saveConfig(config)
    }

    /** 更新云端同步配置 */
    async updateCloudConfig(githubToken: string, syncRepoUrl: string): Promise<void> {
        const config = await this.loadConfig()
        config.githubToken = githubToken
        config.syncRepoUrl = syncRepoUrl
        await this.saveConfig(config)
    }

    /** 更新指定文件夹的标签 */
    async updateTags(folderName: string, tags: string[]): Promise<void> {
        const config = await this.loadConfig()
        config.tags[folderName] = tags
        await this.saveConfig(config)
    }

    /** 获取指定文件夹的标签 */
    async getTags(folderName: string): Promise<string[]> {
        const config = await this.loadConfig()
        return config.tags[folderName] || []
    }

    /** 解除指定文件夹与 GitHub 仓库的同步绑定 */
    async unbindSyncUrl(folderName: string): Promise<void> {
        const config = await this.loadConfig()
        if (config.syncUrls && config.syncUrls[folderName]) {
            delete config.syncUrls[folderName]
            await this.saveConfig(config)
        }
    }
}

// 单例导出
export const configManager = new ConfigManager()
