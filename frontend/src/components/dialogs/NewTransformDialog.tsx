import React, { useState } from 'react'
import { useTheme } from '../../providers/ThemeProvider'
import { useWorkbook } from '../../providers/WorkbookProvider'

interface NewTransformDialogProps {
  open: boolean
  onClose: () => void
  sourceNodeId?: string | null
}

export default function NewTransformDialog({ open, onClose, sourceNodeId }: NewTransformDialogProps) {
  const { state, dispatch, autoLayout } = useWorkbook()
  const { colorScheme } = useTheme()
  const isDark = colorScheme === 'dark'
  const [name, setName] = useState('')
  const [language, setLanguage] = useState<'python' | 'sql'>('python')

  if (!open) return null

  const handleCreate = () => {
    const id = `transform_${Date.now()}`
    const trimmedName = name.trim() || `Transform ${state.workbook.nodes.filter(n => n.type === 'transform').length + 1}`

    const defaultCode = language === 'python'
      ? '# Write your PySpark transformation here\n# Input DataFrames are available as variables\n\n'
      : '-- Write your SQL query here\n-- Input tables are available by their node names\n\nSELECT * FROM '

    dispatch({
      type: 'ADD_NODE',
      node: {
        id, type: 'transform', name: trimmedName, language,
        code: defaultCode, save_as_dataset: false,
        position: { x: 300, y: state.workbook.nodes.length * 150 },
      },
    })

    if (sourceNodeId) {
      dispatch({
        type: 'ADD_EDGE',
        edge: { id: `edge-${sourceNodeId}-${id}`, source: sourceNodeId, target: id },
      })
    }

    setTimeout(autoLayout, 100)
    dispatch({ type: 'SELECT_NODE', id })
    setName('')
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: isDark ? '#161b22' : '#ffffff',
        border: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`,
        borderRadius: 12, padding: 24, width: 400,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, color: isDark ? '#c9d1d9' : '#1f2328' }}>New Transform</h3>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, color: isDark ? '#8b949e' : '#656d76', marginBottom: 4 }}>Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`Transform ${state.workbook.nodes.filter(n => n.type === 'transform').length + 1}`}
            autoFocus
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 6, fontSize: 14,
              background: isDark ? '#0d1117' : '#f6f8fa',
              color: isDark ? '#c9d1d9' : '#1f2328',
              border: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`,
              outline: 'none', boxSizing: 'border-box',
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, color: isDark ? '#8b949e' : '#656d76', marginBottom: 8 }}>Language</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['python', 'sql'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500,
                  background: language === lang ? (isDark ? '#1f6feb' : '#0969da') : (isDark ? '#21262d' : '#f6f8fa'),
                  color: language === lang ? '#fff' : (isDark ? '#c9d1d9' : '#1f2328'),
                  border: `1px solid ${language === lang ? 'transparent' : (isDark ? '#30363d' : '#d0d7de')}`,
                }}
              >
                {lang === 'python' ? 'Python' : 'SQL'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13,
            background: 'transparent', color: isDark ? '#8b949e' : '#656d76',
            border: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`,
          }}>Cancel</button>
          <button onClick={handleCreate} style={{
            padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500,
            background: '#238636', color: '#fff', border: 'none',
          }}>Create Transform</button>
        </div>
      </div>
    </div>
  )
}
