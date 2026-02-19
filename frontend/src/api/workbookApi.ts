import { API_BASE } from '../utils/apiBase'
import type { Workbook, NodeResult, SchemaField } from '../types/workbook'

async function fetchJson(url: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  return res.json()
}

export async function checkHealth(): Promise<{ status: string; spark: boolean }> {
  return fetchJson('/api/health')
}

export async function fetchWorkbook(): Promise<Workbook> {
  return fetchJson('/api/workbook')
}

export async function saveWorkbook(workbook: Workbook): Promise<void> {
  await fetchJson('/api/workbook', {
    method: 'PUT',
    body: JSON.stringify(workbook),
  })
}

export async function executeNode(nodeId: string, preview = false): Promise<NodeResult> {
  return fetchJson(`/api/workbook/nodes/${nodeId}/execute`, {
    method: 'POST',
    body: JSON.stringify({ preview }),
  })
}

export async function getNodeSchema(nodeId: string): Promise<{ schema: SchemaField[] | null }> {
  return fetchJson(`/api/workbook/nodes/${nodeId}/schema`)
}

export async function executeConsole(code: string): Promise<NodeResult> {
  return fetchJson('/api/console/execute', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
}

export async function uploadCsv(file: File, name: string): Promise<any> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('name', name)
  const res = await fetch(`${API_BASE}/api/workbook/upload-csv`, {
    method: 'POST',
    body: formData,
  })
  return res.json()
}
