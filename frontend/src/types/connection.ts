export interface Connection {
  id: string
  project_id: string
  name: string
  connector_type: string
  config: Record<string, any>
  status: string
  last_tested_at: string | null
  created_at: string
  updated_at: string
}

export interface ConnectionTestResult {
  status: string
  message: string
  details: Record<string, any>
}

export interface Resource {
  name: string
  type: string
}
