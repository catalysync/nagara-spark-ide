import React from 'react'
import { useTheme } from '../../providers/ThemeProvider'
import type { DataFrameData } from '../../types/workbook'

interface DataPreviewTableProps {
  data: DataFrameData
}

export default function DataPreviewTable({ data }: DataPreviewTableProps) {
  const { colorScheme } = useTheme()
  const isDark = colorScheme === 'dark'

  return (
    <div style={{ overflow: 'auto', maxHeight: 400, border: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`, borderRadius: 6 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{
            position: 'sticky', top: 0,
            background: isDark ? '#161b22' : '#f6f8fa',
            zIndex: 1,
          }}>
            <th style={{
              padding: '8px 12px', textAlign: 'left',
              borderBottom: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`,
              borderRight: `1px solid ${isDark ? '#21262d' : '#e5e7eb'}`,
              color: isDark ? '#8b949e' : '#656d76', fontWeight: 500, width: 40,
            }}>#</th>
            {data.columns.map((col, i) => (
              <th key={i} style={{
                padding: '6px 12px', textAlign: 'left',
                borderBottom: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`,
                borderRight: `1px solid ${isDark ? '#21262d' : '#e5e7eb'}`,
                whiteSpace: 'nowrap',
              }}>
                <div style={{ color: isDark ? '#c9d1d9' : '#1f2328', fontWeight: 600 }}>{col}</div>
                <div style={{ color: isDark ? '#484f58' : '#8c959f', fontSize: 10, fontWeight: 400 }}>{data.types[i]}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, i) => (
            <tr key={i} style={{
              borderBottom: `1px solid ${isDark ? '#21262d' : '#f0f0f0'}`,
              background: i % 2 === 0 ? 'transparent' : (isDark ? 'rgba(22,27,34,0.5)' : 'rgba(246,248,250,0.5)'),
            }}>
              <td style={{
                padding: '4px 12px',
                color: isDark ? '#484f58' : '#8c959f',
                borderRight: `1px solid ${isDark ? '#21262d' : '#e5e7eb'}`,
                fontFamily: 'var(--nagara-font-mono)',
              }}>{i + 1}</td>
              {row.map((cell, j) => (
                <td key={j} style={{
                  padding: '4px 12px',
                  borderRight: `1px solid ${isDark ? '#21262d' : '#e5e7eb'}`,
                  fontFamily: 'var(--nagara-font-mono)',
                  color: cell === null
                    ? (isDark ? '#484f58' : '#8c959f')
                    : (isDark ? '#c9d1d9' : '#1f2328'),
                  fontStyle: cell === null ? 'italic' : 'normal',
                  whiteSpace: 'nowrap',
                }}>
                  {cell === null ? 'null' : String(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.truncated && (
        <div style={{
          padding: '6px 12px', fontSize: 11,
          color: isDark ? '#8b949e' : '#656d76',
          background: isDark ? '#161b22' : '#f6f8fa',
          borderTop: `1px solid ${isDark ? '#21262d' : '#e5e7eb'}`,
        }}>
          Showing {data.rows.length} of {data.total_count} rows
        </div>
      )}
    </div>
  )
}
