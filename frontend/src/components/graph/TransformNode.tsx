import React, { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

function TransformNode({ data, selected }: NodeProps) {
  const d = data as any
  const status = d.resultStatus
  const statusClass = status === 'running' ? 'executing' : status === 'error' ? 'error' : status === 'success' ? 'success' : ''
  const isPython = d.language === 'python'

  return (
    <div className={`nagara-node nagara-node-transform ${selected ? 'selected' : ''} ${statusClass}`}>
      <Handle type="target" position={Position.Top} style={{ background: '#58a6ff', width: 10, height: 10 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 24, height: 24, borderRadius: 4,
          background: isPython ? 'rgba(59, 130, 246, 0.2)' : 'rgba(234, 179, 8, 0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700,
          color: isPython ? '#60a5fa' : '#eab308',
        }}>
          {isPython ? 'PY' : 'SQL'}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#c9d1d9' }}>{d.label}</div>
          <div style={{ fontSize: 11, color: '#8b949e' }}>
            {isPython ? 'Python' : 'SQL'} Transform
          </div>
        </div>
      </div>
      {d.saveAsDataset && (
        <div style={{ marginTop: 6, fontSize: 10, color: '#58a6ff', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>&#128190;</span> Saved as Dataset
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: '#58a6ff', width: 10, height: 10 }} />
    </div>
  )
}

export default memo(TransformNode)
