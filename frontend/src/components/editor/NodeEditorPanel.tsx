import React, { useState, useCallback } from 'react'
import { useWorkbook } from '../../providers/WorkbookProvider'
import { useTheme } from '../../providers/ThemeProvider'
import CodeTab from './CodeTab'
import PreviewTab from './PreviewTab'
import SchemaTab from './SchemaTab'

export default function NodeEditorPanel() {
  const { state, dispatch, executeNode } = useWorkbook()
  const { colorScheme } = useTheme()
  const isDark = colorScheme === 'dark'

  const node = state.workbook.nodes.find((n) => n.id === state.selectedNodeId)
  if (!node) return null

  const result = state.nodeResults[node.id]
  const isExecuting = state.executingNodes.has(node.id)
  const tabs = ['code', 'preview', 'schema'] as const

  const handleRun = () => executeNode(node.id)
  const handlePreview = () => executeNode(node.id, true)

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: isDark ? '#0d1117' : '#ffffff',
      borderTop: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 16px',
        gap: 12,
        borderBottom: `1px solid ${isDark ? '#21262d' : '#e5e7eb'}`,
        flexShrink: 0,
      }}>
        {/* Node name (editable) */}
        <input
          value={node.name}
          onChange={(e) => dispatch({ type: 'UPDATE_NODE', id: node.id, updates: { name: e.target.value } })}
          style={{
            background: 'transparent', border: 'none', color: isDark ? '#c9d1d9' : '#1f2328',
            fontSize: 14, fontWeight: 600, outline: 'none', width: 180,
          }}
        />

        {/* Language selector (only for transforms) */}
        {node.type === 'transform' && (
          <select
            value={node.language}
            onChange={(e) => dispatch({ type: 'UPDATE_NODE', id: node.id, updates: { language: e.target.value as any } })}
            style={{
              background: isDark ? '#21262d' : '#f6f8fa',
              color: isDark ? '#c9d1d9' : '#1f2328',
              border: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`,
              borderRadius: 4, padding: '2px 8px', fontSize: 12,
            }}
          >
            <option value="python">Python</option>
            <option value="sql">SQL</option>
          </select>
        )}

        {/* Save as Dataset toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: isDark ? '#8b949e' : '#656d76', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={node.save_as_dataset}
            onChange={(e) => dispatch({ type: 'UPDATE_NODE', id: node.id, updates: { save_as_dataset: e.target.checked } })}
          />
          Save as Dataset
        </label>

        <div style={{ flex: 1 }} />

        {/* Run / Preview */}
        <button
          onClick={handlePreview}
          disabled={isExecuting}
          style={{
            padding: '4px 12px', fontSize: 12, borderRadius: 4, cursor: 'pointer',
            background: isDark ? '#21262d' : '#f6f8fa',
            color: isDark ? '#c9d1d9' : '#1f2328',
            border: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`,
          }}
        >
          Preview
        </button>
        <button
          onClick={handleRun}
          disabled={isExecuting}
          style={{
            padding: '4px 12px', fontSize: 12, borderRadius: 4, cursor: 'pointer',
            background: '#238636', color: '#fff', border: 'none',
            opacity: isExecuting ? 0.6 : 1,
          }}
        >
          {isExecuting ? 'Running...' : '\u25B6 Run'}
        </button>

        {/* Close */}
        <button
          onClick={() => dispatch({ type: 'SELECT_NODE', id: null })}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: isDark ? '#8b949e' : '#656d76', fontSize: 16, padding: '2px 6px',
          }}
        >
          &#10005;
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 0,
        borderBottom: `1px solid ${isDark ? '#21262d' : '#e5e7eb'}`,
        flexShrink: 0,
      }}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => dispatch({ type: 'SET_BOTTOM_TAB', tab })}
            style={{
              padding: '8px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer',
              background: 'transparent', border: 'none',
              borderBottom: state.bottomPanelTab === tab ? '2px solid #58a6ff' : '2px solid transparent',
              color: state.bottomPanelTab === tab
                ? (isDark ? '#c9d1d9' : '#1f2328')
                : (isDark ? '#8b949e' : '#656d76'),
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}

        {/* Status */}
        {result && (
          <div style={{ marginLeft: 'auto', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: result.status === 'running' ? '#d29922' : result.status === 'success' ? '#3fb950' : '#f85149',
            }} />
            <span style={{ color: isDark ? '#8b949e' : '#656d76' }}>
              {result.status === 'running' ? 'Running...' : result.status}
              {result.executionTime != null && ` (${(result.executionTime / 1000).toFixed(2)}s)`}
            </span>
          </div>
        )}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {state.bottomPanelTab === 'code' && <CodeTab node={node} />}
        {state.bottomPanelTab === 'preview' && <PreviewTab nodeId={node.id} />}
        {state.bottomPanelTab === 'schema' && <SchemaTab nodeId={node.id} />}
      </div>
    </div>
  )
}
