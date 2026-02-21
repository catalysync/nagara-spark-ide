import { api } from './client'
import type { Connection, ConnectionTestResult, Resource } from '../types/connection'

export async function listConnections(projectId: string): Promise<Connection[]> {
  const res = await api.get<{ connections: Connection[] }>(`/api/projects/${projectId}/connections`)
  return res.connections
}

export async function getConnection(projectId: string, connectionId: string): Promise<Connection> {
  return api.get<Connection>(`/api/projects/${projectId}/connections/${connectionId}`)
}

export async function createConnection(projectId: string, data: { name: string; connector_type: string; config: Record<string, any> }): Promise<Connection> {
  return api.post<Connection>(`/api/projects/${projectId}/connections`, data)
}

export async function updateConnection(projectId: string, connectionId: string, data: Partial<{ name: string; config: Record<string, any> }>): Promise<Connection> {
  return api.put<Connection>(`/api/projects/${projectId}/connections/${connectionId}`, data)
}

export async function deleteConnection(projectId: string, connectionId: string): Promise<void> {
  await api.del(`/api/projects/${projectId}/connections/${connectionId}`)
}

export async function testConnection(projectId: string, connectionId: string): Promise<ConnectionTestResult> {
  return api.post<ConnectionTestResult>(`/api/projects/${projectId}/connections/${connectionId}/test`)
}

export async function listResources(projectId: string, connectionId: string): Promise<Resource[]> {
  const res = await api.get<{ resources: Resource[] }>(`/api/projects/${projectId}/connections/${connectionId}/resources`)
  return res.resources
}

export async function importResource(projectId: string, connectionId: string, data: { resource_name: string; dataset_name: string; description?: string }): Promise<any> {
  return api.post(`/api/projects/${projectId}/connections/${connectionId}/import`, data)
}
