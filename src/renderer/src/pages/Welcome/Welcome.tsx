import { FolderOpen } from 'lucide-react'
import styles from './Welcome.module.css'
import { useConfigStore, useSkillsStore } from '../../stores'

export default function Welcome() {
    const { selectAndSetRootDir } = useConfigStore()
    const { loadSkills } = useSkillsStore()

    const handleSelect = async () => {
        const success = await selectAndSetRootDir()
        if (success) {
            loadSkills()
        }
    }

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <div className={styles.sparkle}>✦</div>
                <h1 className={styles.title}>AI Skills Manager</h1>
                <p className={styles.subtitle}>轻松管理你的 AI 提示词资产库</p>

                <button className={styles.selectBtn} onClick={handleSelect}>
                    <FolderOpen size={20} />
                    选择 Skills 根目录
                </button>

                <p className={styles.hint}>
                    将包含你所有 Skill 文件夹的根目录选择出来，即可开始使用。
                </p>
            </div>
        </div>
    )
}
