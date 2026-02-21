import React, { createContext, useContext, useReducer, useCallback, useEffect, type ReactNode } from 'react'
import type { Workbook, WorkbookNode, WorkbookEdge, NodeResult, ConsoleEntry } from '../types/workbook'
import { api } from '../api/client'
import { getLayoutedNodes } from '../utils/autoLayout'

interface WorkbookState {
  workbook: Workbook
  selectedNodeId: string | null
  nodeResults: Record<string, NodeResult>
  consoleHistory: ConsoleEntry[]
  sparkReady: boolean
  executingNodes: Set<string>
  rightSidebarOpen: boolean
  rightSidebarTab: 'console' | 'globalCode'
  bottomPanelTab: 'code' | 'preview' | 'schema'
}

type Action =
  | { type: 'SET_WORKBOOK'; workbook: Workbook }
  | { type: 'ADD_NODE'; node: WorkbookNode }
  | { type: 'UPDATE_NODE'; id: string; updates: Partial<WorkbookNode> }
  | { type: 'REMOVE_NODE'; id: string }
  | { type: 'ADD_EDGE'; edge: WorkbookEdge }
  | { type: 'REMOVE_EDGE'; id: string }
  | { type: 'SELECT_NODE'; id: string | null }
  | { type: 'SET_NODE_RESULT'; nodeId: string; result: NodeResult }
  | { type: 'SET_EXECUTING'; nodeId: string; executing: boolean }
  | { type: 'UPDATE_POSITIONS'; positions: Record<string, { x: number; y: number }> }
  | { type: 'SET_GLOBAL_CODE'; code: string }
  | { type: 'ADD_CONSOLE_ENTRY'; entry: ConsoleEntry }
  | { type: 'SET_SPARK_READY'; ready: boolean }
  | { type: 'TOGGLE_RIGHT_SIDEBAR' }
  | { type: 'SET_RIGHT_TAB'; tab: 'console' | 'globalCode' }
  | { type: 'SET_BOTTOM_TAB'; tab: 'code' | 'preview' | 'schema' }

const initialState: WorkbookState = {
  workbook: {
    id: 'default',
    name: 'Untitled Workbook',
    nodes: [],
    edges: [],
    global_code: 'from pyspark.sql import functions as F, types as T, Window\nimport pandas as pd\n',
  },
  selectedNodeId: null,
  nodeResults: {},
  consoleHistory: [],
  sparkReady: false,
  executingNodes: new Set(),
  rightSidebarOpen: true,
  rightSidebarTab: 'console',
  bottomPanelTab: 'code',
}

function reducer(state: WorkbookState, action: Action): WorkbookState {
  switch (action.type) {
    case 'SET_WORKBOOK':
      return { ...state, workbook: action.workbook }

    case 'ADD_NODE':
      return {
        ...state,
        workbook: { ...state.workbook, nodes: [...state.workbook.nodes, action.node] },
      }

    case 'UPDATE_NODE':
      return {
        ...state,
        workbook: {
          ...state.workbook,
          nodes: state.workbook.nodes.map((n) =>
            n.id === action.id ? { ...n, ...action.updates } : n
          ),
        },
      }

    case 'REMOVE_NODE':
      return {
        ...state,
        workbook: {
          ...state.workbook,
          nodes: state.workbook.nodes.filter((n) => n.id !== action.id),
          edges: state.workbook.edges.filter((e) => e.source !== action.id && e.target !== action.id),
        },
        selectedNodeId: state.selectedNodeId === action.id ? null : state.selectedNodeId,
      }

    case 'ADD_EDGE':
      return {
        ...state,
        workbook: { ...state.workbook, edges: [...state.workbook.edges, action.edge] },
      }

    case 'REMOVE_EDGE':
      return {
        ...state,
        workbook: {
          ...state.workbook,
          edges: state.workbook.edges.filter((e) => e.id !== action.id),
        },
      }

    case 'SELECT_NODE':
      return { ...state, selectedNodeId: action.id, bottomPanelTab: 'code' }

    case 'SET_NODE_RESULT':
      return {
        ...state,
        nodeResults: { ...state.nodeResults, [action.nodeId]: action.result },
      }

    case 'SET_EXECUTING': {
      const next = new Set(state.executingNodes)
      if (action.executing) next.add(action.nodeId)
      else next.delete(action.nodeId)
      return { ...state, executingNodes: next }
    }

    case 'UPDATE_POSITIONS':
      return {
        ...state,
        workbook: {
          ...state.workbook,
          nodes: state.workbook.nodes.map((n) =>
            action.positions[n.id] ? { ...n, position: action.positions[n.id] } : n
          ),
        },
      }

    case 'SET_GLOBAL_CODE':
      return {
        ...state,
        workbook: { ...state.workbook, global_code: action.code },
      }

    case 'ADD_CONSOLE_ENTRY':
      return {
        ...state,
        consoleHistory: [...state.consoleHistory, action.entry],
      }

    case 'SET_SPARK_READY':
      return { ...state, sparkReady: action.ready }

    case 'TOGGLE_RIGHT_SIDEBAR':
      return { ...state, rightSidebarOpen: !state.rightSidebarOpen }

    case 'SET_RIGHT_TAB':
      return { ...state, rightSidebarTab: action.tab }

    case 'SET_BOTTOM_TAB':
      return { ...state, bottomPanelTab: action.tab }

    default:
      return state
  }
}

