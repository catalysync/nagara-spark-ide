import React, { useRef, useCallback } from 'react'
import MonacoEditor, { type OnMount } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { useWorkbook } from '../../providers/WorkbookProvider'
import { useTheme } from '../../providers/ThemeProvider'
import type { WorkbookNode } from '../../types/workbook'

const PYSPARK_COMPLETIONS = [
  { label: 'spark.read', insertText: 'spark.read', detail: 'DataFrameReader' },
  { label: 'spark.sql', insertText: 'spark.sql(${1:"SELECT 1"})', detail: 'Execute SQL query', snippet: true },
  { label: 'spark.createDataFrame', insertText: 'spark.createDataFrame(${1:data}, ${2:schema})', detail: 'Create DataFrame', snippet: true },
  { label: 'spark.table', insertText: 'spark.table(${1:"table"})', detail: 'Load table', snippet: true },
  { label: 'spark.range', insertText: 'spark.range(${1:10})', detail: 'Create range DataFrame', snippet: true },
  { label: 'spark.read.csv', insertText: 'spark.read.csv(${1:"path"}, header=True, inferSchema=True)', detail: 'Read CSV', snippet: true },
  { label: 'spark.read.json', insertText: 'spark.read.json(${1:"path"})', detail: 'Read JSON', snippet: true },
  { label: 'spark.read.parquet', insertText: 'spark.read.parquet(${1:"path"})', detail: 'Read Parquet', snippet: true },
  { label: '.select()', insertText: 'select(${1:})', detail: 'Select columns', snippet: true },
  { label: '.filter()', insertText: 'filter(${1:})', detail: 'Filter rows', snippet: true },
  { label: '.where()', insertText: 'where(${1:})', detail: 'Filter rows', snippet: true },
  { label: '.groupBy()', insertText: 'groupBy(${1:})', detail: 'Group by', snippet: true },
  { label: '.agg()', insertText: 'agg(${1:})', detail: 'Aggregate', snippet: true },
  { label: '.orderBy()', insertText: 'orderBy(${1:})', detail: 'Sort', snippet: true },
  { label: '.join()', insertText: 'join(${1:other}, ${2:on}, ${3:"inner"})', detail: 'Join', snippet: true },
  { label: '.withColumn()', insertText: 'withColumn(${1:"name"}, ${2:expr})', detail: 'Add column', snippet: true },
  { label: '.drop()', insertText: 'drop(${1:})', detail: 'Drop columns', snippet: true },
  { label: '.distinct()', insertText: 'distinct()', detail: 'Distinct rows' },
  { label: '.count()', insertText: 'count()', detail: 'Count rows' },
  { label: '.show()', insertText: 'show(${1:20})', detail: 'Show rows', snippet: true },
  { label: '.printSchema()', insertText: 'printSchema()', detail: 'Print schema' },
  { label: '.limit()', insertText: 'limit(${1:10})', detail: 'Limit rows', snippet: true },
  { label: '.cache()', insertText: 'cache()', detail: 'Cache DataFrame' },
  { label: '.toPandas()', insertText: 'toPandas()', detail: 'Convert to Pandas' },
  { label: 'F.col', insertText: 'F.col(${1:"name"})', detail: 'Column ref', snippet: true },
  { label: 'F.lit', insertText: 'F.lit(${1:value})', detail: 'Literal', snippet: true },
  { label: 'F.sum', insertText: 'F.sum(${1:"col"})', detail: 'Sum', snippet: true },
  { label: 'F.avg', insertText: 'F.avg(${1:"col"})', detail: 'Average', snippet: true },
  { label: 'F.count', insertText: 'F.count(${1:"col"})', detail: 'Count', snippet: true },
  { label: 'F.max', insertText: 'F.max(${1:"col"})', detail: 'Max', snippet: true },
  { label: 'F.min', insertText: 'F.min(${1:"col"})', detail: 'Min', snippet: true },
  { label: 'F.when', insertText: 'F.when(${1:cond}, ${2:val})', detail: 'Conditional', snippet: true },
  { label: 'F.explode', insertText: 'F.explode(${1:col})', detail: 'Explode array', snippet: true },
  { label: 'F.row_number', insertText: 'F.row_number()', detail: 'Row number' },
  { label: 'F.rank', insertText: 'F.rank()', detail: 'Rank' },
  { label: 'Window.partitionBy', insertText: 'Window.partitionBy(${1:})', detail: 'Window partition', snippet: true },
  { label: 'Window.orderBy', insertText: 'Window.orderBy(${1:})', detail: 'Window order', snippet: true },
]

interface CodeTabProps {
  node: WorkbookNode
}

export default function CodeTab({ node }: CodeTabProps) {
  const { dispatch, executeNode, state } = useWorkbook()
  const { colorScheme } = useTheme()
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)

  // Show inputs above editor
  const inputs = state.workbook.edges
    .filter((e) => e.target === node.id)
    .map((e) => state.workbook.nodes.find((n) => n.id === e.source))
    .filter(Boolean)

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor

    // Register PySpark completions for Python
    monaco.languages.registerCompletionItemProvider('python', {
      triggerCharacters: ['.', ' '],
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position)
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        }
        return {
          suggestions: PYSPARK_COMPLETIONS.map((item) => ({
            label: item.label,
            kind: monaco.languages.CompletionItemKind.Method,
            insertText: item.insertText,
            insertTextRules: item.snippet ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet : undefined,
            detail: item.detail,
            range,
          })),
        }
      },
    })

    // Shift+Enter = Run
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
      executeNode(node.id)
    })
  }

  const isDark = colorScheme === 'dark'

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Inputs bar */}
      {inputs.length > 0 && (
        <div style={{
          padding: '6px 16px',
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 11, color: isDark ? '#8b949e' : '#656d76',
          borderBottom: `1px solid ${isDark ? '#21262d' : '#f0f0f0'}`,
          flexShrink: 0,
        }}>
          <span>Inputs:</span>
          {inputs.map((inp) => (
            <span key={inp!.id} style={{
              padding: '2px 8px', borderRadius: 4, fontSize: 11,
              background: isDark ? '#1f3a5f' : '#dbeafe',
              color: isDark ? '#58a6ff' : '#2563eb',
            }}>
              {inp!.name}
            </span>
          ))}
        </div>
      )}

      {/* Hint */}
      <div style={{
        padding: '4px 16px', fontSize: 11,
        color: isDark ? '#484f58' : '#8c959f',
        borderBottom: `1px solid ${isDark ? '#21262d' : '#f0f0f0'}`,
        flexShrink: 0,
      }}>
        {node.type === 'transform'
          ? `Shift+Enter to run | Input variables: ${inputs.map(i => i!.name.replace(/[ -]/g, '_')).join(', ') || 'none'}`
          : 'Shift+Enter to run | Write code that produces a DataFrame'
        }
      </div>

      {/* Monaco editor */}
      <div style={{ flex: 1 }} className="node-editor-monaco">
        <MonacoEditor
          language={node.language === 'sql' ? 'sql' : 'python'}
          theme={isDark ? 'vs-dark' : 'vs'}
          value={node.code}
          onChange={(v) => dispatch({ type: 'UPDATE_NODE', id: node.id, updates: { code: v || '' } })}
          onMount={handleMount}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, monospace",
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            wordWrap: 'on',
            padding: { top: 8, bottom: 8 },
            renderLineHighlight: 'line',
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            snippetSuggestions: 'top',
            folding: true,
            glyphMargin: false,
            overviewRulerBorder: false,
            scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
          }}
        />
      </div>
    </div>
  )
}
