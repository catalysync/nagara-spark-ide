import React, { useState } from 'react'
import { Panel } from '@xyflow/react'
import { useTheme } from '../../providers/ThemeProvider'
import { useWorkbook } from '../../providers/WorkbookProvider'

interface GraphToolbarProps {
  onAddDataset: () => void
  onAddTransform: () => void
}

export default function GraphToolbar({ onAddDataset, onAddTransform }: GraphToolbarProps) {
  const { colorScheme } = useTheme()
  const { autoLayout, executeNode, state } = useWorkbook()
  const isDark = colorScheme === 'dark'

  const btnStyle: React.CSSProperties = {
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 500,
    border: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`,
    borderRadius: 6,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: isDark ? '#21262d' : '#ffffff',
    color: isDark ? '#c9d1d9' : '#1f2328',
    transition: 'background 0.1s',
  }

  const runAll = async () => {
    for (const node of state.workbook.nodes) {
      await executeNode(node.id)
    }
  }

  return (
    <Panel position="top-right" style={{ zIndex: 5 }}>
      <div style={{ display: 'flex', gap: 6, padding: 4, pointerEvents: 'all' }}>
        <button style={btnStyle} onClick={onAddDataset} title="Import Dataset">
          + Dataset
        </button>
        <button style={btnStyle} onClick={onAddTransform} title="New Transform">
          + Transform
        </button>
        <button style={btnStyle} onClick={autoLayout} title="Auto Layout">
          &#8862; Layout
        </button>
        <button
          style={{ ...btnStyle, background: isDark ? '#238636' : '#2da44e', color: '#fff', borderColor: 'transparent' }}
          onClick={runAll}
          title="Run All Nodes"
        >
          &#9654; Run All
        </button>
      </div>
    </Panel>
  )
}
