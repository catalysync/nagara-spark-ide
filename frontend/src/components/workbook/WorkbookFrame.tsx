import React from 'react'
import WorkbookTopBar from '../WorkbookTopBar'
import MainContent from '../MainContent'
import { useTheme } from '../../providers/ThemeProvider'

interface Props {
  onBack?: () => void
  projectId?: string
}

export default function WorkbookFrame({ onBack, projectId }: Props) {
  const { colorScheme } = useTheme()

  return (
    <div data-theme={colorScheme} style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-app)',
      color: 'var(--text-primary)',
    }}>
      {/* Top bar */}
      <WorkbookTopBar onBack={onBack} />

      {/* Main area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <MainContent />
      </div>
    </div>
  )
}
