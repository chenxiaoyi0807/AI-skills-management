// ===========================
// 共享类型定义
// 前端和后端共同使用的类型
// ===========================

/** Skill 分类卡片 */
export interface SkillCard {
    /** 文件夹名称 */
    name: string
    /** .md 文件数量 */
    fileCount: number
    /** 用户自定义标签 */
    tags: string[]
    /** 文件夹绝对路径 */
    path: string
    /** 绑定的 GitHub 仓库地址（如果有） */
    syncUrl?: string
    /** 最后更新时间（时间戳） */
    updatedAt: number
}

/** 文件树节点 */
export interface FileTreeNode {
    /** 文件/文件夹名称 */
    name: string
    /** 节点类型 */
    type: 'file' | 'directory'
    /** 相对于 Skill 根目录的路径 */
    relativePath: string
    /** 子节点（仅文件夹类型） */
    children?: FileTreeNode[]
}

/** 应用配置 */
export interface AppConfig {
    /** Skills 根目录 */
    rootDir: string
    /** 各卡片的标签数据 { 文件夹名: 标签数组 } */
    tags: Record<string, string[]>
    /** 绑定的 GitHub 同步仓库地址 { 文件夹名: 仓库 URL } */
    syncUrls: Record<string, string>
    /** 上一次自动同步的时间戳 */
    lastAutoSyncTime?: number
    /** GitHub 个人访问令牌 (PAT) */
    githubToken?: string
    /** 云端同步的个人仓库地址 */
    syncRepoUrl?: string
    /** 上一次成功进行全局云端同步的时间戳 */
    lastCloudSyncTime?: number
}

/** 部署请求 */
export interface DeployRequest {
    /** Skill 名称（文件夹名） */
    skillName: string
    /** 勾选的文件相对路径列表 */
    files: string[]
    /** 目标目录绝对路径 */
    targetDir: string
}

/** 冲突项 */
export interface ConflictItem {
    /** 文件名 */
    fileName: string
    /** 源文件绝对路径 */
    sourcePath: string
    /** 目标文件绝对路径 */
    targetPath: string
}

/** 部署结果 */
export interface DeployResult {
    /** 文件名 */
    fileName: string
    /** 状态 */
    status: 'copied' | 'skipped' | 'overwritten' | 'error'
    /** 消息 */
    message?: string
}
