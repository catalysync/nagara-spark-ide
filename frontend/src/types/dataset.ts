export interface Dataset {
  id: string
  project_id: string
  name: string
  description: string
  source_type: string
  source_config: Record<string, any>
  schema_info: Array<{ name: string; type: string; nullable: boolean }>
  row_count: number | null
  file_path: string | null
  workbook_id: string | null
  node_id: string | null
  connection_id: string | null
  created_at: string
  updated_at: string
  last_built_at: string | null
}

export interface DatasetPreview {
  columns: string[]
  types: string[]
  rows: any[][]
  total_count: number
  truncated: boolean
}
