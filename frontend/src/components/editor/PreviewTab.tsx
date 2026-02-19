import React from 'react'
import { useWorkbook } from '../../providers/WorkbookProvider'
import { useTheme } from '../../providers/ThemeProvider'
import DataPreviewTable from '../shared/DataPreviewTable'

interface PreviewTabProps {
  nodeId: string
}

export default function PreviewTab({ nodeId }: PreviewTabProps) {
  const { state } = useWorkbook()
  const { colorScheme } = useTheme()
  const isDark = colorScheme === 'dark'
  const result = state.nodeResults[nodeId]

  if (!result) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: isDark ? '#484f58' : '#8c959f', fontSize: 13 }}>
        Run or preview this node to see results
      </div>
    )
  }

  if (result.status === 'running') {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#d29922', fontSize: 13 }}>
        Executing...
      </div>
    )
  }

  return (
    <div style={{ padding: 12, overflow: 'auto', height: '100%' }}>
      {/* DataFrame table */}
      {result.dataframe && <DataPreviewTable data={result.dataframe} />}

      {/* Text result */}
      {result.result && !result.dataframe && (
        <pre style={{
          fontFamily: 'var(--nagara-font-mono)', fontSize: 12,
          color: isDark ? '#3fb950' : '#1a7f37',
          background: isDark ? '#0d1117' : '#f6f8fa',
          padding: 12, borderRadius: 6, overflow: 'auto',
        }}>
          {result.result}
        </pre>
      )}

      {/* Stdout */}
      {result.stdout && (
        <pre style={{
          fontFamily: 'var(--nagara-font-mono)', fontSize: 12,
          color: isDark ? '#c9d1d9' : '#1f2328',
          background: isDark ? '#0d1117' : '#f6f8fa',
          padding: 12, borderRadius: 6, marginTop: 8, overflow: 'auto',
          whiteSpace: 'pre-wrap',
        }}>
          {result.stdout}
        </pre>
      )}

      {/* Error */}
      {result.error && (
        <pre style={{
          fontFamily: 'var(--nagara-font-mono)', fontSize: 12,
          color: '#f85149',
          background: isDark ? '#1a0a0a' : '#fff5f5',
          padding: 12, borderRadius: 6, marginTop: 8, overflow: 'auto',
          whiteSpace: 'pre-wrap',
          border: '1px solid rgba(248, 81, 73, 0.3)',
        }}>
          {result.error}
        </pre>
      )}
    </div>
  )
}
