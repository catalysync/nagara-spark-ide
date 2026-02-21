import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useTheme } from '../providers/ThemeProvider'

export default function AppLayout() {
  const { colorScheme } = useTheme()

  return (
    <div
      data-theme={colorScheme}
      style={{
        height: '100vh',
        display: 'flex',
        background: 'var(--bg-app)',
        color: 'var(--text-primary)',
      }}
    >
      <Sidebar />
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Outlet />
      </div>
    </div>
  )
}
