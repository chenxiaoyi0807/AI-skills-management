import styles from './TagPill.module.css'

interface Props {
    label: string
    color?: 'purple' | 'blue' | 'cyan' | 'orange' | 'pink'
    onRemove?: () => void
    onDoubleClick?: (e: React.MouseEvent) => void
}

export default function TagPill({ label, color = 'blue', onRemove, onDoubleClick }: Props) {
    return (
        <span 
            className={`${styles.pill} ${styles[color]}`}
            onDoubleClick={onDoubleClick}
        >
            {label}
            {onRemove && (
                <button
                    className={styles.removeBtn}
                    onClick={(e) => {
                        e.stopPropagation()
                        onRemove()
                    }}
                    title="删除标签"
                >
                    ×
                </button>
            )}
        </span>
    )
}
