import React, { useEffect, useState } from 'react'
import { useWorkbook } from '../../providers/WorkbookProvider'
import { useTheme } from '../../providers/ThemeProvider'
import { getNodeSchema } from '../../api/workbookApi'
import type { SchemaField } from '../../types/workbook'

interface SchemaTabProps {
  nodeId: string
}

export default function SchemaTab({ nodeId }: SchemaTabProps) {
  const { state, workbookId } = useWorkbook()
  const { colorScheme } = useTheme()
  const isDark = colorScheme === 'dark'
  const [schema, setSchema] = useState<SchemaField[] | null>(null)

  useEffect(() => {
    if (!workbookId) return
    getNodeSchema(workbookId, nodeId).then((res) => setSchema(res.schema)).catch(() => {})
  }, [nodeId, workbookId, state.nodeResults[nodeId]])

  if (!schema) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: isDark ? '#484f58' : '#8c959f', fontSize: 13 }}>
        Execute the node first to see its schema
      </div>
    )
  }

  return (
    <div style={{ padding: 12, overflow: 'auto', height: '100%' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: isDark ? '#161b22' : '#f6f8fa' }}>
            <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`, color: isDark ? '#8b949e' : '#656d76', fontWeight: 500 }}>Column</th>
            <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`, color: isDark ? '#8b949e' : '#656d76', fontWeight: 500 }}>Type</th>
            <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`, color: isDark ? '#8b949e' : '#656d76', fontWeight: 500 }}>Nullable</th>
          </tr>
        </thead>
        <tbody>
          {schema.map((field, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${isDark ? '#21262d' : '#f0f0f0'}` }}>
              <td style={{ padding: '6px 12px', fontWeight: 500, color: isDark ? '#c9d1d9' : '#1f2328' }}>{field.name}</td>
              <td style={{ padding: '6px 12px', fontFamily: 'var(--nagara-font-mono)', fontSize: 12, color: isDark ? '#58a6ff' : '#0969da' }}>{field.type}</td>
              <td style={{ padding: '6px 12px', color: isDark ? '#8b949e' : '#656d76' }}>{field.nullable ? 'Yes' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
