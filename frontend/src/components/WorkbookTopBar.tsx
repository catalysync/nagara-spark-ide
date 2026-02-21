import React from 'react'
import { useTheme } from '../providers/ThemeProvider'
import { useWorkbook } from '../providers/WorkbookProvider'

interface Props {
  onBack?: () => void
}

export default function WorkbookTopBar({ onBack }: Props) {
  const { colorScheme, toggleTheme } = useTheme()
  const { state, dispatch, saveWorkbook } = useWorkbook()

  return (
    <div style={{
      height: 48,
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: 12,
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-default)',
      color: 'var(--text-primary)',
      flexShrink: 0,
    }}>
      {/* Back button */}
      {onBack && (
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 16,
            padding: '4px 8px',
            borderRadius: 4,
          }}
          title="Back to project"
        >
          ←
        </button>
      )}

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 24, height: 24,
          background: 'linear-gradient(135deg, #14B8A6, #2D72D2)',
          borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 700, fontSize: 11,
        }}>N</div>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Nagara</span>
      </div>

      <div style={{ width: 1, height: 24, background: 'var(--border-default)' }} />

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
        onFocus={(e) => { e.target.style.background = 'var(--bg-surface-hover)' }}
        onBlur={(e) => { e.target.style.background = 'transparent'; saveWorkbook() }}
      />

      <div style={{ flex: 1 }} />

      {/* Spark status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: state.sparkReady ? 'var(--green)' : 'var(--orange)',
          animation: state.sparkReady ? 'none' : 'pulse 1.5s infinite',
        }} />
        <span style={{ color: 'var(--text-muted)' }}>
          {state.sparkReady ? 'Spark Ready' : 'Connecting...'}
        </span>
      </div>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        style={{
          background: 'var(--bg-surface-hover)',
          border: '1px solid var(--border-default)',
          borderRadius: 6,
          padding: '4px 10px',
          cursor: 'pointer',
          color: 'inherit',
          fontSize: 14,
        }}
        title={`Switch to ${colorScheme === 'dark' ? 'light' : 'dark'} theme`}
      >
        {colorScheme === 'dark' ? '\u2600' : '\u263E'}
      </button>
    </div>
  )
}
