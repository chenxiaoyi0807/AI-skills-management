import { Search } from 'lucide-react'
import styles from './SearchBar.module.css'

interface Props {
    value: string
    onChange: (value: string) => void
    placeholder?: string
}

export default function SearchBar({ value, onChange, placeholder = '搜索 Skills 名称或标签...' }: Props) {
    return (
        <div className={styles.wrapper}>
            <Search size={16} className={styles.icon} />
            <input
                className={styles.input}
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                id="search-bar"
            />
        </div>
    )
}
