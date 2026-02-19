import React, { useState, useRef, useEffect } from 'react'
import MonacoEditor, { type OnMount } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { useWorkbook } from '../../providers/WorkbookProvider'
import { useTheme } from '../../providers/ThemeProvider'
import DataPreviewTable from '../shared/DataPreviewTable'

export default function ConsolePanel() {
  const { state, executeConsoleCode } = useWorkbook()
  const { colorScheme } = useTheme()
  const isDark = colorScheme === 'dark'
  const [input, setInput] = useState('')
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [state.consoleHistory])

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
      const code = editor.getValue().trim()
      if (code) {
        executeConsoleCode(code)
        setInput('')
      }
    })
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Output */}
      <div ref={outputRef} style={{ flex: 1, overflow: 'auto', padding: 8 }} className="console-output">
        {state.consoleHistory.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', color: isDark ? '#484f58' : '#8c959f', fontSize: 12 }}>
            Interactive console. All node outputs are available as variables.
            <br />Shift+Enter to execute.
          </div>
        ) : (
          state.consoleHistory.map((entry) => (
            <div key={entry.id} style={{ marginBottom: 8 }}>
              {/* Input */}
              <pre style={{
                fontFamily: 'var(--nagara-font-mono)', fontSize: 12,
                color: isDark ? '#58a6ff' : '#0969da',
                margin: 0, whiteSpace: 'pre-wrap',
              }}>
                {'>>> '}{entry.code}
              </pre>
              {/* Result */}
              {entry.result?.dataframe && (
                <div style={{ marginTop: 4 }}>
                  <DataPreviewTable data={entry.result.dataframe} />
                </div>
              )}
              {entry.result?.result && !entry.result.dataframe && (
                <pre style={{
                  fontFamily: 'var(--nagara-font-mono)', fontSize: 12,
                  color: isDark ? '#3fb950' : '#1a7f37', margin: 0, whiteSpace: 'pre-wrap',
                }}>{entry.result.result}</pre>
              )}
              {entry.result?.stdout && (
                <pre style={{
                  fontFamily: 'var(--nagara-font-mono)', fontSize: 12,
                  color: isDark ? '#c9d1d9' : '#1f2328', margin: 0, whiteSpace: 'pre-wrap',
                }}>{entry.result.stdout}</pre>
              )}
              {entry.result?.error && (
                <pre style={{
                  fontFamily: 'var(--nagara-font-mono)', fontSize: 12,
                  color: '#f85149', margin: 0, whiteSpace: 'pre-wrap',
                }}>{entry.result.error}</pre>
              )}
            </div>
          ))
        )}
      </div>

      {/* Input editor */}
      <div style={{
        borderTop: `1px solid ${isDark ? '#21262d' : '#e5e7eb'}`,
        height: 80, flexShrink: 0,
      }}>
        <MonacoEditor
          language="python"
          theme={isDark ? 'vs-dark' : 'vs'}
          value={input}
          onChange={(v) => setInput(v || '')}
          onMount={handleMount}
          options={{
            minimap: { enabled: false },
            fontSize: 12,
            fontFamily: "'JetBrains Mono', Menlo, monospace",
            lineNumbers: 'off',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 8 },
            overviewRulerBorder: false,
            scrollbar: { verticalScrollbarSize: 4 },
            renderLineHighlight: 'none',
          }}
        />
      </div>
    </div>
  )
}
