import React, { useState } from 'react'
import { useTheme } from '../providers/ThemeProvider'
import { useWorkbook } from '../providers/WorkbookProvider'
import { topologicalSort } from '../utils/topologicalSort'

export default function ContentsSidebar() {
  const { colorScheme } = useTheme()
  const { state, dispatch } = useWorkbook()
  const isDark = colorScheme === 'dark'
  const sortedNodes = topologicalSort(state.workbook.nodes, state.workbook.edges)

  return (
    <div style={{
      width: 240,
      height: '100%',
      background: isDark ? '#0d1117' : '#f6f8fa',
      borderRight: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`,
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        fontSize: 12,
        fontWeight: 600,
        color: isDark ? '#8b949e' : '#656d76',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        borderBottom: `1px solid ${isDark ? '#21262d' : '#d0d7de'}`,
      }}>
        Contents
      </div>

      {/* Node list */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
        {sortedNodes.length === 0 ? (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: isDark ? '#484f58' : '#8c959f', fontSize: 13 }}>
            No nodes yet. Click "Add Dataset" or "Add Transform" on the canvas to get started.
          </div>
        ) : (
          sortedNodes.map((node) => {
            const isSelected = state.selectedNodeId === node.id
            const isExecuting = state.executingNodes.has(node.id)
            const result = state.nodeResults[node.id]

            return (
              <div
                key={node.id}
                onClick={() => dispatch({ type: 'SELECT_NODE', id: node.id })}
                style={{
                  padding: '8px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: isSelected ? (isDark ? '#1f2937' : '#e2e8f0') : 'transparent',
                  borderLeft: isSelected ? '3px solid #58a6ff' : '3px solid transparent',
                  transition: 'background 0.1s',
                }}
              >
                {/* Icon */}
                <div style={{
                  width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700,
                  background: node.type === 'dataset'
                    ? (isDark ? '#1f3a5f' : '#bfdbfe')
                    : (isDark ? '#2d1f3f' : '#e9d5ff'),
                  color: node.type === 'dataset'
                    ? (isDark ? '#58a6ff' : '#2563eb')
                    : (isDark ? '#bc8cff' : '#7c3aed'),
                }}>
                  {node.type === 'dataset' ? 'D' : node.language === 'sql' ? 'S' : 'P'}
                </div>

                {/* Name + status */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13,
                    color: isDark ? '#c9d1d9' : '#1f2328',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {node.name}
                  </div>
                </div>

                {/* Status indicator */}
                {isExecuting && (
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#d29922',
                    animation: 'pulse 1s infinite',
                    flexShrink: 0,
                  }} />
                )}
                {!isExecuting && result?.status === 'success' && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3fb950', flexShrink: 0 }} />
                )}
                {!isExecuting && result?.status === 'error' && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f85149', flexShrink: 0 }} />
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
