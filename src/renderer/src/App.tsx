import { useEffect, useState } from 'react'
import { useConfigStore } from './stores'
import Welcome from './pages/Welcome/Welcome'
import Dashboard from './pages/Dashboard/Dashboard'
import Settings from './pages/Settings/Settings'

type Page = 'welcome' | 'dashboard' | 'settings'
type Theme = 'dark' | 'light'

export default function App() {
    const { rootDir, isLoading, loadConfig } = useConfigStore()
    const [page, setPage] = useState<Page>('welcome')
    const [theme, setTheme] = useState<Theme>('dark')

    // 初始化加载配置
    useEffect(() => {
        loadConfig()
    }, [loadConfig])

    // 根据配置决定初始页面
    useEffect(() => {
        if (!isLoading) {
            setPage(rootDir ? 'dashboard' : 'welcome')
        }
    }, [isLoading, rootDir])

    // 同步主题到 document 根元素
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
    }, [theme])

    const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

    if (isLoading) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                background: 'var(--bg-base)'
            }}>
                加载中...
            </div>
        )
    }

    switch (page) {
        case 'welcome':
            return <Welcome />
        case 'settings':
            return (
                <Settings
                    onBack={() => setPage('dashboard')}
                    theme={theme}
                    onToggleTheme={toggleTheme}
                />
            )
        case 'dashboard':
        default:
            return (
                <Dashboard
                    onOpenSettings={() => setPage('settings')}
                    theme={theme}
                    onToggleTheme={toggleTheme}
                />
            )
    }
}
