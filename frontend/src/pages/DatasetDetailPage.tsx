import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { Dataset, DatasetPreview } from '../types/dataset'
import * as datasetsApi from '../api/datasets'

export default function DatasetDetailPage() {
  const { projectId, datasetId } = useParams<{ projectId: string; datasetId: string }>()
  const navigate = useNavigate()
  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [preview, setPreview] = useState<DatasetPreview | null>(null)
  const [tab, setTab] = useState<'preview' | 'schema' | 'details'>('preview')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!projectId || !datasetId) return
    datasetsApi.getDataset(projectId, datasetId).then(ds => {
      setDataset(ds)
      setLoading(false)
    })
    datasetsApi.getDatasetPreview(projectId, datasetId).then(setPreview).catch(() => {})
  }, [projectId, datasetId])

  if (loading || !dataset) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading...</div>

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <button onClick={() => navigate(`/projects/${projectId}`)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>Project</button>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>/</span>
        <button onClick={() => navigate(`/projects/${projectId}?tab=datasets`)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>Datasets</button>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>/</span>
      </div>

      <h1 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 4px' }}>{dataset.name}</h1>
      <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
        <span style={{ padding: '2px 8px', borderRadius: 10, background: 'rgba(45, 114, 210, 0.15)', color: '#4C90F0' }}>{dataset.source_type}</span>
        {dataset.row_count != null && <span>{dataset.row_count.toLocaleString()} rows</span>}
        {dataset.schema_info && <span>{dataset.schema_info.length} columns</span>}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-default)', marginBottom: 20 }}>
        {(['preview', 'schema', 'details'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 20px', border: 'none',
            borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
            background: 'transparent',
            color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)',
            fontSize: 13, fontWeight: tab === t ? 600 : 400, cursor: 'pointer',
            textTransform: 'capitalize',
          }}>{t}</button>
        ))}
      </div>

      {/* Preview */}
      {tab === 'preview' && preview && (
        <div style={{ overflowX: 'auto', border: '1px solid var(--border-default)', borderRadius: 6 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface-alt)' }}>
                <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-default)', color: 'var(--text-muted)', fontSize: 11, textAlign: 'center', width: 40 }}>#</th>
                {preview.columns.map((col, i) => (
                  <th key={i} style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-default)', textAlign: 'left', whiteSpace: 'nowrap' }}>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{col}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 400 }}>{preview.types[i]}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-default)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '6px 10px', color: 'var(--text-muted)', textAlign: 'center', fontSize: 11 }}>{i + 1}</td>
                  {row.map((cell, j) => (
                    <td key={j} style={{ padding: '6px 10px', fontFamily: 'var(--nagara-font-mono, monospace)', whiteSpace: 'nowrap' }}>
                      {cell === null ? <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>null</span> : String(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {preview.truncated && (
            <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-surface-alt)', borderTop: '1px solid var(--border-default)' }}>
              Showing 100 of {preview.total_count.toLocaleString()} rows
            </div>
          )}
        </div>
      )}
      {tab === 'preview' && !preview && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No preview available. Dataset may not have been built yet.</div>
      )}

      {/* Schema */}
      {tab === 'schema' && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
              {['Column', 'Type', 'Nullable'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(dataset.schema_info || []).map((col, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border-default)' }}>
                <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 500, fontFamily: 'var(--nagara-font-mono, monospace)' }}>{col.name}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>{col.type}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-muted)' }}>{col.nullable ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Details */}
      {tab === 'details' && (
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '12px 20px', fontSize: 13 }}>
          <span style={{ color: 'var(--text-muted)' }}>Source Type</span>
          <span>{dataset.source_type}</span>
          <span style={{ color: 'var(--text-muted)' }}>Row Count</span>
          <span>{dataset.row_count?.toLocaleString() ?? 'Unknown'}</span>
          <span style={{ color: 'var(--text-muted)' }}>Columns</span>
          <span>{dataset.schema_info?.length ?? 0}</span>
          <span style={{ color: 'var(--text-muted)' }}>Created</span>
          <span>{new Date(dataset.created_at).toLocaleString()}</span>
          <span style={{ color: 'var(--text-muted)' }}>Last Built</span>
          <span>{dataset.last_built_at ? new Date(dataset.last_built_at).toLocaleString() : '-'}</span>
          {dataset.description && <>
            <span style={{ color: 'var(--text-muted)' }}>Description</span>
            <span>{dataset.description}</span>
          </>}
        </div>
      )}
    </div>
  )
}
