import React from 'react'
import { useTheme } from '../providers/ThemeProvider'
import { useWorkbook } from '../providers/WorkbookProvider'

export default function WorkbookTopBar() {
  const { colorScheme, toggleTheme } = useTheme()
  const { state, dispatch, saveWorkbook } = useWorkbook()
  const isDark = colorScheme === 'dark'

  return (
    <div style={{
      height: 48,
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: 12,
      background: isDark ? '#161b22' : '#ffffff',
      borderBottom: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`,
      color: isDark ? '#c9d1d9' : '#1f2328',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 28, height: 28,
          background: 'linear-gradient(135deg, #f97316, #dc2626)',
          borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 700, fontSize: 14,
        }}>N</div>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Nagara</span>
      </div>

      <div style={{ width: 1, height: 24, background: isDark ? '#30363d' : '#d0d7de' }} />

      {/* Workbook name */}
      <input
        value={state.workbook.name}
        onChange={(e) => dispatch({ type: 'SET_WORKBOOK', workbook: { ...state.workbook, name: e.target.value } })}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'inherit',
          fontSize: 14,
          fontWeight: 500,
          outline: 'none',
          width: 200,
          padding: '4px 8px',
          borderRadius: 4,
        }}
        onFocus={(e) => { e.target.style.background = isDark ? '#21262d' : '#f6f8fa' }}
        onBlur={(e) => { e.target.style.background = 'transparent'; saveWorkbook() }}
      />

      <div style={{ width: 1, height: 24, background: isDark ? '#30363d' : '#d0d7de' }} />

      {/* Branch selector (stub) */}
      <select
        style={{
          background: isDark ? '#21262d' : '#f6f8fa',
          color: 'inherit',
          border: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`,
          borderRadius: 6,
          padding: '4px 8px',
          fontSize: 12,
        }}
      >
        <option>main</option>
      </select>

      <div style={{ flex: 1 }} />

      {/* Spark status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: state.sparkReady ? '#3fb950' : '#d29922',
          animation: state.sparkReady ? 'none' : 'pulse 1.5s infinite',
        }} />
        <span style={{ color: isDark ? '#8b949e' : '#656d76' }}>
          {state.sparkReady ? 'Spark Ready' : 'Connecting...'}
        </span>
      </div>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        style={{
          background: isDark ? '#21262d' : '#f6f8fa',
          border: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`,
          borderRadius: 6,
          padding: '4px 10px',
          cursor: 'pointer',
          color: 'inherit',
          fontSize: 14,
        }}
        title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      >
        {isDark ? '\u2600' : '\u263E'}
      </button>
    </div>
  )
}
