/**
 * api.js — All backend calls in one place.
 * The Vite dev proxy forwards /api → http://localhost:5000/api
 * In production the VITE_API_BASE env var points to the Render URL.
 */

const BASE = import.meta.env.VITE_API_BASE ?? ''

export async function analyzeDocket({ docketId, maxComments = 250, threshold = 0.82 }) {
  const res = await fetch(`${BASE}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      docket_id: docketId,
      max_comments: maxComments,
      threshold,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

export async function searchDockets(searchTerm = '') {
  const params = new URLSearchParams({ search: searchTerm, page_size: 8 })
  const res = await fetch(`${BASE}/api/dockets?${params}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() // { dockets: [...] }
}

export async function fetchDemoManifest() {
  // Served as a static file from backend/data/ — only available when running locally
  // Falls back gracefully if not found
  try {
    const res = await fetch(`${BASE}/api/demo_manifest`)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}
