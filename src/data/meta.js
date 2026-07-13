// Capa de datos de la Meta Marketing API (vía /api/meta de Vercel).
import { useCallback, useEffect, useRef, useState } from 'react'
import { getAppKey } from './live.js'

const ENDPOINT = '/api/meta'

async function getMeta(range) {
  const k = getAppKey()
  const res = await fetch(`${ENDPOINT}?range=${range}`, {
    headers: { accept: 'application/json', ...(k ? { 'x-app-key': k } : {}) },
  })
  if (res.status === 401) throw new Error('UNAUTHORIZED')
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('La API /api/meta no está disponible en este deploy.')
  }
  if (!res.ok) {
    const extra = data.metaMensaje ? ` — ${data.metaMensaje}` : ''
    throw new Error((data.error || `HTTP ${res.status}`) + extra + (data.pista ? ` (${data.pista})` : ''))
  }
  return data
}

export function useMetaAds(range = '30d') {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const alive = useRef(true)

  const refresh = useCallback(async (r) => {
    setLoading(true)
    setError('')
    try {
      const d = await getMeta(r)
      if (alive.current) setData(d)
    } catch (e) {
      if (alive.current) setError(String(e.message || e))
    } finally {
      if (alive.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    alive.current = true
    refresh(range)
    return () => { alive.current = false }
  }, [refresh, range])

  return { data, loading, error, refresh }
}
