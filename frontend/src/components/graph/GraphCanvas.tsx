import React, { useCallback, useMemo, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  applyNodeChanges,
  MarkerType,
} from '@xyflow/react'
import DatasetNode from './DatasetNode'
import TransformNode from './TransformNode'
import GraphToolbar from './GraphToolbar'
import { useWorkbook } from '../../providers/WorkbookProvider'
import { useTheme } from '../../providers/ThemeProvider'

const nodeTypes = {
  dataset: DatasetNode,
  transform: TransformNode,
}

interface GraphCanvasProps {
  onAddDataset: () => void
  onAddTransform: () => void
}

export default function GraphCanvas({ onAddDataset, onAddTransform }: GraphCanvasProps) {
  const { state, dispatch } = useWorkbook()
  const { colorScheme } = useTheme()
  const isDark = colorScheme === 'dark'

  const nodes: Node[] = useMemo(() =>
    state.workbook.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      selected: n.id === state.selectedNodeId,
      data: {
        label: n.name,
        language: n.language,
        saveAsDataset: n.save_as_dataset,
        resultStatus: state.nodeResults[n.id]?.status,
      },
    })),
    [state.workbook.nodes, state.selectedNodeId, state.nodeResults]
  )

  const edges: Edge[] = useMemo(() =>
    state.workbook.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      animated: state.executingNodes.has(e.target),
      markerEnd: { type: MarkerType.ArrowClosed, color: '#58a6ff' },
    })),
    [state.workbook.edges, state.executingNodes]
  )

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    // Handle position changes from dragging
    const positionChanges: Record<string, { x: number; y: number }> = {}
    for (const change of changes) {
      if (change.type === 'position' && change.position) {
        positionChanges[change.id] = change.position
      }
    }
    if (Object.keys(positionChanges).length > 0) {
      dispatch({ type: 'UPDATE_POSITIONS', positions: positionChanges })
    }
  }, [dispatch])

  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return
    // Prevent self-connections
    if (connection.source === connection.target) return
    // Prevent duplicate edges
    if (state.workbook.edges.find(e => e.source === connection.source && e.target === connection.target)) return
    // Simple cycle check: target shouldn't be an ancestor of source
    const isAncestor = (nodeId: string, targetId: string, visited = new Set<string>()): boolean => {
      if (visited.has(nodeId)) return false
      visited.add(nodeId)
      for (const edge of state.workbook.edges) {
        if (edge.target === nodeId) {
          if (edge.source === targetId) return true
          if (isAncestor(edge.source, targetId, visited)) return true
        }
      }
      return false
    }
    if (isAncestor(connection.source, connection.target)) return

    dispatch({
      type: 'ADD_EDGE',
      edge: {
        id: `edge-${connection.source}-${connection.target}`,
        source: connection.source,
        target: connection.target,
      },
    })
  }, [dispatch, state.workbook.edges])

  const onNodeClick = useCallback((_: any, node: Node) => {
    dispatch({ type: 'SELECT_NODE', id: node.id })
  }, [dispatch])

  const onPaneClick = useCallback(() => {
    dispatch({ type: 'SELECT_NODE', id: null })
  }, [dispatch])

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        minZoom={0.2}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { strokeWidth: 2 },
        }}
        colorMode={isDark ? 'dark' : 'light'}
      >
        <Background gap={20} size={1} color={isDark ? '#21262d' : '#e5e7eb'} />
        <Controls />
        <MiniMap
          nodeColor={(node) => node.type === 'dataset' ? '#1f6feb' : '#8b5cf6'}
          maskColor={isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)'}
        />
        <GraphToolbar onAddDataset={onAddDataset} onAddTransform={onAddTransform} />
      </ReactFlow>
    </div>
  )
}
