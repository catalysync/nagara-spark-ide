import React, { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

function DatasetNode({ data, selected }: NodeProps) {
  const d = data as any
  const status = d.resultStatus
  const statusClass = status === 'running' ? 'executing' : status === 'error' ? 'error' : status === 'success' ? 'success' : ''

  return (
    <div className={`nagara-node nagara-node-dataset ${selected ? 'selected' : ''} ${statusClass}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 24, height: 24, borderRadius: 4,
          background: 'rgba(88, 166, 255, 0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, color: '#58a6ff',
        }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <ellipse cx="8" cy="4" rx="7" ry="3" />
            <path d="M1 4v4c0 1.66 3.13 3 7 3s7-1.34 7-3V4" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M1 8v4c0 1.66 3.13 3 7 3s7-1.34 7-3V8" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#c9d1d9' }}>{d.label}</div>
          <div style={{ fontSize: 11, color: '#8b949e' }}>Dataset</div>
        </div>
      </div>
      {d.saveAsDataset && (
        <div style={{ marginTop: 6, fontSize: 10, color: '#58a6ff', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>&#128190;</span> Saved
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: '#58a6ff', width: 10, height: 10 }} />
    </div>
  )
}

export default memo(DatasetNode)
