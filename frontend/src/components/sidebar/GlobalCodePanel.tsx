import React from 'react'
import MonacoEditor from '@monaco-editor/react'
import { useWorkbook } from '../../providers/WorkbookProvider'
import { useTheme } from '../../providers/ThemeProvider'

export default function GlobalCodePanel() {
  const { state, dispatch } = useWorkbook()
  const { colorScheme } = useTheme()
  const isDark = colorScheme === 'dark'

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '8px 12px', fontSize: 11,
        color: isDark ? '#484f58' : '#8c959f',
        borderBottom: `1px solid ${isDark ? '#21262d' : '#e5e7eb'}`,
        flexShrink: 0,
      }}>
        Global imports and functions available in all transforms
      </div>
      <div style={{ flex: 1 }}>
        <MonacoEditor
          language="python"
          theme={isDark ? 'vs-dark' : 'vs'}
          value={state.workbook.global_code}
          onChange={(v) => dispatch({ type: 'SET_GLOBAL_CODE', code: v || '' })}
          options={{
            minimap: { enabled: false },
            fontSize: 12,
            fontFamily: "'JetBrains Mono', Menlo, monospace",
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            padding: { top: 8, bottom: 8 },
            overviewRulerBorder: false,
            scrollbar: { verticalScrollbarSize: 4 },
          }}
        />
      </div>
    </div>
  )
}
