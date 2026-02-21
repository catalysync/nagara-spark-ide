import React from 'react'
import DataTable from './DataTable'

export interface CellResult {
  cellId: string
  status: 'success' | 'error' | 'running'
  stdout?: string
  stderr?: string
  result?: string | null
  dataframe?: any
  error?: string | null
  executionTime?: number
}

interface ResultsPanelProps {
  results: CellResult[]
  activeCellId: string | null
}

export default function ResultsPanel({ results, activeCellId }: ResultsPanelProps) {
  // Show result for active cell, or the most recent result
  const activeResult = activeCellId
    ? results.find(r => r.cellId === activeCellId)
    : results[results.length - 1]

  if (!activeResult) {
    return (
      <div className="h-full flex items-center justify-center text-gray-600 text-sm">
        Run a cell to see results here (Shift+Enter)
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-3 space-y-2">
      {/* Status bar */}
      <div className="flex items-center gap-2 text-xs">
        <span className={`inline-block w-2 h-2 rounded-full ${
          activeResult.status === 'running' ? 'bg-yellow-500 animate-pulse' :
          activeResult.status === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`} />
        <span className="text-gray-400">
          {activeResult.status === 'running' ? 'Running...' :
           activeResult.status === 'success' ? 'Success' : 'Error'}
        </span>
        {activeResult.executionTime != null && (
          <span className="text-gray-600">({(activeResult.executionTime / 1000).toFixed(2)}s)</span>
        )}
      </div>

      {/* DataFrame table */}
      {activeResult.dataframe && (
        <DataTable data={activeResult.dataframe} />
      )}

      {/* Text result */}
      {activeResult.result && !activeResult.dataframe && (
        <pre className="text-sm text-green-400 font-mono bg-gray-900/50 p-2 rounded overflow-auto">
          {activeResult.result}
        </pre>
      )}

      {/* Stdout */}
      {activeResult.stdout && (
        <pre className="text-sm text-gray-300 font-mono bg-gray-900/50 p-2 rounded overflow-auto whitespace-pre-wrap">
          {activeResult.stdout}
        </pre>
      )}

      {/* Stderr */}
      {activeResult.stderr && (
        <pre className="text-sm text-yellow-400 font-mono bg-gray-900/50 p-2 rounded overflow-auto whitespace-pre-wrap">
          {activeResult.stderr}
        </pre>
      )}

      {/* Error */}
      {activeResult.error && (
        <pre className="text-sm text-red-400 font-mono bg-red-950/30 p-2 rounded overflow-auto whitespace-pre-wrap border border-red-900/50">
          {activeResult.error}
        </pre>
      )}
    </div>
  )
}
