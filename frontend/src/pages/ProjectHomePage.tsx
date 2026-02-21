import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import type { Project } from '../types/project'
import type { Workbook } from '../types/workbook'
import type { Dataset } from '../types/dataset'
import type { Connection } from '../types/connection'
import * as projectsApi from '../api/projects'
import * as workbooksApi from '../api/workbookApi'
import * as datasetsApi from '../api/datasets'
import * as connectionsApi from '../api/connections'

// Inline workbook API using the new client
import { api } from '../api/client'

async function listWorkbooks(projectId: string): Promise<Workbook[]> {
  const res = await api.get<{ workbooks: Workbook[] }>(`/api/projects/${projectId}/workbooks`)
  return res.workbooks
}

async function createWorkbook(projectId: string, name: string): Promise<Workbook> {
  return api.post<Workbook>(`/api/projects/${projectId}/workbooks`, { name })
}

const TABS = [
  { key: 'workbooks', label: 'Workbooks' },
  { key: 'datasets', label: 'Datasets' },
  { key: 'connections', label: 'Connections' },
] as const

type TabKey = typeof TABS[number]['key']

export default function ProjectHomePage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [tab, setTab] = useState<TabKey>((searchParams.get('tab') as TabKey) || 'workbooks')
  const [workbooks, setWorkbooks] = useState<Workbook[]>([])
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [newWbName, setNewWbName] = useState('')
  const [showNewWb, setShowNewWb] = useState(false)
  const [showNewConn, setShowNewConn] = useState(false)
  const [newConn, setNewConn] = useState({ name: '', connector_type: 'postgresql', config: {} as Record<string, string> })

  useEffect(() => {
    if (!projectId) return
    projectsApi.getProject(projectId).then(setProject)
    listWorkbooks(projectId).then(setWorkbooks)
    datasetsApi.listDatasets(projectId).then(setDatasets)
    connectionsApi.listConnections(projectId).then(setConnections)
  }, [projectId])

  const switchTab = (t: TabKey) => {
    setTab(t)
    setSearchParams({ tab: t })
  }

  const handleCreateWb = async () => {
    if (!newWbName.trim() || !projectId) return
    const wb = await createWorkbook(projectId, newWbName.trim())
    navigate(`/projects/${projectId}/workbooks/${wb.id}`)
  }

  const handleCreateConn = async () => {
    if (!newConn.name.trim() || !projectId) return
    await connectionsApi.createConnection(projectId, newConn)
    setShowNewConn(false)
    setNewConn({ name: '', connector_type: 'postgresql', config: {} })
    connectionsApi.listConnections(projectId).then(setConnections)
  }

  if (!project) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading...</div>

  const CONNECTOR_CONFIGS: Record<string, string[]> = {
    postgresql: ['host', 'port', 'database', 'username', 'password'],
    kafka: ['bootstrap_servers'],
    file: ['path', 'format'],
    jdbc: ['url', 'driver', 'username', 'password'],
  }

  return (
    <div style={{ padding: 32, maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <button onClick={() => navigate('/projects')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>Projects</button>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>/</span>
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>{project.name}</h1>
        {project.description && <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>{project.description}</p>}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-default)', marginBottom: 20 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => switchTab(t.key)}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
              background: 'transparent',
              color: tab === t.key ? 'var(--text-primary)' : 'var(--text-muted)',
              fontSize: 13,
              fontWeight: tab === t.key ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Workbooks tab */}
      {tab === 'workbooks' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button onClick={() => setShowNewWb(true)} style={{ padding: '6px 14px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>+ New workbook</button>
          </div>
          {showNewWb && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, padding: 12, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 6 }}>
              <input
                value={newWbName}
                onChange={e => setNewWbName(e.target.value)}
                placeholder="Workbook name"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleCreateWb()}
                style={{ flex: 1, padding: '6px 10px', background: 'var(--bg-app)', border: '1px solid var(--border-default)', borderRadius: 4, color: 'var(--text-primary)', fontSize: 13 }}
              />
              <button onClick={handleCreateWb} style={{ padding: '6px 14px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 13, cursor: 'pointer' }}>Create</button>
              <button onClick={() => setShowNewWb(false)} style={{ padding: '6px 10px', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-default)', borderRadius: 4, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            </div>
          )}
          {workbooks.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>No workbooks yet. Create one to start analyzing data.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                  {['Name', 'Nodes', 'Last Modified'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {workbooks.map((wb: any) => (
                  <tr
                    key={wb.id}
                    onClick={() => navigate(`/projects/${projectId}/workbooks/${wb.id}`)}
                    style={{ borderBottom: '1px solid var(--border-default)', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px', fontSize: 14, fontWeight: 500 }}>{wb.name}</td>
                    <td style={{ padding: '12px', fontSize: 13, color: 'var(--text-secondary)' }}>{(wb.nodes || []).length}</td>
                    <td style={{ padding: '12px', fontSize: 12, color: 'var(--text-muted)' }}>{new Date(wb.updated_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Datasets tab */}
      {tab === 'datasets' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12, gap: 8 }}>
            <label style={{ padding: '6px 14px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
              Upload CSV
              <input type="file" accept=".csv" style={{ display: 'none' }} onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file || !projectId) return
                try {
                  await datasetsApi.uploadCsv(projectId, file, file.name.replace('.csv', ''))
                  datasetsApi.listDatasets(projectId).then(setDatasets)
                } catch (err: any) { alert(`Upload failed: ${err.message}`) }
                e.target.value = ''
              }} />
            </label>
          </div>
          {datasets.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>No datasets yet. Import data from a connection or upload a CSV.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                  {['Name', 'Source', 'Columns', 'Rows', 'Last Built'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {datasets.map(ds => (
                  <tr
                    key={ds.id}
                    onClick={() => navigate(`/projects/${projectId}/datasets/${ds.id}`)}
                    style={{ borderBottom: '1px solid var(--border-default)', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px', fontSize: 14, fontWeight: 500 }}>{ds.name}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 500,
                        background: ds.source_type === 'connection' ? 'rgba(45, 114, 210, 0.15)' : ds.source_type === 'csv_upload' ? 'rgba(95, 107, 124, 0.15)' : 'rgba(20, 184, 166, 0.15)',
                        color: ds.source_type === 'connection' ? '#4C90F0' : ds.source_type === 'csv_upload' ? '#8F99A8' : '#14B8A6',
                      }}>{ds.source_type}</span>
                    </td>
                    <td style={{ padding: '12px', fontSize: 13, color: 'var(--text-secondary)' }}>{ds.schema_info?.length || 0}</td>
                    <td style={{ padding: '12px', fontSize: 13, color: 'var(--text-secondary)' }}>{ds.row_count?.toLocaleString() ?? '-'}</td>
                    <td style={{ padding: '12px', fontSize: 12, color: 'var(--text-muted)' }}>{ds.last_built_at ? new Date(ds.last_built_at).toLocaleDateString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Connections tab */}
      {tab === 'connections' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button onClick={() => setShowNewConn(true)} style={{ padding: '6px 14px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>+ New connection</button>
          </div>
          {showNewConn && (
            <div style={{ padding: 16, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8, marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Name</label>
                  <input value={newConn.name} onChange={e => setNewConn({ ...newConn, name: e.target.value })} placeholder="My Database" style={{ width: '100%', padding: '6px 10px', background: 'var(--bg-app)', border: '1px solid var(--border-default)', borderRadius: 4, color: 'var(--text-primary)', fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Type</label>
                  <select value={newConn.connector_type} onChange={e => setNewConn({ ...newConn, connector_type: e.target.value, config: {} })} style={{ padding: '6px 10px', background: 'var(--bg-app)', border: '1px solid var(--border-default)', borderRadius: 4, color: 'var(--text-primary)', fontSize: 13 }}>
                    <option value="postgresql">PostgreSQL</option>
                    <option value="kafka">Kafka / Redpanda</option>
                    <option value="file">File (CSV/Parquet)</option>
                    <option value="jdbc">JDBC</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8, marginBottom: 12 }}>
                {(CONNECTOR_CONFIGS[newConn.connector_type] || []).map(field => (
                  <div key={field}>
                    <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{field}</label>
                    <input
                      type={field === 'password' ? 'password' : 'text'}
                      value={newConn.config[field] || ''}
                      onChange={e => setNewConn({ ...newConn, config: { ...newConn.config, [field]: e.target.value } })}
                      placeholder={field === 'port' ? '5432' : field === 'host' ? 'localhost' : ''}
                      style={{ width: '100%', padding: '6px 10px', background: 'var(--bg-app)', border: '1px solid var(--border-default)', borderRadius: 4, color: 'var(--text-primary)', fontSize: 13 }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleCreateConn} style={{ padding: '6px 14px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 13, cursor: 'pointer' }}>Create</button>
                <button onClick={() => setShowNewConn(false)} style={{ padding: '6px 10px', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-default)', borderRadius: 4, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          )}
          {connections.length === 0 && !showNewConn ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>No connections yet. Add one to import data from external sources.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                  {['Name', 'Type', 'Status', 'Last Tested'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {connections.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/projects/${projectId}/connections/${c.id}`)}
                    style={{ borderBottom: '1px solid var(--border-default)', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px', fontSize: 14, fontWeight: 500 }}>{c.name}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 500, background: 'rgba(45, 114, 210, 0.15)', color: '#4C90F0' }}>{c.connector_type}</span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        color: c.status === 'connected' ? '#238551' : c.status === 'error' ? '#CD4246' : 'var(--text-muted)',
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.status === 'connected' ? '#238551' : c.status === 'error' ? '#CD4246' : '#5F6B7C' }} />
                        {c.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: 12, color: 'var(--text-muted)' }}>{c.last_tested_at ? new Date(c.last_tested_at).toLocaleDateString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
