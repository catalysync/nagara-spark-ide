import React from 'react'
import WorkbookTopBar from './WorkbookTopBar'
import ContentsSidebar from './ContentsSidebar'
import MainContent from './MainContent'
import { useTheme } from '../providers/ThemeProvider'

export default function WorkbookFrame() {
  const { colorScheme } = useTheme()
  const isDark = colorScheme === 'dark'

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: isDark ? '#0d1117' : '#f6f8fa',
      color: isDark ? '#c9d1d9' : '#1f2328',
    }}>
      {/* Top bar */}
      <WorkbookTopBar />

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left sidebar */}
        <ContentsSidebar />

        {/* Center + Right (position context for absolute children) */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <MainContent />
        </div>
      </div>
    </div>
  )
}
