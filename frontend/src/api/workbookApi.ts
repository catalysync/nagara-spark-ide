import { api } from './client'
import { getApiBase } from '../utils/apiBase'
import type { NodeResult, SchemaField } from '../types/workbook'

export async function checkHealth(): Promise<{ status: string; spark: boolean }> {
  return api.get('/api/health')
}

export async function executeNode(workbookId: string, nodeId: string, preview = false): Promise<NodeResult> {
  return api.post(`/api/workbooks/${workbookId}/nodes/${nodeId}/execute`, { preview })
}

export async function getNodeSchema(workbookId: string, nodeId: string): Promise<{ schema: SchemaField[] | null }> {
  return api.get(`/api/workbooks/${workbookId}/nodes/${nodeId}/schema`)
}

export async function executeConsole(workbookId: string, code: string): Promise<NodeResult> {
  return api.post(`/api/workbooks/${workbookId}/console/execute`, { code })
}

export async function uploadCsv(projectId: string, file: File, name: string): Promise<any> {
  const base = getApiBase()
  const formData = new FormData()
  formData.append('file', file)
  formData.append('name', name)
  const res = await fetch(`${base}/api/projects/${projectId}/datasets/upload-csv`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) throw new Error('Upload failed')
  return res.json()
}
