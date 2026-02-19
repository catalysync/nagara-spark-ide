export interface Position {
  x: number
  y: number
}

export interface WorkbookNode {
  id: string
  type: 'dataset' | 'transform'
  name: string
  language: 'python' | 'sql'
  code: string
  save_as_dataset: boolean
  position: Position
}

export interface WorkbookEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
}

export interface Workbook {
  id: string
  name: string
  nodes: WorkbookNode[]
  edges: WorkbookEdge[]
  global_code: string
}

export interface DataFrameData {
  columns: string[]
  types: string[]
  rows: any[][]
  total_count: number
  truncated: boolean
}

export interface SchemaField {
  name: string
  type: string
  nullable: boolean
}

export interface NodeResult {
  status: 'success' | 'error' | 'running'
  stdout?: string
  stderr?: string
  result?: string | null
  dataframe?: DataFrameData | null
  schema?: SchemaField[]
  error?: string | null
  executionTime?: number
}

export interface ConsoleEntry {
  id: string
  code: string
  result?: NodeResult
  timestamp: number
}
