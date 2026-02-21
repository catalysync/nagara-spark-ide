import React from 'react'

interface ToolbarProps {
  onRunCell: () => void
  onRunAll: () => void
  onAddCell: () => void
  onClearResults: () => void
  sparkReady: boolean
  running: boolean
}

export default function Toolbar({ onRunCell, onRunAll, onAddCell, onClearResults, sparkReady, running }: ToolbarProps) {
  return (
    <div className="h-12 bg-gray-900 border-b border-gray-700 flex items-center px-4 gap-3 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-4">
        <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-red-600 rounded flex items-center justify-center text-white text-xs font-bold">
          N
        </div>
        <span className="text-gray-200 font-semibold text-sm">Nagara Spark IDE</span>
      </div>

      <div className="h-6 w-px bg-gray-700" />

      {/* Run button */}
      <button
        onClick={onRunCell}
        disabled={!sparkReady || running}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 hover:bg-green-600 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
          <path d="M4 2l10 6-10 6V2z"/>
        </svg>
        {running ? 'Running...' : 'Run Cell'}
      </button>

      <button
        onClick={onRunAll}
        disabled={!sparkReady || running}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:text-gray-500 text-gray-200 text-sm rounded transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
          <path d="M2 2l6 6-6 6V2zm6 0l6 6-6 6V2z"/>
        </svg>
        Run All
      </button>

      <button
        onClick={onAddCell}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 16 16">
          <path d="M8 3v10M3 8h10"/>
        </svg>
        Add Cell
      </button>

      <div className="flex-1" />

      <button
        onClick={onClearResults}
        className="px-3 py-1.5 text-gray-400 hover:text-gray-200 text-sm transition-colors"
      >
        Clear Output
      </button>

      {/* Spark status */}
      <div className="flex items-center gap-1.5 text-xs">
        <span className={`w-2 h-2 rounded-full ${sparkReady ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
        <span className="text-gray-400">{sparkReady ? 'Spark Ready' : 'Connecting...'}</span>
      </div>
    </div>
  )
}
