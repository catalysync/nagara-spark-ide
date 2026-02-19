import React, { useState, useRef, useEffect, useCallback } from 'react'
import GraphCanvas from './graph/GraphCanvas'
import NodeEditorPanel from './editor/NodeEditorPanel'
import RightSidebar from './sidebar/RightSidebar'
import ImportDatasetDialog from './dialogs/ImportDatasetDialog'
import NewTransformDialog from './dialogs/NewTransformDialog'
import { useWorkbook } from '../providers/WorkbookProvider'
import { useTheme } from '../providers/ThemeProvider'

export default function MainContent() {
  const { state, dispatch } = useWorkbook()
  const { colorScheme } = useTheme()
  const isDark = colorScheme === 'dark'

  const [graphHeight, setGraphHeight] = useState(65)
  const dragging = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [transformDialogOpen, setTransformDialogOpen] = useState(false)

  const hasSelectedNode = state.selectedNodeId !== null
  const sidebarWidth = state.rightSidebarOpen ? 350 : 0

  const handleMouseDown = useCallback(() => {
    dragging.current = true
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const pct = ((e.clientY - rect.top) / rect.height) * 100
      setGraphHeight(Math.max(20, Math.min(80, pct)))
    }
    const onUp = () => {
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  return (
    <>
      {/* Center area: Graph + Editor (takes remaining width) */}
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: sidebarWidth,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Graph canvas */}
        <div style={{
          width: '100%',
          height: hasSelectedNode ? `${graphHeight}%` : '100%',
          position: 'relative',
        }}>
          <GraphCanvas
            onAddDataset={() => setImportDialogOpen(true)}
            onAddTransform={() => setTransformDialogOpen(true)}
          />
        </div>

        {/* Resize handle */}
        {hasSelectedNode && (
          <div className="resize-handle" onMouseDown={handleMouseDown}>
            <div className="resize-handle-dot" />
          </div>
        )}

        {/* Node editor panel */}
        {hasSelectedNode && (
          <div style={{ width: '100%', height: `${100 - graphHeight}%`, overflow: 'hidden' }}>
            <NodeEditorPanel />
          </div>
        )}
      </div>

      {/* Right sidebar (fixed right) */}
      {state.rightSidebarOpen && (
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: sidebarWidth }}>
          <RightSidebar />
        </div>
      )}

      {/* Toggle button when sidebar is hidden */}
      {!state.rightSidebarOpen && (
        <button
          onClick={() => dispatch({ type: 'TOGGLE_RIGHT_SIDEBAR' })}
          style={{
            position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
            background: isDark ? '#21262d' : '#f6f8fa',
            border: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`,
            borderRight: 'none', borderRadius: '6px 0 0 6px',
            padding: '8px 4px', cursor: 'pointer',
            color: isDark ? '#8b949e' : '#656d76', fontSize: 12,
            zIndex: 10,
          }}
          title="Show sidebar"
        >
          &#9664;
        </button>
      )}

      {/* Dialogs */}
      <ImportDatasetDialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} />
      <NewTransformDialog open={transformDialogOpen} onClose={() => setTransformDialogOpen(false)} />
    </>
  )
}
