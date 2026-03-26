import { create } from 'zustand'
import type { AppConfig, SkillCard, FileTreeNode, ConflictItem, DeployResult } from '../../../shared/types'

// 声明 window.api 类型
declare global {
    interface Window {
        api: {
            getConfig: () => Promise<AppConfig>
            setRootDir: (path: string) => Promise<{ success: boolean; message?: string }>
            updateCloudConfig: (githubToken: string, syncRepoUrl: string) => Promise<{ success: boolean; message?: string }>
            getSkills: () => Promise<SkillCard[]>
            getFileTree: (name: string) => Promise<FileTreeNode[]>
            getFileContent: (name: string, path: string) => Promise<{ success: boolean; content: string; message?: string }>
            updateTags: (name: string, tags: string[]) => Promise<{ success: boolean }>
            saveFileContent: (name: string, path: string, content: string) => Promise<{ success: boolean; message?: string }>
            selectFolder: () => Promise<{ canceled: boolean; path: string }>
            selectRootDir: () => Promise<{ canceled: boolean; path: string }>
            checkConflicts: (req: any) => Promise<{ success: boolean; conflicts: ConflictItem[] }>
            executeDeploy: (req: any, resolutions: Record<string, 'overwrite' | 'skip'>) => Promise<{ success: boolean; results: DeployResult[] }>
            
            // Sync
            importSkill: (repoUrl: string, folderName: string) => Promise<{ success: boolean; message?: string }>
            updateSkill: (folderName: string) => Promise<{ success: boolean; message?: string }>
            updateAllSkills: () => Promise<{ success: boolean; data: { success: string[], failed: {name: string, error: string}[] }; message?: string }>
            checkAutoSync: () => Promise<{ success: boolean; data: boolean; message?: string }>
            
            // Cloud Sync
            cloudSyncPush: () => Promise<{ success: boolean; message?: string }>
            cloudSyncPull: () => Promise<{ success: boolean; message?: string }>
        }
    }
}

// ===========================
// 配置状态
// ===========================
interface ConfigState {
    rootDir: string
    config: AppConfig | null
    isLoading: boolean
    setRootDir: (path: string) => Promise<void>
    updateCloudConfig: (githubToken: string, syncRepoUrl: string) => Promise<void>
    loadConfig: () => Promise<void>
    selectAndSetRootDir: () => Promise<boolean>
}

export const useConfigStore = create<ConfigState>((set) => ({
    rootDir: '',
    config: null,
    isLoading: true,

    loadConfig: async () => {
        set({ isLoading: true })
        const config = await window.api.getConfig()
        set({ rootDir: config.rootDir || '', config, isLoading: false })
    },

    setRootDir: async (path: string) => {
        await window.api.setRootDir(path)
        set({ rootDir: path })
    },

    updateCloudConfig: async (githubToken: string, syncRepoUrl: string) => {
        await window.api.updateCloudConfig(githubToken, syncRepoUrl)
        const config = await window.api.getConfig()
        set({ config })
    },

    selectAndSetRootDir: async () => {
        const result = await window.api.selectRootDir()
        if (!result.canceled && result.path) {
            await window.api.setRootDir(result.path)
            set({ rootDir: result.path })
            return true
        }
        return false
    }
}))

// ===========================
// Skills 状态
// ===========================
interface SkillsState {
    cards: SkillCard[]
    searchQuery: string
    isLoading: boolean
    // 详情弹窗
    activeCard: SkillCard | null
    fileTree: FileTreeNode[]
    checkedFiles: Set<string>
    previewFile: string
    previewContent: string
    isModalOpen: boolean
    // 操作
    loadSkills: () => Promise<void>
    setSearchQuery: (query: string) => void
    openDetail: (card: SkillCard) => Promise<void>
    closeDetail: () => void
    toggleFileCheck: (path: string, checked: boolean) => void
    toggleAllFiles: (checked: boolean) => void
    selectPreviewFile: (skillName: string, relativePath: string) => Promise<void>
    updateCardTags: (skillName: string, tags: string[]) => Promise<void>
    saveFileContent: (skillName: string, relativePath: string, content: string) => Promise<{ success: boolean; message?: string }>
    getFilteredCards: () => SkillCard[]
}

/** 递归收集所有文件路径 */
function collectAllFiles(nodes: FileTreeNode[]): string[] {
    const files: string[] = []
    for (const node of nodes) {
        if (node.type === 'file') {
            files.push(node.relativePath)
        } else if (node.children) {
            files.push(...collectAllFiles(node.children))
        }
    }
    return files
}

