import { useState, type KeyboardEvent } from 'react'
import { Folder, Download, Github } from 'lucide-react'
import TagPill from '../TagPill/TagPill'
import styles from './SkillCard.module.css'
import type { SkillCard as SkillCardType } from '../../../../shared/types'

interface Props {
    card: SkillCardType
    onClick: () => void
    onDeploy: () => void
    onTagsChange: (tags: string[]) => void
}

/** 标签颜色循环列表 */
const TAG_COLORS = ['purple', 'blue', 'cyan', 'orange', 'pink'] as const

export default function SkillCard({ card, onClick, onDeploy, onTagsChange }: Props) {
    const [isAddingTag, setIsAddingTag] = useState(false)
    const [newTag, setNewTag] = useState('')

    const [editingTagIndex, setEditingTagIndex] = useState<number | null>(null)
    const [editTagValue, setEditTagValue] = useState('')

    /** 添加标签 */
    const handleAddTag = () => {
        const tag = newTag.trim()
        if (tag && !card.tags.includes(tag) && card.tags.length < 10) {
            onTagsChange([...card.tags, tag])
        }
        setNewTag('')
        setIsAddingTag(false)
    }

    /** 删除标签 */
    const handleRemoveTag = (tagToRemove: string) => {
        onTagsChange(card.tags.filter((t) => t !== tagToRemove))
    }

    /** 输入框按键处理 */
    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleAddTag()
        if (e.key === 'Escape') {
            setNewTag('')
            setIsAddingTag(false)
        }
    }

    /** 提交双击修改后的标签 */
    const handleEditTagCommit = () => {
        if (editingTagIndex === null) return
        
        const newTagValue = editTagValue.trim()
        const oldTagValue = card.tags[editingTagIndex]

        if (!newTagValue) {
            handleRemoveTag(oldTagValue)
        } else if (newTagValue !== oldTagValue) {
            const newTags = [...card.tags]
            // 防重处理
            if (newTags.includes(newTagValue)) {
                newTags.splice(editingTagIndex, 1) // 如果改成的名字和其他现存标签冲突，则视为删除此标签
            } else {
                newTags[editingTagIndex] = newTagValue
            }
            onTagsChange(newTags)
        }
        
        setEditingTagIndex(null)
        setEditTagValue('')
    }

    const handleEditKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleEditTagCommit()
        if (e.key === 'Escape') {
            setEditingTagIndex(null)
            setEditTagValue('')
        }
    }

    /** 格式化更新时间 */
    const formatTime = (ts?: number) => {
        if (!ts) return ''
        const d = new Date(ts)
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}` // 简单年月日
    }

    return (
        <div className={styles.card} onClick={onClick} role="button" tabIndex={0}>
            {/* 标题行 */}
            <div className={styles.header}>
                <div className={styles.titleArea}>
                    <Folder size={20} className={styles.icon} />
                    <span className={styles.title} title={card.name}>{card.name}</span>
                    {card.syncUrl && (
                        <span title={`已绑定 GitHub: ${card.syncUrl}`} className={styles.githubIconWrapper}>
                            <Github 
                                size={16} 
                                className={styles.githubIcon} 
                            />
                        </span>
                    )}
                </div>
                <button
                    className={styles.deployBtn}
                    onClick={(e) => { e.stopPropagation(); onDeploy(); }}
                    title="部署整个技能包"
                >
                    <Download size={16} />
                </button>
            </div>

            {/* 信息和统计 */}
            <div className={styles.metaRow}>
                <span className={styles.fileCount}>{card.fileCount} 个文件</span>
                {card.updatedAt > 0 && (
                    <span className={styles.updateTime}>
                        更新于 {formatTime(card.updatedAt)}
                    </span>
                )}
            </div>

            {/* 标签区域 */}
            <div className={styles.tags} onClick={(e) => e.stopPropagation()}>
                {card.tags.map((tag, i) => (
                    editingTagIndex === i ? (
                        <input
                            key={`edit-${i}`}
                            className={styles.tagInput}
                            value={editTagValue}
                            onChange={(e) => setEditTagValue(e.target.value)}
                            onBlur={handleEditTagCommit}
                            onKeyDown={handleEditKeyDown}
                            maxLength={20}
                            autoFocus
                            placeholder="修改标签"
                        />
                    ) : (
                        <TagPill
                            key={tag}
                            label={tag}
                            color={TAG_COLORS[i % TAG_COLORS.length]}
                            onRemove={() => handleRemoveTag(tag)}
                            onDoubleClick={(e) => {
                                e.stopPropagation()
                                setEditingTagIndex(i)
                                setEditTagValue(tag)
                            }}
                        />
                    )
                ))}

                {isAddingTag ? (
                    <input
                        className={styles.tagInput}
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onBlur={handleAddTag}
                        onKeyDown={handleKeyDown}
                        maxLength={20}
                        autoFocus
                        placeholder="标签名"
                    />
                ) : (
                    card.tags.length < 10 && (
                        <button
                            className={styles.addTagBtn}
                            onClick={() => setIsAddingTag(true)}
                            title="添加标签"
                        >
                            +
                        </button>
                    )
                )}
            </div>
        </div>
    )
}
