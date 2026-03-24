import { useEffect } from 'react'
import { X, Folder, Rocket, Package } from 'lucide-react'
import FileTree from '../FileTree/FileTree'
import MarkdownPreview from '../MarkdownPreview/MarkdownPreview'
import styles from './DetailModal.module.css'
import { useSkillsStore, useDeployStore } from '../../stores'

export default function DetailModal() {
    const {
        activeCard,
        isModalOpen,
        fileTree,
        checkedFiles,
        previewFile,
        previewContent,
        closeDetail,
        toggleFileCheck,
        toggleAllFiles,
        selectPreviewFile
    } = useSkillsStore()

    const { startDeploy, isDeploying } = useDeployStore()

    // ESC 键关闭弹窗
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeDetail()
        }
        if (isModalOpen) {
            document.addEventListener('keydown', handleKeyDown)
        }
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [isModalOpen, closeDetail])

    if (!isModalOpen || !activeCard) return null

    const checkedCount = checkedFiles.size

    /** 处理部署点击 */
    const handleDeploy = () => {
        if (checkedCount === 0 || isDeploying) return
        startDeploy(activeCard.name, Array.from(checkedFiles))
    }

    /** 提取当前预览文件名 */
    const fileName = previewFile ? previewFile.split('/').pop() : undefined

    return (
        <div className={styles.overlay} onClick={closeDetail}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                {/* 顶栏 */}
                <div className={styles.topBar}>
                    <div className={styles.topTitle}>
                        <Folder size={22} className={styles.topTitleIcon} />
                        <span>{activeCard.name}</span>
                    </div>
                    <button className={styles.closeBtn} onClick={closeDetail} title="关闭">
                        <X size={18} />
                    </button>
                </div>

                {/* 主体 */}
                <div className={styles.body}>
                    {/* 左侧：文件树 */}
                    <div className={styles.leftPanel}>
                        <FileTree
                            tree={fileTree}
                            checkedFiles={checkedFiles}
                            activeFile={previewFile}
                            onToggleCheck={toggleFileCheck}
                            onToggleAll={toggleAllFiles}
                            onSelectFile={(path) => selectPreviewFile(activeCard.name, path)}
                        />
                    </div>

                    {/* 右侧：Markdown 预览 */}
                    <div className={styles.rightPanel}>
                        <MarkdownPreview fileName={fileName} content={previewContent || undefined} />
                    </div>
                </div>

                {/* 底栏 */}
                <div className={styles.bottomBar}>
                    <button
                        className={`${styles.deployBtn} ${checkedCount > 0 ? styles.deployBtnActive : styles.deployBtnDisabled}`}
                        onClick={handleDeploy}
                        disabled={checkedCount === 0 || isDeploying}
                    >
                        {checkedCount > 0 ? (
                            <>
                                <Rocket size={16} />
                                {isDeploying ? '部署中...' : `部署 ${checkedCount} 个文件`}
                            </>
                        ) : (
                            <>
                                <Package size={16} />
                                请先选择文件
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
