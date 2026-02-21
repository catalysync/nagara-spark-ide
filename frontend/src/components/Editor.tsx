import React, { useRef, useEffect } from 'react'
import MonacoEditor, { OnMount } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'

interface EditorProps {
  value: string
  onChange: (value: string) => void
  onRun: () => void
  isActive: boolean
  onFocus: () => void
  cellNumber: number
}

const PYSPARK_COMPLETIONS = [
  // SparkSession methods
  { label: 'spark.read', insertText: 'spark.read', detail: 'DataFrameReader' },
  { label: 'spark.sql', insertText: 'spark.sql(${1:"SELECT 1"})', detail: 'Execute SQL query', insertTextRules: 4 },
  { label: 'spark.createDataFrame', insertText: 'spark.createDataFrame(${1:data}, ${2:schema})', detail: 'Create DataFrame', insertTextRules: 4 },
  { label: 'spark.table', insertText: 'spark.table(${1:"table_name"})', detail: 'Load table', insertTextRules: 4 },
  { label: 'spark.range', insertText: 'spark.range(${1:10})', detail: 'Create range DataFrame', insertTextRules: 4 },
  { label: 'spark.read.csv', insertText: 'spark.read.csv(${1:"path"}, header=True, inferSchema=True)', detail: 'Read CSV', insertTextRules: 4 },
  { label: 'spark.read.json', insertText: 'spark.read.json(${1:"path"})', detail: 'Read JSON', insertTextRules: 4 },
  { label: 'spark.read.parquet', insertText: 'spark.read.parquet(${1:"path"})', detail: 'Read Parquet', insertTextRules: 4 },
  // DataFrame methods
  { label: '.show()', insertText: 'show(${1:20})', detail: 'Show rows' , insertTextRules: 4},
  { label: '.select()', insertText: 'select(${1:})', detail: 'Select columns', insertTextRules: 4 },
  { label: '.filter()', insertText: 'filter(${1:})', detail: 'Filter rows', insertTextRules: 4 },
  { label: '.where()', insertText: 'where(${1:})', detail: 'Filter rows (alias)', insertTextRules: 4 },
  { label: '.groupBy()', insertText: 'groupBy(${1:})', detail: 'Group by columns', insertTextRules: 4 },
  { label: '.agg()', insertText: 'agg(${1:})', detail: 'Aggregate', insertTextRules: 4 },
  { label: '.orderBy()', insertText: 'orderBy(${1:})', detail: 'Sort by columns', insertTextRules: 4 },
  { label: '.join()', insertText: 'join(${1:other}, ${2:on}, ${3:"inner"})', detail: 'Join DataFrames', insertTextRules: 4 },
  { label: '.withColumn()', insertText: 'withColumn(${1:"name"}, ${2:expr})', detail: 'Add/replace column', insertTextRules: 4 },
  { label: '.drop()', insertText: 'drop(${1:})', detail: 'Drop columns', insertTextRules: 4 },
  { label: '.distinct()', insertText: 'distinct()', detail: 'Distinct rows' },
  { label: '.count()', insertText: 'count()', detail: 'Count rows' },
  { label: '.collect()', insertText: 'collect()', detail: 'Collect to driver' },
  { label: '.toPandas()', insertText: 'toPandas()', detail: 'Convert to Pandas' },
  { label: '.printSchema()', insertText: 'printSchema()', detail: 'Print schema' },
  { label: '.describe()', insertText: 'describe()', detail: 'Summary statistics' },
  { label: '.cache()', insertText: 'cache()', detail: 'Cache DataFrame' },
  { label: '.limit()', insertText: 'limit(${1:10})', detail: 'Limit rows', insertTextRules: 4 },
  { label: '.alias()', insertText: 'alias(${1:"name"})', detail: 'Alias column/table', insertTextRules: 4 },
  // Functions
  { label: 'F.col', insertText: 'F.col(${1:"name"})', detail: 'Column reference', insertTextRules: 4 },
  { label: 'F.lit', insertText: 'F.lit(${1:value})', detail: 'Literal value', insertTextRules: 4 },
  { label: 'F.sum', insertText: 'F.sum(${1:"col"})', detail: 'Sum aggregation', insertTextRules: 4 },
  { label: 'F.avg', insertText: 'F.avg(${1:"col"})', detail: 'Average', insertTextRules: 4 },
  { label: 'F.count', insertText: 'F.count(${1:"col"})', detail: 'Count', insertTextRules: 4 },
  { label: 'F.max', insertText: 'F.max(${1:"col"})', detail: 'Max value', insertTextRules: 4 },
  { label: 'F.min', insertText: 'F.min(${1:"col"})', detail: 'Min value', insertTextRules: 4 },
  { label: 'F.when', insertText: 'F.when(${1:condition}, ${2:value})', detail: 'Conditional', insertTextRules: 4 },
  { label: 'F.concat', insertText: 'F.concat(${1:})', detail: 'Concatenate strings', insertTextRules: 4 },
  { label: 'F.split', insertText: 'F.split(${1:col}, ${2:pattern})', detail: 'Split string', insertTextRules: 4 },
  { label: 'F.explode', insertText: 'F.explode(${1:col})', detail: 'Explode array', insertTextRules: 4 },
  { label: 'F.window', insertText: 'F.window(${1:})', detail: 'Window function', insertTextRules: 4 },
  { label: 'F.row_number', insertText: 'F.row_number()', detail: 'Row number' },
  { label: 'F.rank', insertText: 'F.rank()', detail: 'Rank' },
  { label: 'F.dense_rank', insertText: 'F.dense_rank()', detail: 'Dense rank' },
  { label: 'F.current_date', insertText: 'F.current_date()', detail: 'Current date' },
  { label: 'F.current_timestamp', insertText: 'F.current_timestamp()', detail: 'Current timestamp' },
  // Window
  { label: 'Window.partitionBy', insertText: 'Window.partitionBy(${1:})', detail: 'Window partition', insertTextRules: 4 },
  { label: 'Window.orderBy', insertText: 'Window.orderBy(${1:})', detail: 'Window order', insertTextRules: 4 },
]

