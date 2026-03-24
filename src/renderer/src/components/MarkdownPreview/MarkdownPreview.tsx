import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { FileText, Eye, Pencil, Save, Globe } from 'lucide-react'
import styles from './MarkdownPreview.module.css'
import 'highlight.js/styles/github.css'
import { useSkillsStore } from '../../stores'

interface Props {
    fileName?: string
    content?: string
}

export default function MarkdownPreview({ fileName, content }: Props) {
    const [isEditing, setIsEditing] = useState(false)
    const [editContent, setEditContent] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    const [isTranslating, setIsTranslating] = useState(false)

    const { activeCard, previewFile, saveFileContent } = useSkillsStore()

    // 当文件切换时重置编辑状态
    useEffect(() => {
        setIsEditing(false)
        setEditContent(content || '')
    }, [fileName, content])

    if (!fileName || !content) {
        return (
            <div className={styles.container}>
                <div className={styles.empty}>
                    <Eye size={48} className={styles.emptyIcon} />
                    <span>请在左侧选择文件以预览</span>
                </div>
            </div>
        )
    }

    /** 切换到编辑模式 */
    const handleEdit = () => {
        setEditContent(content)
        setIsEditing(true)
    }



    /** 保存文件 */
    const handleSave = async () => {
        if (!activeCard || !previewFile || isSaving) return
        setIsSaving(true)
        try {
            const result = await saveFileContent(activeCard.name, previewFile, editContent)
            if (result.success) {
                setIsEditing(false)
            } else {
                alert(`保存失败: ${result.message || '未知错误'}`)
            }
        } finally {
            setIsSaving(false)
        }
    }

    // 简单检测当前内容是否包含中文，用于决定下一目标的语言
    const isCurrentChinese = /[\u4e00-\u9fa5]/.test(content || '')
    const targetLang = isCurrentChinese ? 'en' : 'zh-CN'
    const targetLabel = isCurrentChinese ? '英文' : '中文'

    /** 翻译内容并直接保存覆盖 */
    const handleTranslate = async () => {
        if (!content || !activeCard || !previewFile) return
        
        setIsTranslating(true)
        try {
            // 利用 Google 免费翻译接口，根据当前语言推断对应目标语言
            const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ q: content })
            })
            const data = await response.json()
            const translatedText = data[0].map((item: any) => item[0]).join('')
            
            // 翻译成功后直接保存覆盖原文件
            const result = await saveFileContent(activeCard.name, previewFile, translatedText)
            if (!result.success) {
                alert(`保存翻译失败: ${result.message || '未知错误'}`)
            }
        } catch (error) {
            alert('翻译请求失败: ' + error)
        } finally {
            setIsTranslating(false)
        }
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <FileText size={16} className={styles.headerIcon} />
                <span className={styles.headerFileName}>{fileName}</span>
                <div className={styles.headerActions}>
                    {isEditing ? (
                        <>
                            {/* 预览按钮已去掉 */}
                            <button
                                className={`${styles.actionBtn} ${styles.saveBtn}`}
                                onClick={handleSave}
                                disabled={isSaving}
                                title="保存"
                            >
                                <Save size={14} />
                                <span>{isSaving ? '保存中...' : '保存'}</span>
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                className={styles.actionBtn}
                                onClick={handleTranslate}
                                disabled={isTranslating}
                                title={`一键翻译并覆盖保存为${targetLabel}`}
                            >
                                <Globe size={14} />
                                <span>{isTranslating ? '翻译中...' : `翻译${targetLabel}`}</span>
                            </button>
                            <button
                                className={styles.actionBtn}
                                onClick={handleEdit}
                                title="编辑"
                            >
                                <Pencil size={14} />
                                <span>编辑</span>
                            </button>
                        </>
                    )}
                </div>
            </div>
            <div className={styles.content}>
                {isEditing ? (
                    <textarea
                        className={styles.editor}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        spellCheck={false}
                    />
                ) : (
                    <div className={styles.markdown}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                            {content}
                        </ReactMarkdown>
                    </div>
                )}
            </div>
        </div>
    )
}
