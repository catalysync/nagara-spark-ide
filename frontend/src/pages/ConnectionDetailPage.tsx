import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { Connection, ConnectionTestResult, Resource } from '../types/connection'
import * as connectionsApi from '../api/connections'

export default function ConnectionDetailPage() {
  const { projectId, connectionId } = useParams<{ projectId: string; connectionId: string }>()
  const navigate = useNavigate()
  const [connection, setConnection] = useState<Connection | null>(null)
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null)
  const [testing, setTesting] = useState(false)
  const [resources, setResources] = useState<Resource[]>([])
  const [loadingResources, setLoadingResources] = useState(false)
  const [importing, setImporting] = useState<string | null>(null)
  const [importName, setImportName] = useState('')

  useEffect(() => {
    if (!projectId || !connectionId) return
    connectionsApi.getConnection(projectId, connectionId).then(setConnection)
  }, [projectId, connectionId])

  const handleTest = async () => {
    if (!projectId || !connectionId) return
    setTesting(true)
    setTestResult(null)
    try {
      const result = await connectionsApi.testConnection(projectId, connectionId)
      setTestResult(result)
      connectionsApi.getConnection(projectId, connectionId).then(setConnection)
    } catch (e: any) {
      setTestResult({ status: 'error', message: e.message, details: {} })
    }
    setTesting(false)
  }

  const handleListResources = async () => {
    if (!projectId || !connectionId) return
    setLoadingResources(true)
    try {
      const res = await connectionsApi.listResources(projectId, connectionId)
      setResources(res)
    } catch {}
    setLoadingResources(false)
  }

  const handleImport = async (resourceName: string) => {
    if (!projectId || !connectionId || !importName.trim()) return
    try {
      await connectionsApi.importResource(projectId, connectionId, { resource_name: resourceName, dataset_name: importName.trim() })
      setImporting(null)
      setImportName('')
      navigate(`/projects/${projectId}?tab=datasets`)
    } catch (e: any) {
      alert('Import failed: ' + e.message)
    }
  }

  if (!connection) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading...</div>

  return (
    <div style={{ padding: 32, maxWidth: 1000, margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <button onClick={() => navigate(`/projects/${projectId}`)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>Project</button>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>/</span>
        <button onClick={() => navigate(`/projects/${projectId}?tab=connections`)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>Connections</button>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>/</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>{connection.name}</h1>
        <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 500, background: 'rgba(45, 114, 210, 0.15)', color: '#4C90F0' }}>{connection.connector_type}</span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12,
          color: connection.status === 'connected' ? '#238551' : connection.status === 'error' ? '#CD4246' : 'var(--text-muted)',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: connection.status === 'connected' ? '#238551' : connection.status === 'error' ? '#CD4246' : '#5F6B7C' }} />
          {connection.status}
        </span>
      </div>

      {/* Config (masked) */}
      <div style={{ padding: 16, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8, marginBottom: 20 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>Configuration</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px 16px', fontSize: 13 }}>
          {Object.entries(connection.config).map(([key, value]) => (
            <React.Fragment key={key}>
              <span style={{ color: 'var(--text-muted)' }}>{key}</span>
              <span style={{ fontFamily: 'var(--nagara-font-mono, monospace)' }}>{String(value)}</span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={handleTest} disabled={testing} style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', opacity: testing ? 0.6 : 1 }}>
          {testing ? 'Testing...' : 'Test Connection'}
        </button>
        <button onClick={handleListResources} disabled={loadingResources} style={{ padding: '8px 16px', background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-default)', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
          {loadingResources ? 'Loading...' : 'Browse Resources'}
        </button>
      </div>

      {/* Test result */}
      {testResult && (
        <div style={{
          padding: 12,
          borderRadius: 6,
          marginBottom: 16,
          background: testResult.status === 'connected' ? 'rgba(35, 133, 81, 0.1)' : 'rgba(205, 66, 70, 0.1)',
          border: `1px solid ${testResult.status === 'connected' ? 'rgba(35, 133, 81, 0.3)' : 'rgba(205, 66, 70, 0.3)'}`,
          fontSize: 13,
          color: testResult.status === 'connected' ? '#238551' : '#CD4246',
        }}>
          {testResult.message}
        </div>
      )}

      {/* Resources */}
      {resources.length > 0 && (
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Available Resources</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                {['Name', 'Type', 'Action'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resources.map(r => (
                <tr key={r.name} style={{ borderBottom: '1px solid var(--border-default)' }}>
                  <td style={{ padding: '10px 12px', fontSize: 13, fontFamily: 'var(--nagara-font-mono, monospace)' }}>{r.name}</td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-muted)' }}>{r.type}</td>
                  <td style={{ padding: '10px 12px' }}>
                    {importing === r.name ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input
                          value={importName}
                          onChange={e => setImportName(e.target.value)}
                          placeholder="Dataset name"
                          autoFocus
                          onKeyDown={e => e.key === 'Enter' && handleImport(r.name)}
                          style={{ padding: '4px 8px', background: 'var(--bg-app)', border: '1px solid var(--border-default)', borderRadius: 4, color: 'var(--text-primary)', fontSize: 12, width: 160 }}
                        />
                        <button onClick={() => handleImport(r.name)} style={{ padding: '4px 10px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>Import</button>
                        <button onClick={() => { setImporting(null); setImportName('') }} style={{ padding: '4px 8px', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-default)', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => { setImporting(r.name); setImportName(r.name) }} style={{ padding: '4px 10px', background: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>Import</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
