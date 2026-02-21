import { api } from './client'
import { getApiBase } from '../utils/apiBase'
import type { Dataset, DatasetPreview } from '../types/dataset'

export async function listDatasets(projectId: string): Promise<Dataset[]> {
  const res = await api.get<{ datasets: Dataset[] }>(`/api/projects/${projectId}/datasets`)
  return res.datasets
}

export async function getDataset(projectId: string, datasetId: string): Promise<Dataset> {
  return api.get<Dataset>(`/api/projects/${projectId}/datasets/${datasetId}`)
}

export async function getDatasetPreview(projectId: string, datasetId: string): Promise<DatasetPreview> {
  return api.get<DatasetPreview>(`/api/projects/${projectId}/datasets/${datasetId}/preview`)
}

export async function getDatasetSchema(projectId: string, datasetId: string): Promise<any[]> {
  const res = await api.get<{ schema: any[] }>(`/api/projects/${projectId}/datasets/${datasetId}/schema`)
  return res.schema
}

export async function deleteDataset(projectId: string, datasetId: string): Promise<void> {
  await api.del(`/api/projects/${projectId}/datasets/${datasetId}`)
}

export async function uploadCsv(projectId: string, file: File, name: string): Promise<Dataset> {
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
