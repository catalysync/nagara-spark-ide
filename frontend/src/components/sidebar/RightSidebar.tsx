import React from 'react'
import { useWorkbook } from '../../providers/WorkbookProvider'
import { useTheme } from '../../providers/ThemeProvider'
import ConsolePanel from './ConsolePanel'
import GlobalCodePanel from './GlobalCodePanel'

export default function RightSidebar() {
  const { state, dispatch } = useWorkbook()
  const { colorScheme } = useTheme()
  const isDark = colorScheme === 'dark'
  const tabs = ['console', 'globalCode'] as const
  const tabLabels = { console: 'Console', globalCode: 'Global Code' }

  return (
    <div style={{
      width: 350,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: isDark ? '#0d1117' : '#ffffff',
      borderLeft: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`,
      flexShrink: 0,
    }}>
      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: `1px solid ${isDark ? '#21262d' : '#e5e7eb'}`,
        flexShrink: 0,
      }}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => dispatch({ type: 'SET_RIGHT_TAB', tab })}
            style={{
              flex: 1, padding: '10px 0', fontSize: 12, fontWeight: 500,
              cursor: 'pointer', background: 'transparent', border: 'none',
              borderBottom: state.rightSidebarTab === tab ? '2px solid #58a6ff' : '2px solid transparent',
              color: state.rightSidebarTab === tab ? (isDark ? '#c9d1d9' : '#1f2328') : (isDark ? '#8b949e' : '#656d76'),
            }}
          >
            {tabLabels[tab]}
          </button>
        ))}
        {/* Collapse button */}
        <button
          onClick={() => dispatch({ type: 'TOGGLE_RIGHT_SIDEBAR' })}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: isDark ? '#8b949e' : '#656d76', padding: '0 8px', fontSize: 14,
          }}
          title="Hide sidebar"
        >
          &#9654;
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {state.rightSidebarTab === 'console' && <ConsolePanel />}
        {state.rightSidebarTab === 'globalCode' && <GlobalCodePanel />}
      </div>
    </div>
  )
}
