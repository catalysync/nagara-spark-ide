import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Project } from '../types/project'
import * as projectsApi from '../api/projects'

export default function ProjectListPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const navigate = useNavigate()

  const load = () => {
    projectsApi.listProjects().then(p => { setProjects(p); setLoading(false) }).catch(() => setLoading(false))
  }
  useEffect(load, [])

  const handleCreate = async () => {
    if (!newName.trim()) return
    const p = await projectsApi.createProject(newName.trim(), newDesc.trim())
    setShowNew(false)
    setNewName('')
    setNewDesc('')
    navigate(`/projects/${p.id}`)
  }

  return (
    <div style={{ padding: 32, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Projects</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>Organize your workbooks, datasets, and connections</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          style={{
            padding: '8px 16px',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          + New project
        </button>
      </div>

      {showNew && (
        <div style={{
          padding: 16,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 8,
          marginBottom: 16,
          display: 'flex',
          gap: 12,
          alignItems: 'flex-end',
        }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Name</label>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="My Project"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              style={{
                width: '100%',
                padding: '6px 10px',
                background: 'var(--bg-app)',
                border: '1px solid var(--border-default)',
                borderRadius: 4,
                color: 'var(--text-primary)',
                fontSize: 13,
              }}
            />
          </div>
          <div style={{ flex: 2 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Description</label>
            <input
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="Optional description"
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              style={{
                width: '100%',
                padding: '6px 10px',
                background: 'var(--bg-app)',
                border: '1px solid var(--border-default)',
                borderRadius: 4,
                color: 'var(--text-primary)',
                fontSize: 13,
              }}
            />
          </div>
          <button onClick={handleCreate} style={{ padding: '6px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>Create</button>
          <button onClick={() => setShowNew(false)} style={{ padding: '6px 12px', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-default)', borderRadius: 4, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
      ) : projects.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>No projects yet</div>
          <div style={{ fontSize: 14 }}>Create your first project to get started</div>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
              {['Name', 'Workbooks', 'Datasets', 'Connections', 'Last Modified'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projects.map(p => (
              <tr
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}`)}
                style={{ borderBottom: '1px solid var(--border-muted, var(--border-default))', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '12px 12px' }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{p.name}</div>
                  {p.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{p.description}</div>}
                </td>
                <td style={{ padding: '12px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>{p.workbook_count}</td>
                <td style={{ padding: '12px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>{p.dataset_count}</td>
                <td style={{ padding: '12px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>{p.connection_count}</td>
                <td style={{ padding: '12px 12px', fontSize: 12, color: 'var(--text-muted)' }}>{new Date(p.updated_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
