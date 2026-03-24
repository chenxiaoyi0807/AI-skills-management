import { ArrowLeft, FolderOpen, Sun, Moon } from 'lucide-react'
import styles from './Settings.module.css'
import { useConfigStore, useSkillsStore } from '../../stores'
import { useState, useEffect } from 'react'

interface Props {
    onBack: () => void
    theme: 'dark' | 'light'
    onToggleTheme: () => void
}

export default function Settings({ onBack, theme, onToggleTheme }: Props) {
    const { rootDir, config, selectAndSetRootDir, updateCloudConfig } = useConfigStore()
    const { loadSkills } = useSkillsStore()
    
    const [token, setToken] = useState('')
    const [repoUrl, setRepoUrl] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [saveMsg, setSaveMsg] = useState('')

    useEffect(() => {
        if (config) {
            setToken(config.githubToken || '')
            setRepoUrl(config.syncRepoUrl || '')
        }
    }, [config])

    const handleChangeDir = async () => {
        const success = await selectAndSetRootDir()
        if (success) {
            loadSkills()
        }
    }

    const handleSaveCloudConfig = async () => {
        setIsSaving(true)
        setSaveMsg('')
        try {
            await updateCloudConfig(token, repoUrl)
            setSaveMsg('保存成功！')
            setTimeout(() => setSaveMsg(''), 3000)
        } catch (e: any) {
            setSaveMsg('保存失败: ' + e.message)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className={styles.container}>
            {/* 顶栏 */}
            <div className={styles.topBar}>
                <button className={styles.backBtn} onClick={onBack} title="返回">
                    <ArrowLeft size={18} />
                </button>
                <span className={styles.title}>设置</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                    <button className={styles.backBtn} onClick={onToggleTheme} title={theme === 'dark' ? '切换亮色模式' : '切换暗色模式'}>
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                </div>
            </div>

            {/* 设置内容 */}
            <div className={styles.content}>
                <div className={styles.section}>
                    <div className={styles.label}>Skills 根目录</div>
                    <div className={styles.pathRow}>
                        <div className={styles.pathValue}>{rootDir || '未设置'}</div>
                        <button className={styles.changeBtn} onClick={handleChangeDir}>
                            <FolderOpen size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                            更改
                        </button>
                    </div>
                    <div className={styles.info}>
                        系统将扫描此目录下的一级子文件夹，每个子文件夹作为一个 Skill 分类。
                    </div>
                </div>

                <div className={styles.section}>
                    <div className={styles.label}>云端多设备同步配置 (GitHub)</div>
                    <div className={styles.info} style={{ marginBottom: 12 }}>
                        配置您私人的 GitHub 仓库与 Token，即可一键将整个本地技能库推送至云端，实现跨设备任意穿梭。
                    </div>
                    <div className={styles.inputGroup}>
                        <label>GitHub 个人访问令牌 (PAT)</label>
                        <input 
                            type="password" 
                            className={styles.inputField} 
                            placeholder="ghp_xxx..."
                            value={token}
                            onChange={e => setToken(e.target.value)}
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label>私有同步仓库地址 (.git 结尾)</label>
                        <input 
                            type="text" 
                            className={styles.inputField} 
                            placeholder="https://github.com/Username/my-skills.git"
                            value={repoUrl}
                            onChange={e => setRepoUrl(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
                        <button className={styles.changeBtn} onClick={handleSaveCloudConfig} disabled={isSaving}>
                            {isSaving ? '保存中...' : '保存配置'}
                        </button>
                        {saveMsg && <span style={{ fontSize: 13, color: saveMsg.includes('失败') ? 'var(--text-error, red)' : 'var(--text-success, green)' }}>{saveMsg}</span>}
                    </div>
                </div>
            </div>
        </div>
    )
}
