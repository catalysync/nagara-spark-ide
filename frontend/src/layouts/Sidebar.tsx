import React from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'

const NAV_ITEMS = [
  { path: '/projects', icon: '⌂', label: 'Home' },
]

const PROJECT_ITEMS = [
  { path: 'workbooks', icon: '☰', label: 'Workbooks' },
  { path: 'datasets', icon: '◫', label: 'Datasets' },
  { path: 'connections', icon: '⚡', label: 'Connections' },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { projectId } = useParams<{ projectId: string }>()
  const [collapsed, setCollapsed] = React.useState(false)

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/')

  const sidebarWidth = collapsed ? 48 : 220

  return (
    <div style={{
      width: sidebarWidth,
      minWidth: sidebarWidth,
      height: '100%',
      background: 'var(--bg-surface-alt)',
      borderRight: '1px solid var(--border-default)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.15s ease',
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{
        height: 48,
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: 10,
        borderBottom: '1px solid var(--border-default)',
      }}>
        <div style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          background: 'linear-gradient(135deg, #14B8A6, #2D72D2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 12,
          fontWeight: 700,
          flexShrink: 0,
        }}>N</div>
        {!collapsed && <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>Nagara</span>}
      </div>

      {/* Main nav */}
      <div style={{ flex: 1, padding: '8px 0', overflow: 'auto' }}>
        {NAV_ITEMS.map(item => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              padding: '8px 12px',
              border: 'none',
              background: isActive(item.path) ? 'var(--bg-surface-hover)' : 'transparent',
              color: isActive(item.path) ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 13,
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: 16, width: 24, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
            {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
          </button>
        ))}

        {/* Project section */}
        {projectId && (
          <>
            <div style={{ height: 1, background: 'var(--border-default)', margin: '8px 12px' }} />
            {!collapsed && (
              <div style={{ padding: '4px 12px', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Project
              </div>
            )}
            {PROJECT_ITEMS.map(item => {
              const fullPath = `/projects/${projectId}${item.path === 'workbooks' ? '' : ''}`;
              const tabPath = `/projects/${projectId}`;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(`/projects/${projectId}?tab=${item.path}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '8px 12px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: 13,
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 16, width: 24, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
                  {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
                </button>
              )
            })}
          </>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          height: 36,
          border: 'none',
          borderTop: '1px solid var(--border-default)',
          background: 'transparent',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {collapsed ? '→' : '←'}
      </button>
    </div>
  )
}