export const useSkillsStore = create<SkillsState>((set, get) => ({
    cards: [],
    searchQuery: '',
    isLoading: false,
    activeCard: null,
    fileTree: [],
    checkedFiles: new Set(),
    previewFile: '',
    previewContent: '',
    isModalOpen: false,

    loadSkills: async () => {
        set({ isLoading: true })
        const cards = await window.api.getSkills()
        set({ cards, isLoading: false })
    },

    setSearchQuery: (query: string) => {
        set({ searchQuery: query })
    },

    getFilteredCards: () => {
        const { cards, searchQuery } = get()
        if (!searchQuery.trim()) return cards

        const q = searchQuery.toLowerCase()
        return cards.filter(
            (card) =>
                card.name.toLowerCase().includes(q) ||
                card.tags.some((tag) => tag.toLowerCase().includes(q))
        )
    },

    openDetail: async (card: SkillCard) => {
        set({
            activeCard: card,
            isModalOpen: true,
            previewFile: '',
            previewContent: '',
            checkedFiles: new Set()
        })
        const tree = await window.api.getFileTree(card.name)
        set({ fileTree: tree })

        // 自动预览：优先第一个 .md/.mdx，其次取第一个文件
        const findFirstFile = (nodes: FileTreeNode[]): FileTreeNode | null => {
            for (const node of nodes) {
                if (node.type === 'file') return node
                if (node.children) {
                    const found = findFirstFile(node.children)
                    if (found) return found
                }
            }
            return null
        }
        const findFirstMd = (nodes: FileTreeNode[]): FileTreeNode | null => {
            for (const node of nodes) {
                if (node.type === 'file') {
                    const ext = node.name.split('.').pop()?.toLowerCase()
                    if (ext === 'md' || ext === 'mdx' || ext === 'markdown') return node
                }
                if (node.children) {
                    const found = findFirstMd(node.children)
                    if (found) return found
                }
            }
            return null
        }

        const firstFile = findFirstMd(tree) ?? findFirstFile(tree)
        if (firstFile) {
            get().selectPreviewFile(card.name, firstFile.relativePath)
        }
    },

    closeDetail: () => {
        set({
            isModalOpen: false,
            activeCard: null,
            fileTree: [],
            checkedFiles: new Set(),
            previewFile: '',
            previewContent: ''
        })
        // 关闭弹窗后刷新首页卡片数据（文件数量等可能已变化）
        get().loadSkills()
    },

    toggleFileCheck: (path: string, checked: boolean) => {
        const { checkedFiles, fileTree } = get()
        const newChecked = new Set(checkedFiles)

        // 查找是否是目录节点
        const findNode = (nodes: FileTreeNode[]): FileTreeNode | null => {
            for (const n of nodes) {
                if (n.relativePath === path) return n
                if (n.children) {
                    const found = findNode(n.children)
                    if (found) return found
                }
            }
            return null
        }

        const node = findNode(fileTree)
        if (node && node.type === 'directory' && node.children) {
            // 目录：递归勾选/取消所有子文件
            const childFiles = collectAllFiles(node.children)
            childFiles.forEach((f) => (checked ? newChecked.add(f) : newChecked.delete(f)))
        } else {
            // 文件
            checked ? newChecked.add(path) : newChecked.delete(path)
        }

        set({ checkedFiles: newChecked })
    },

    toggleAllFiles: (checked: boolean) => {
        const { fileTree } = get()
        if (checked) {
            const allFiles = collectAllFiles(fileTree)
            set({ checkedFiles: new Set(allFiles) })
        } else {
            set({ checkedFiles: new Set() })
        }
    },

    selectPreviewFile: async (skillName: string, relativePath: string) => {
        set({ previewFile: relativePath, previewContent: '加载中...' })
        const result = await window.api.getFileContent(skillName, relativePath)
        if (result.success) {
            set({ previewContent: result.content })
        } else {
            set({ previewContent: `⚠️ 无法加载文件: ${result.message || '未知错误'}` })
        }
    },

    updateCardTags: async (skillName: string, tags: string[]) => {
        await window.api.updateTags(skillName, tags)
        // 更新本地状态
        const { cards } = get()
        set({
            cards: cards.map((c) =>
                c.name === skillName ? { ...c, tags } : c
            )
        })
    },

    saveFileContent: async (skillName: string, relativePath: string, content: string) => {
        const result = await window.api.saveFileContent(skillName, relativePath, content)
        if (result.success) {
            // 保存成功后更新预览内容
            set({ previewContent: content })
        }
        return result
    }
}))

