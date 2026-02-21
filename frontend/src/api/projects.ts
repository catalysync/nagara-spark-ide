import { api } from './client'
import type { Project } from '../types/project'

export async function listProjects(): Promise<Project[]> {
  const res = await api.get<{ projects: Project[] }>('/api/projects')
  return res.projects
}

export async function getProject(id: string): Promise<Project> {
  return api.get<Project>(`/api/projects/${id}`)
}

export async function createProject(name: string, description: string = ''): Promise<Project> {
  return api.post<Project>('/api/projects', { name, description })
}

export async function updateProject(id: string, data: Partial<Pick<Project, 'name' | 'description'>>): Promise<Project> {
  return api.put<Project>(`/api/projects/${id}`, data)
}

export async function deleteProject(id: string): Promise<void> {
  await api.del(`/api/projects/${id}`)
}
