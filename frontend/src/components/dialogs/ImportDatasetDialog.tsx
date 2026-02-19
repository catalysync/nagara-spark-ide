import React, { useState, useRef } from 'react'
import { useTheme } from '../../providers/ThemeProvider'
import { useWorkbook } from '../../providers/WorkbookProvider'
import * as api from '../../api/workbookApi'

interface ImportDatasetDialogProps {
  open: boolean
  onClose: () => void
}

export default function ImportDatasetDialog({ open, onClose }: ImportDatasetDialogProps) {
  const { state, dispatch, autoLayout } = useWorkbook()
  const { colorScheme } = useTheme()
  const isDark = colorScheme === 'dark'
  const [tab, setTab] = useState<'code' | 'csv'>('code')
  const [name, setName] = useState('')
  const [code, setCode] = useState('# Create a DataFrame\ndf = spark.range(10)\ndf')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  const handleCreateFromCode = () => {
    const id = `dataset_${Date.now()}`
    const trimmedName = name.trim() || `Dataset ${state.workbook.nodes.filter(n => n.type === 'dataset').length + 1}`

    dispatch({
      type: 'ADD_NODE',
      node: {
        id, type: 'dataset', name: trimmedName, language: 'python',
        code, save_as_dataset: false,
        position: { x: 100, y: state.workbook.nodes.length * 150 },
      },
    })

    setTimeout(autoLayout, 100)
    dispatch({ type: 'SELECT_NODE', id })
    setName('')
    setCode('# Create a DataFrame\ndf = spark.range(10)\ndf')
    onClose()
  }

  const handleUploadCsv = async () => {
    if (!file) return
    setLoading(true)
    try {
      const trimmedName = name.trim() || file.name.replace('.csv', '')
      const result = await api.uploadCsv(file, trimmedName)
      const id = result.node_id

      dispatch({
        type: 'ADD_NODE',
        node: {
          id, type: 'dataset', name: trimmedName, language: 'python',
          code: `# Auto-loaded from CSV: ${file.name}\n# ${result.rows} rows, ${result.columns.length} columns`,
          save_as_dataset: true,
          position: { x: 100, y: state.workbook.nodes.length * 150 },
        },
      })

      setTimeout(autoLayout, 100)
      dispatch({ type: 'SELECT_NODE', id })
      setName('')
      setFile(null)
      onClose()
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: isDark ? '#161b22' : '#ffffff',
        border: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`,
        borderRadius: 12, padding: 24, width: 480,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, color: isDark ? '#c9d1d9' : '#1f2328' }}>Import Dataset</h3>

        {/* Name */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, color: isDark ? '#8b949e' : '#656d76', marginBottom: 4 }}>Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dataset name"
            autoFocus
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 6, fontSize: 14,
              background: isDark ? '#0d1117' : '#f6f8fa',
              color: isDark ? '#c9d1d9' : '#1f2328',
              border: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 12, borderBottom: `1px solid ${isDark ? '#21262d' : '#e5e7eb'}` }}>
          {(['code', 'csv'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '8px 16px', fontSize: 12, cursor: 'pointer',
                background: 'transparent', border: 'none',
                borderBottom: tab === t ? '2px solid #58a6ff' : '2px solid transparent',
                color: tab === t ? (isDark ? '#c9d1d9' : '#1f2328') : (isDark ? '#8b949e' : '#656d76'),
              }}
            >
              {t === 'code' ? 'From Code' : 'Upload CSV'}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'code' && (
          <div style={{ marginBottom: 16 }}>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={6}
              style={{
                width: '100%', padding: 12, borderRadius: 6, fontSize: 13,
                fontFamily: 'var(--nagara-font-mono)',
                background: isDark ? '#0d1117' : '#f6f8fa',
                color: isDark ? '#c9d1d9' : '#1f2328',
                border: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`,
                outline: 'none', resize: 'vertical', boxSizing: 'border-box',
              }}
            />
          </div>
        )}

        {tab === 'csv' && (
          <div style={{ marginBottom: 16 }}>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
              onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                padding: 24, borderRadius: 8, textAlign: 'center', cursor: 'pointer',
                border: `2px dashed ${isDark ? '#30363d' : '#d0d7de'}`,
                color: isDark ? '#8b949e' : '#656d76', fontSize: 13,
              }}
            >
              {file ? file.name : 'Click to select a CSV file'}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13,
            background: 'transparent', color: isDark ? '#8b949e' : '#656d76',
            border: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`,
          }}>Cancel</button>
          <button
            onClick={tab === 'code' ? handleCreateFromCode : handleUploadCsv}
            disabled={loading || (tab === 'csv' && !file)}
            style={{
              padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500,
              background: '#238636', color: '#fff', border: 'none',
              opacity: (loading || (tab === 'csv' && !file)) ? 0.6 : 1,
            }}
          >
            {loading ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  )
}
