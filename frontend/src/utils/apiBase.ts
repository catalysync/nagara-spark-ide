export function getApiBase(): string {
  const host = window.location.hostname
  const match = host.match(/^(.+)-(\d+)(\.app\.github\.dev)$/)
  if (match) {
    return `https://${match[1]}-8000${match[3]}`
  }
  return ''
}

export const API_BASE = getApiBase()