interface WorkbookContextValue {
  state: WorkbookState
  dispatch: React.Dispatch<Action>
  executeNode: (nodeId: string, preview?: boolean) => Promise<void>
  executeConsoleCode: (code: string) => Promise<void>
  saveWorkbook: () => Promise<void>
  autoLayout: () => void
  projectId?: string
  workbookId?: string
}

const WorkbookContext = createContext<WorkbookContextValue | null>(null)

export function useWorkbook() {
  const ctx = useContext(WorkbookContext)
  if (!ctx) throw new Error('useWorkbook must be used within WorkbookProvider')
  return ctx
}

interface WorkbookProviderProps {
  children: ReactNode
  projectId?: string
  workbookId?: string
}

export function WorkbookProvider({ children, projectId, workbookId }: WorkbookProviderProps) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Load workbook from API on mount
  useEffect(() => {
    if (projectId && workbookId) {
      // New DB-backed API
      api.get<any>(`/api/projects/${projectId}/workbooks/${workbookId}`).then((wb) => {
        dispatch({ type: 'SET_WORKBOOK', workbook: wb })
      }).catch(() => {})
    }
  }, [projectId, workbookId])

  // Health check polling
  useEffect(() => {
    const check = () => {
      api.get<any>('/api/health').then((h) => {
        dispatch({ type: 'SET_SPARK_READY', ready: h.spark })
      }).catch(() => {
        dispatch({ type: 'SET_SPARK_READY', ready: false })
      })
    }
    check()
    const interval = setInterval(check, 5000)
    return () => clearInterval(interval)
  }, [])

  const executeNode = useCallback(async (nodeId: string, preview = false) => {
    dispatch({ type: 'SET_EXECUTING', nodeId, executing: true })
    dispatch({ type: 'SET_NODE_RESULT', nodeId, result: { status: 'running' } })
    const start = Date.now()
    try {
      const wbId = workbookId || state.workbook.id
      const result = await api.post<any>(`/api/workbooks/${wbId}/nodes/${nodeId}/execute`, { preview })
      dispatch({
        type: 'SET_NODE_RESULT',
        nodeId,
        result: { ...result, executionTime: Date.now() - start } as NodeResult,
      })
    } catch (err: any) {
      dispatch({
        type: 'SET_NODE_RESULT',
        nodeId,
        result: { status: 'error', error: err.message, executionTime: Date.now() - start },
      })
    } finally {
      dispatch({ type: 'SET_EXECUTING', nodeId, executing: false })
    }
  }, [workbookId, state.workbook.id])

  const executeConsoleCode = useCallback(async (code: string) => {
    const entry: ConsoleEntry = {
      id: Math.random().toString(36).slice(2),
      code,
      timestamp: Date.now(),
    }
    dispatch({ type: 'ADD_CONSOLE_ENTRY', entry: { ...entry, result: { status: 'running' } } })
    try {
      const wbId = workbookId || state.workbook.id
      const result = await api.post<any>(`/api/workbooks/${wbId}/console/execute`, { code })
      dispatch({
        type: 'ADD_CONSOLE_ENTRY',
        entry: { ...entry, result: result as NodeResult },
      })
    } catch (err: any) {
      dispatch({
        type: 'ADD_CONSOLE_ENTRY',
        entry: { ...entry, result: { status: 'error', error: err.message } },
      })
    }
  }, [workbookId, state.workbook.id])

  const saveWb = useCallback(async () => {
    if (projectId && workbookId) {
      await api.put(`/api/projects/${projectId}/workbooks/${workbookId}`, {
        name: state.workbook.name,
        global_code: state.workbook.global_code,
        nodes: state.workbook.nodes,
        edges: state.workbook.edges,
      })
    }
  }, [projectId, workbookId, state.workbook])

  const autoLayout = useCallback(() => {
    const layouted = getLayoutedNodes(state.workbook.nodes, state.workbook.edges)
    const positions: Record<string, { x: number; y: number }> = {}
    layouted.forEach((n) => { positions[n.id] = n.position })
    dispatch({ type: 'UPDATE_POSITIONS', positions })
  }, [state.workbook.nodes, state.workbook.edges])

  // Auto-save on changes (debounced)
  useEffect(() => {
    if (!projectId || !workbookId) return
    const timer = setTimeout(() => {
      if (state.workbook.nodes.length > 0 || state.workbook.global_code !== initialState.workbook.global_code) {
        api.put(`/api/projects/${projectId}/workbooks/${workbookId}`, {
          name: state.workbook.name,
          global_code: state.workbook.global_code,
          nodes: state.workbook.nodes,
          edges: state.workbook.edges,
        }).catch(() => {})
      }
    }, 2000)
    return () => clearTimeout(timer)
  }, [projectId, workbookId, state.workbook])

  return (
    <WorkbookContext.Provider value={{ state, dispatch, executeNode, executeConsoleCode, saveWorkbook: saveWb, autoLayout, projectId, workbookId }}>
      {children}
    </WorkbookContext.Provider>
  )
}
