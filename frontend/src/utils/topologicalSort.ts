import type { WorkbookNode, WorkbookEdge } from '../types/workbook'

export function topologicalSort(nodes: WorkbookNode[], edges: WorkbookEdge[]): WorkbookNode[] {
  const inDegree = new Map<string, number>()
  const adj = new Map<string, string[]>()
  const nodeMap = new Map<string, WorkbookNode>()

  nodes.forEach((n) => {
    inDegree.set(n.id, 0)
    adj.set(n.id, [])
    nodeMap.set(n.id, n)
  })

  edges.forEach((e) => {
    if (adj.has(e.source) && inDegree.has(e.target)) {
      adj.get(e.source)!.push(e.target)
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1)
    }
  })

  const queue: string[] = []
  inDegree.forEach((deg, id) => {
    if (deg === 0) queue.push(id)
  })

  const sorted: WorkbookNode[] = []
  while (queue.length > 0) {
    queue.sort()
    const id = queue.shift()!
    sorted.push(nodeMap.get(id)!)
    for (const child of adj.get(id) || []) {
      const newDeg = (inDegree.get(child) || 1) - 1
      inDegree.set(child, newDeg)
      if (newDeg === 0) queue.push(child)
    }
  }

  // Append any nodes not in the sorted result (disconnected)
  nodes.forEach((n) => {
    if (!sorted.find((s) => s.id === n.id)) sorted.push(n)
  })

  return sorted
}