// ===========================
// 部署状态
// ===========================
interface DeployState {
    isDeploying: boolean
    conflicts: ConflictItem[]
    results: DeployResult[]
    showConflictDialog: boolean
    showResultDialog: boolean
    pendingRequest: any | null
    startDeploy: (skillName: string, files: string[]) => Promise<void>
    deployFullSkill: (skillName: string) => Promise<void>
    deployMultipleSkills: (skillNames: string[]) => Promise<void>
    resolveConflicts: (resolutions: Record<string, 'overwrite' | 'skip'>) => Promise<void>
    closeConflictDialog: () => void
    closeResultDialog: () => void
}

export const useDeployStore = create<DeployState>((set, get) => ({
    isDeploying: false,
    conflicts: [],
    results: [],
    showConflictDialog: false,
    showResultDialog: false,
    pendingRequest: null,

    deployFullSkill: async (skillName: string) => {
        const nodes = await window.api.getFileTree(skillName)
        const collectAllFiles = (treeNodes: any[]): string[] => {
            const files: string[] = []
            treeNodes.forEach((n) => {
                if (n.type === 'file') files.push(n.relativePath)
                else if (n.type === 'directory' && n.children) files.push(...collectAllFiles(n.children))
            })
            return files
        }
        const files = collectAllFiles(nodes)
        if (files.length === 0) return
        await get().startDeploy(skillName, files)
    },

    deployMultipleSkills: async (skillNames: string[]) => {
        if (skillNames.length === 0) return
        const skillsData: { skillName: string; files: string[] }[] = []
        
        const collectAllFiles = (treeNodes: any[]): string[] => {
            const files: string[] = []
            treeNodes.forEach((n) => {
                if (n.type === 'file') files.push(n.relativePath)
                else if (n.type === 'directory' && n.children) files.push(...collectAllFiles(n.children))
            })
            return files
        }

        for (const name of skillNames) {
            const nodes = await window.api.getFileTree(name)
            const files = collectAllFiles(nodes)
            if (files.length > 0) {
                skillsData.push({ skillName: name, files })
            }
        }
        if (skillsData.length === 0) return

        const folderResult = await window.api.selectFolder()
        if (folderResult.canceled) return

        const req = {
            skillName: skillsData[0].skillName, // 作为一个兼容字段传给后端，主要以 skills 字段为准
            files: skillsData[0].files,
            skills: skillsData,
            targetDir: folderResult.path
        }

        set({ isDeploying: true })
        const checkResult = await window.api.checkConflicts(req)

        if (checkResult.conflicts && checkResult.conflicts.length > 0) {
            set({
                conflicts: checkResult.conflicts,
                showConflictDialog: true,
                pendingRequest: req,
                isDeploying: false
            })
        } else {
            const deployResult = await window.api.executeDeploy(req, {})
            set({
                results: deployResult.results || [],
                showResultDialog: true,
                isDeploying: false
            })
        }
    },

    startDeploy: async (skillName: string, files: string[]) => {
        // 1. 选择目标目录
        const folderResult = await window.api.selectFolder()
        if (folderResult.canceled) return

        const req = { skillName, files, targetDir: folderResult.path }

        // 2. 冲突预检
        set({ isDeploying: true })
        const checkResult = await window.api.checkConflicts(req)

        if (checkResult.conflicts && checkResult.conflicts.length > 0) {
            // 有冲突，显示冲突对话框
            set({
                conflicts: checkResult.conflicts,
                showConflictDialog: true,
                pendingRequest: req,
                isDeploying: false
            })
        } else {
            // 无冲突，直接部署
            const deployResult = await window.api.executeDeploy(req, {})
            set({
                results: deployResult.results || [],
                showResultDialog: true,
                isDeploying: false
            })
        }
    },

    resolveConflicts: async (resolutions: Record<string, 'overwrite' | 'skip'>) => {
        const { pendingRequest } = get()
        if (!pendingRequest) return

        set({ isDeploying: true, showConflictDialog: false })
        const deployResult = await window.api.executeDeploy(pendingRequest, resolutions)
        set({
            results: deployResult.results || [],
            showResultDialog: true,
            isDeploying: false,
            pendingRequest: null
        })
    },

    closeConflictDialog: () => {
        set({ showConflictDialog: false, conflicts: [], pendingRequest: null })
    },

    closeResultDialog: () => {
        set({ showResultDialog: false, results: [] })
    }
}))
