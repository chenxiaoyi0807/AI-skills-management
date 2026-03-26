import { contextBridge, ipcRenderer } from 'electron'
import type { DeployRequest } from '../shared/types'

// 通过 contextBridge 暴露白名单 API 给渲染进程
const api = {
    // ---- 配置管理 ----
    /** 获取当前配置 */
    getConfig: () => ipcRenderer.invoke('config:get'),
    /** 设置根目录 */
    setRootDir: (dirPath: string) => ipcRenderer.invoke('config:setRootDir', dirPath),
    /** 更新云端同步配置 */
    updateCloudConfig: (githubToken: string, syncRepoUrl: string) => 
        ipcRenderer.invoke('config:updateCloud', githubToken, syncRepoUrl),

    // ---- Skills 管理 ----
    /** 获取所有 Skill 分类列表 */
    getSkills: () => ipcRenderer.invoke('skills:list'),
    /** 获取指定分类的文件树 */
    getFileTree: (skillName: string) => ipcRenderer.invoke('skills:fileTree', skillName),
    /** 获取指定文件内容 */
    getFileContent: (skillName: string, relativePath: string) =>
        ipcRenderer.invoke('skills:fileContent', skillName, relativePath),
    /** 更新标签 */
    updateTags: (skillName: string, tags: string[]) =>
        ipcRenderer.invoke('skills:updateTags', skillName, tags),
    /** 保存文件内容 */
    saveFileContent: (skillName: string, relativePath: string, content: string) =>
        ipcRenderer.invoke('skills:saveFileContent', skillName, relativePath, content),

    // ---- 部署 ----
    /** 选择目标文件夹 */
    selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
    /** 选择根目录文件夹 */
    selectRootDir: () => ipcRenderer.invoke('dialog:selectRootDir'),
    /** 冲突预检 */
    checkConflicts: (req: DeployRequest) => ipcRenderer.invoke('deploy:check', req),
    /** 执行部署 */
    executeDeploy: (
        req: DeployRequest,
        resolutions: Record<string, 'overwrite' | 'skip'>
    ) => ipcRenderer.invoke('deploy:execute', req, resolutions),

    // ---- Git 同步管理 ----
    /** 导入新 Skill */
    importSkill: (repoUrl: string, folderName: string) => ipcRenderer.invoke('sync:clone-skill', repoUrl, folderName),
    /** 解除绑定 */
    unbindSkill: (folderName: string) => ipcRenderer.invoke('sync:unbind-skill', folderName),
    /** 更新特定 Skill */
    updateSkill: (folderName: string) => ipcRenderer.invoke('sync:update-skill', folderName),
    /** 更新所有绑定的 Skills */
    updateAllSkills: () => ipcRenderer.invoke('sync:update-all-skills'),
    /** 检查自动更新并执行 */
    checkAutoSync: () => ipcRenderer.invoke('sync:check-auto'),

    // ---- 云端同步 ----
    /** 推送到云端 */
    cloudSyncPush: () => ipcRenderer.invoke('cloudSync:push'),
    /** 从云端拉取 */
    cloudSyncPull: () => ipcRenderer.invoke('cloudSync:pull')
}

contextBridge.exposeInMainWorld('api', api)

// 导出类型供渲染进程使用
export type ElectronAPI = typeof api