export default function Editor({ value, onChange, onRun, isActive, onFocus, cellNumber }: EditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor

    // Register PySpark completions
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

        // Get the text before cursor to detect context
        const lineContent = model.getLineContent(position.lineNumber)
        const textBeforeCursor = lineContent.substring(0, position.column - 1)

        const suggestions = PYSPARK_COMPLETIONS.map(item => ({
          label: item.label,
          kind: monaco.languages.CompletionItemKind.Method,
          insertText: item.insertText,
          insertTextRules: item.insertTextRules
            ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
            : undefined,
          detail: item.detail,
          range,
        }))

        return { suggestions }
      },
    })

    // Shift+Enter = Run
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
      onRun()
    })

    editor.focus()
  }

  useEffect(() => {
    if (isActive && editorRef.current) {
      editorRef.current.focus()
    }
  }, [isActive])

  return (
    <div
      className={`border rounded overflow-hidden ${isActive ? 'border-blue-500/50' : 'border-gray-700'}`}
      onClick={onFocus}
    >
      {/* Cell header */}
      <div className="flex items-center gap-2 px-3 py-1 bg-gray-800/50 border-b border-gray-700/50 text-xs text-gray-500">
        <span className="font-mono">In [{cellNumber}]</span>
        <span className="text-gray-700">|</span>
        <span>Shift+Enter to run</span>
      </div>
      <MonacoEditor
        height={Math.max(80, Math.min(400, value.split('\n').length * 20 + 20))}
        language="python"
        theme="vs-dark"
        value={value}
        onChange={(v) => onChange(v || '')}
        onMount={handleMount}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
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
          folding: false,
          glyphMargin: false,
          overviewRulerBorder: false,
          scrollbar: {
            verticalScrollbarSize: 6,
            horizontalScrollbarSize: 6,
          },
        }}
      />
    </div>
  )
}
