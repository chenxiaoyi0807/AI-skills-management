import { AlertTriangle, FileText } from 'lucide-react'
import styles from './ConflictDialog.module.css'
import type { ConflictItem } from '../../../../shared/types'

interface Props {
    conflicts: ConflictItem[]
    onOverwriteAll: () => void
    onSkipAll: () => void
    onCancel: () => void
}

export default function ConflictDialog({ conflicts, onOverwriteAll, onSkipAll, onCancel }: Props) {
    return (
        <div className={styles.overlay} onClick={onCancel}>
            <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
                {/* 标题 */}
                <div className={styles.header}>
                    <AlertTriangle size={22} className={styles.headerIcon} />
                    <span className={styles.headerTitle}>检测到文件冲突</span>
                </div>

                {/* 冲突文件列表 */}
                <div className={styles.body}>
                    <p className={styles.message}>
                        以下 {conflicts.length} 个文件在目标目录中已存在：
                    </p>
                    <ul className={styles.fileList}>
                        {conflicts.map((c) => (
                            <li key={c.fileName} className={styles.fileItem}>
                                <FileText size={16} className={styles.fileIcon} />
                                <span>{c.fileName}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* 操作按钮 */}
                <div className={styles.footer}>
                    <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={onCancel}>
                        取消
                    </button>
                    <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={onSkipAll}>
                        跳过全部
                    </button>
                    <button className={`${styles.btn} ${styles.btnDanger}`} onClick={onOverwriteAll}>
                        覆盖全部
                    </button>
                </div>
            </div>
        </div>
    )
}
