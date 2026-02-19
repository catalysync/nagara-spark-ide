import dagre from 'dagre'
import type { WorkbookNode, WorkbookEdge } from '../types/workbook'

const NODE_WIDTH = 220
const NODE_HEIGHT = 80

export function getLayoutedNodes(
  nodes: WorkbookNode[],
  edges: WorkbookEdge[],
  direction: 'TB' | 'LR' = 'TB'
): WorkbookNode[] {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: direction, nodesep: 80, ranksep: 120 })

  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  })

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target)
  })

  dagre.layout(g)

  return nodes.map((node) => {
    const pos = g.node(node.id)
    return {
      ...node,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    }
  })
}
