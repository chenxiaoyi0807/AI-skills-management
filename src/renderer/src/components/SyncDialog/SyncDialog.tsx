import { useState } from 'react'
import { X, Github, Loader2 } from 'lucide-react'
import styles from './SyncDialog.module.css'

interface Props {
    onClose: () => void
    onImport: (repoUrl: string, folderName: string) => Promise<void>
}

export default function SyncDialog({ onClose, onImport }: Props) {
    const [repoUrl, setRepoUrl] = useState('')
    const [folderName, setFolderName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        
        if (!repoUrl) {
            setError('请输入 GitHub 仓库地址')
            return
        }
        
        let finalFolderName = folderName.trim()
        if (!finalFolderName) {
            // 尝试从 URL 提取文件夹名
            // e.g. https://github.com/user/repo.git -> repo
            const parts = repoUrl.split('/')
            let lastPart = parts[parts.length - 1]
            if (lastPart) {
                if (lastPart.endsWith('.git')) {
                    lastPart = lastPart.slice(0, -4)
                }
                finalFolderName = lastPart
            } else {
                setError('无法自动识别仓库名，请手动输入文件夹名称')
                return
            }
        }

        setLoading(true)
        try {
            await onImport(repoUrl, finalFolderName)
            onClose() // 成功就关闭
        } catch (err: any) {
            setError(err.message || String(err))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.dialog} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.title}>
                        <Github size={20} />
                        导入 GitHub Skill
                    </div>
                    <button className={styles.closeBtn} onClick={onClose} disabled={loading}>
                        <X size={20} />
                    </button>
                </div>

                <form className={styles.content} onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label>GitHub 仓库地址 (Public)</label>
                        <input
                            type="text"
                            placeholder="例如：https://github.com/username/skill-repo.git"
                            value={repoUrl}
                            onChange={(e) => setRepoUrl(e.target.value)}
                            disabled={loading}
                            className={styles.input}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label>本地文件夹名称 (选填)</label>
                        <input
                            type="text"
                            placeholder="留空则自动使用仓库名"
                            value={folderName}
                            onChange={(e) => setFolderName(e.target.value)}
                            disabled={loading}
                            className={styles.input}
                        />
                    </div>

                    {error && <div className={styles.errorMessage}>{error}</div>}

                    <div className={styles.actions}>
                        <button 
                            type="button" 
                            className={styles.cancelBtn} 
                            onClick={onClose}
                            disabled={loading}
                        >
                            取消
                        </button>
                        <button 
                            type="submit" 
                            className={styles.confirmBtn}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={16} className={styles.spinner} />
                                    导入中...
                                </>
                            ) : (
                                '确认导入'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
