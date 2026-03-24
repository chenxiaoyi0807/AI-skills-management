import { useEffect, useMemo, useCallback, useState } from 'react'
import { Settings, Search, CheckCircle, Sun, Moon, Github, RefreshCw, UploadCloud, DownloadCloud } from 'lucide-react'
import appIcon from '../../assets/icon.png'
import SearchBar from '../../components/SearchBar/SearchBar'
import SkillCard from '../../components/SkillCard/SkillCard'
import DetailModal from '../../components/DetailModal/DetailModal'
import ConflictDialog from '../../components/ConflictDialog/ConflictDialog'
import Particles from '../../components/Particles/Particles'
import SyncDialog from '../../components/SyncDialog/SyncDialog'
import styles from './Dashboard.module.css'
import { useSkillsStore, useDeployStore, useConfigStore } from '../../stores'

interface Props {
    onOpenSettings: () => void
    theme: 'dark' | 'light'
    onToggleTheme: () => void
}

export default function Dashboard({ onOpenSettings, theme, onToggleTheme }: Props) {
    const {
        cards,
        searchQuery,
        isLoading,
        loadSkills,
        setSearchQuery,
        openDetail,
        updateCardTags,
        getFilteredCards
    } = useSkillsStore()

    const {
        conflicts,
        showConflictDialog,
        showResultDialog,
        results,
        deployFullSkill,
        resolveConflicts,
        closeConflictDialog,
        closeResultDialog
    } = useDeployStore()

    const { rootDir } = useConfigStore()
    
    // 同步控制状态
    const [showSyncDialog, setShowSyncDialog] = useState(false)
    const [isSyncingAll, setIsSyncingAll] = useState(false)
    
    // 云端同步状态
    const [isPushing, setIsPushing] = useState(false)
    const [isPulling, setIsPulling] = useState(false)

    const [activeTab, setActiveTab] = useState('全部')

    const FIXED_TABS = ['全部', '产品', '设计', '前端', '后端', '其他']
    const MAIN_CATEGORIES = ['产品', '设计', '前端', '后端']

    // 加载 Skills 列表并监听窗口焦点变化
    useEffect(() => {
        if (!rootDir) return

        // 初始加载
        loadSkills()

        // 当窗口重新获得焦点时，自动刷新数据
        const handleFocus = () => loadSkills()
        window.addEventListener('focus', handleFocus)

        // 检测后台七天自动更新
        const checkAuto = async () => {
            try {
                const res = await window.api.checkAutoSync()
                if (res.success && res.data) {
                    console.log('后台静默更新了 Skills')
                    loadSkills()
                }
            } catch (e) {
                console.error(e)
            }
        }
        checkAuto()

        return () => window.removeEventListener('focus', handleFocus)
    }, [rootDir, loadSkills])

    const filteredCards = useMemo(() => {
        let result = getFilteredCards()
        if (activeTab === '其他') {
            result = result.filter(card => {
                const hasMainCategory = card.tags?.some(tag => MAIN_CATEGORIES.includes(tag))
                return !hasMainCategory
            })
        } else if (activeTab !== '全部') {
            result = result.filter(card => card.tags?.includes(activeTab))
        }
        return result
    }, [cards, searchQuery, getFilteredCards, activeTab])

    /** 导入特定的新 Skill */
    const handleImportSkill = async (repoUrl: string, folderName: string) => {
        const res = await window.api.importSkill(repoUrl, folderName)
        if (!res.success) {
            throw new Error(res.message)
        }
        loadSkills() // 导入成功后刷新
    }

    /** 强制更新所有 Skills */
    const handleSyncAll = async () => {
        setIsSyncingAll(true)
        try {
            const res = await window.api.updateAllSkills()
            if (res.success) {
                // { success: string[], failed: {name, error}[] }
                const { success, failed } = res.data
                let msg = `同步完成！更新成功 ${success.length} 个。`
                if (failed.length > 0) {
                    msg += `\n失败 ${failed.length} 个（可能没绑定或网络问题）：\n` + 
                           failed.map((f: {name: string, error: string}) => `- ${f.name} (${f.error})`).join('\n')
                }
                alert(msg)
            } else {
                alert(`同步失败：${res.message}`)
            }
        } finally {
            setIsSyncingAll(false)
            loadSkills()
        }
    }

    /** 推送到云端 */
    const handlePushCloud = async () => {
        setIsPushing(true)
        try {
            const res = await window.api.cloudSyncPush()
            if (res.success) {
                alert('成功将整个技能库备份至云端！')
            } else {
                alert(`推送失败：${res.message}\n请检查 Settings 中是否配置了正确的 Token 并且您的网络连通正常。`)
            }
        } catch (e: any) {
            alert(`推送异常崩溃：${e?.message || e}`)
        } finally {
            setIsPushing(false)
        }
    }

    /** 从云端拉取 */
    const handlePullCloud = async () => {
        if (!window.confirm('警告：此操作将使用云端最新的记录强行覆盖您当前本地的整个技能库！所有的本地未保存变动可能会丢失。确定继续吗？')) return
        
        setIsPulling(true)
        try {
            const res = await window.api.cloudSyncPull()
            if (res.success) {
                alert('已成功从云端恢复技能库！')
                loadSkills() // 拉取完重新加载
            } else {
                alert(`拉取失败：${res.message}`)
            }
        } catch (e: any) {
            alert(`拉取异常崩溃：${e?.message || e}`)
        } finally {
            setIsPulling(false)
        }
    }

    /** 覆盖全部冲突文件 */
    const handleOverwriteAll = useCallback(() => {
        const resolutions: Record<string, 'overwrite' | 'skip'> = {}
        conflicts.forEach((c) => { resolutions[c.fileName] = 'overwrite' })
        resolveConflicts(resolutions)
    }, [conflicts, resolveConflicts])

    /** 跳过全部冲突文件 */
    const handleSkipAll = useCallback(() => {
        const resolutions: Record<string, 'overwrite' | 'skip'> = {}
        conflicts.forEach((c) => { resolutions[c.fileName] = 'skip' })
        resolveConflicts(resolutions)
    }, [conflicts, resolveConflicts])

    return (
        <div className={styles.container}>
            {theme === 'dark' && (
                <Particles
                    particleColors={["#CCFF00"]}
                    particleCount={200}
                    particleSpread={10}
                    speed={0.1}
                    particleBaseSize={100}
                    moveParticlesOnHover={true}
                    alphaParticles={false}
                    disableRotation={false}
                    pixelRatio={1}
                />
            )}
            {/* 顶栏 */}
            <div className={styles.topBar}>
                <div className={styles.logo}>
                    <img src={appIcon} alt="logo" className={styles.logoImg} />
                    <span>AI skills 管理</span>
                </div>
                <div className={styles.topBarRight}>
                    <button className={styles.settingsBtn} onClick={onToggleTheme} title={theme === 'dark' ? '切换亮色模式' : '切换暗色模式'}>
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    <button className={styles.settingsBtn} onClick={onOpenSettings} title="设置">
                        <Settings size={20} />
                    </button>
                </div>
            </div>

            {/* 主内容区 */}
            <div className={styles.content}>
                {/* 搜索栏 */}
                <div className={styles.searchRow}>
                    <SearchBar value={searchQuery} onChange={setSearchQuery} />
                    <div className={styles.syncActions}>
                        <button 
                            className={styles.syncBtn} 
                            onClick={handlePushCloud}
                            disabled={isPushing || isPulling}
                            title="将所有本地修改和添加上传到云端 GitHub"
                        >
                            <UploadCloud size={18} className={isPushing ? styles.spinning : ''} />
                            推送到云端
                        </button>
                        <button 
                            className={styles.syncBtn} 
                            onClick={handlePullCloud}
                            disabled={isPushing || isPulling}
                            title="直接使用云端的仓库数据覆盖目前的电脑记录"
                            style={{ background: 'var(--bg-hover)' }}
                        >
                            <DownloadCloud size={18} className={isPulling ? styles.spinning : ''} />
                            从云端恢复
                        </button>
                        <div style={{ width: 1, height: 20, background: 'var(--border-default)', margin: '0 8px' }}></div>
                        <button 
                            className={styles.syncBtn} 
                            onClick={handleSyncAll}
                            disabled={isSyncingAll}
                            title="从各来源拉取最新的技能包源文件更新"
                        >
                            <RefreshCw size={18} className={isSyncingAll ? styles.spinning : ''} />
                            一键更新
                        </button>
                        <button 
                            className={styles.importBtn} 
                            onClick={() => setShowSyncDialog(true)}
                        >
                            <Github size={18} />
                            按链接导入
                        </button>
                    </div>
                </div>

                {/* 统计 */}
                <div className={styles.statsRow}>
                    已发现 {cards.length} 个 Skill 分类
                    {searchQuery && ` · 筛选出 ${filteredCards.length} 个结果`}
                </div>

                {/* 分类 Tabs */}
                <div className={styles.tabsRow}>
                    {FIXED_TABS.map(tab => (
                        <button
                            key={tab}
                            className={`${styles.tabBtn} ${activeTab === tab ? styles.tabBtnActive : ''}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* 卡片网格 */}
                {isLoading ? (
                    <div className={styles.empty}>
                        <span>扫描中...</span>
                    </div>
                ) : filteredCards.length > 0 ? (
                    <div className={styles.grid}>
                        {filteredCards.map((card) => (
                            <SkillCard
                                key={card.name}
                                card={card}
                                onClick={() => openDetail(card)}
                                onDeploy={() => deployFullSkill(card.name)}
                                onTagsChange={(tags) => updateCardTags(card.name, tags)}
                            />
                        ))}
                    </div>
                ) : searchQuery ? (
                    <div className={styles.empty}>
                        <Search size={48} className={styles.emptyIcon} />
                        <span>没有找到匹配的 Skill</span>
                    </div>
                ) : (
                    <div className={styles.empty}>
                        <span>当前根目录下没有找到任何 Skill 文件夹</span>
                    </div>
                )}
            </div>

            {/* 详情弹窗 */}
            <DetailModal />

            {/* 冲突对话框 */}
            {showConflictDialog && (
                <ConflictDialog
                    conflicts={conflicts}
                    onOverwriteAll={handleOverwriteAll}
                    onSkipAll={handleSkipAll}
                    onCancel={closeConflictDialog}
                />
            )}

            {/* 部署结果弹窗 */}
            {showResultDialog && (
                <div className={styles.resultOverlay} onClick={closeResultDialog}>
                    <div className={styles.resultDialog} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.resultTitle}>
                            <CheckCircle size={22} style={{ color: 'var(--color-success)' }} />
                            部署完成
                        </div>
                        <ul className={styles.resultList}>
                            {results.map((r) => (
                                <li key={r.fileName} className={styles.resultItem}>
                                    <span className={styles[`status${r.status.charAt(0).toUpperCase() + r.status.slice(1)}` as keyof typeof styles] || ''}>
                                        {r.status === 'copied' && '✅'}
                                        {r.status === 'overwritten' && '🔄'}
                                        {r.status === 'skipped' && '⏭️'}
                                        {r.status === 'error' && '❌'}
                                    </span>
                                    <span>{r.fileName}</span>
                                    {r.message && <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>({r.message})</span>}
                                </li>
                            ))}
                        </ul>
                        <button className={styles.resultCloseBtn} onClick={closeResultDialog}>
                            确定
                        </button>
                    </div>
                </div>
            )}

            {/* GitHub 导入弹窗 */}
            {showSyncDialog && (
                <SyncDialog 
                    onClose={() => setShowSyncDialog(false)}
                    onImport={handleImportSkill}
                />
            )}
        </div>
    )
}

