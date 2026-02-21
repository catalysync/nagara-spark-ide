import React from 'react'

interface DataTableProps {
  data: {
    columns: string[]
    types: string[]
    rows: any[][]
    total_count: number
    truncated: boolean
  }
}

export default function DataTable({ data }: DataTableProps) {
  return (
    <div className="overflow-auto max-h-[400px] border border-gray-700 rounded">
      <table className="w-full text-sm text-left">
        <thead className="sticky top-0 bg-gray-800 text-gray-300 text-xs uppercase">
          <tr>
            <th className="px-3 py-2 border-b border-r border-gray-700 text-gray-500 w-10">#</th>
            {data.columns.map((col, i) => (
              <th key={i} className="px-3 py-2 border-b border-r border-gray-700 whitespace-nowrap">
                <div>{col}</div>
                <div className="text-gray-500 font-normal text-[10px]">{data.types[i]}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, i) => (
            <tr key={i} className="hover:bg-gray-800/50 border-b border-gray-800">
              <td className="px-3 py-1.5 text-gray-500 border-r border-gray-800 text-xs">{i + 1}</td>
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-1.5 border-r border-gray-800 text-gray-300 whitespace-nowrap font-mono text-xs">
                  {cell === null ? <span className="text-gray-600 italic">null</span> : String(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.truncated && (
        <div className="text-xs text-gray-500 px-3 py-1.5 bg-gray-800/50">
          Showing 100 of {data.total_count} rows
        </div>
      )}
    </div>
  )
}
