import styles from './TagPill.module.css'

interface Props {
    label: string
    color?: 'purple' | 'blue' | 'cyan' | 'orange' | 'pink'
    onRemove?: () => void
}

export default function TagPill({ label, color = 'blue', onRemove }: Props) {
    return (
        <span className={`${styles.pill} ${styles[color]}`}>
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
