export function getApiBase(): string {
  // Always use same origin — Vite proxies /api to the backend
  return ''
}

export const API_BASE = getApiBase()
