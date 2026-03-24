import { Folder, FolderOpen, FileText } from 'lucide-react'
import { useState } from 'react'
import styles from './FileTree.module.css'
import type { FileTreeNode } from '../../../../shared/types'

interface Props {
    tree: FileTreeNode[]
    checkedFiles: Set<string>
    activeFile: string
    onToggleCheck: (path: string, checked: boolean) => void
    onToggleAll: (checked: boolean) => void
    onSelectFile: (relativePath: string) => void
}

/** 递归收集所有文件路径 */
function collectAllFiles(nodes: FileTreeNode[]): string[] {
    const files: string[] = []
    for (const node of nodes) {
        if (node.type === 'file') files.push(node.relativePath)
        else if (node.children) files.push(...collectAllFiles(node.children))
    }
    return files
}

/** 单个树节点 */
function TreeNode({
    node,
    depth,
    checkedFiles,
    activeFile,
    onToggleCheck,
    onSelectFile
}: {
    node: FileTreeNode
    depth: number
    checkedFiles: Set<string>
    activeFile: string
    onToggleCheck: (path: string, checked: boolean) => void
    onSelectFile: (path: string) => void
}) {
    const [expanded, setExpanded] = useState(true)
    const isFile = node.type === 'file'
    const isActive = isFile && activeFile === node.relativePath

    // 判断目录的勾选状态
    let isChecked = false
    if (isFile) {
        isChecked = checkedFiles.has(node.relativePath)
    } else if (node.children) {
        const childFiles = collectAllFiles(node.children)
        isChecked = childFiles.length > 0 && childFiles.every((f) => checkedFiles.has(f))
    }

    const handleClick = () => {
        if (isFile) {
            onSelectFile(node.relativePath)
        } else {
            setExpanded(!expanded)
        }
    }

    const handleCheckChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation()
        onToggleCheck(node.relativePath, e.target.checked)
    }

    return (
        <>
            <div
                className={`${styles.node} ${isActive ? styles.nodeActive : ''}`}
                style={{ paddingLeft: `${depth * 20 + 16}px` }}
                onClick={handleClick}
            >
                <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={isChecked}
                    onChange={handleCheckChange}
                    onClick={(e) => e.stopPropagation()}
                />
                {isFile ? (
                    <FileText size={16} className={styles.nodeIcon} />
                ) : expanded ? (
                    <FolderOpen size={16} className={styles.nodeIcon} />
                ) : (
                    <Folder size={16} className={styles.nodeIcon} />
                )}
                <span className={styles.nodeName}>{node.name}</span>
            </div>
            {!isFile && expanded && node.children?.map((child) => (
                <TreeNode
                    key={child.relativePath}
                    node={child}
                    depth={depth + 1}
                    checkedFiles={checkedFiles}
                    activeFile={activeFile}
                    onToggleCheck={onToggleCheck}
                    onSelectFile={onSelectFile}
                />
            ))}
        </>
    )
}

export default function FileTree({ tree, checkedFiles, activeFile, onToggleCheck, onToggleAll, onSelectFile }: Props) {
    const allFiles = collectAllFiles(tree)
    const allChecked = allFiles.length > 0 && allFiles.every((f) => checkedFiles.has(f))

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <span className={styles.headerLabel}>文件目录</span>
            </div>
            <div className={styles.selectAll}>
                <input
                    type="checkbox"
                    className={styles.topCheckbox}
                    checked={allChecked}
                    onChange={(e) => onToggleAll(e.target.checked)}
                />
                <span>全选</span>
            </div>
            <div className={styles.treeList}>
                {tree.map((node) => (
                    <TreeNode
                        key={node.relativePath}
                        node={node}
                        depth={0}
                        checkedFiles={checkedFiles}
                        activeFile={activeFile}
                        onToggleCheck={onToggleCheck}
                        onSelectFile={onSelectFile}
                    />
                ))}
            </div>
        </div>
    )
}
