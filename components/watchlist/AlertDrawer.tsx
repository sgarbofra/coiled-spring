'use client'

import { useEffect, useState } from 'react'

type Alert = {
  id: string
  alertType: string
  field: string
  operator: string
  value: string | number | boolean | null
  isEnabled: boolean
  createdAt: string
}

type Props = {
  watchlistId: string
  itemId: string
  open: boolean
  onClose: () => void
}

export default function AlertDrawer({ watchlistId, itemId, open, onClose }: Props) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    alertType: 'PRICE',
    field: 'ivRank',
    operator: '>',
    value: '',
  })

  useEffect(() => {
    if (!open) return
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `/api/watchlists/${watchlistId}/items/${itemId}/alerts`
        )
        const json = await res.json()
        if (!res.ok || !json.ok) throw new Error(json.error || 'Failed to load alerts')
        setAlerts(json.alerts || [])
      } catch (e: any) {
        setError(e.message || 'Failed to load alerts')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [open, watchlistId, itemId])

  const createAlert = async () => {
    setCreating(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/watchlists/${watchlistId}/items/${itemId}/alerts`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        }
      )
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || 'Failed to create alert')
      setAlerts((prev) => [json.alert, ...prev])
      setForm({ alertType: 'PRICE', field: 'ivRank', operator: '>', value: '' })
    } catch (e: any) {
      setError(e.message || 'Failed to create alert')
    } finally {
      setCreating(false)
    }
  }

  const toggleAlert = async (alertId: string, isEnabled: boolean) => {
    const res = await fetch(
      `/api/watchlists/${watchlistId}/items/${itemId}/alerts/${alertId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: !isEnabled }),
      }
    )
    const json = await res.json()
    if (res.ok && json.ok) {
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? json.alert : a)))
    }
  }

  const deleteAlert = async (alertId: string) => {
    const res = await fetch(
      `/api/watchlists/${watchlistId}/items/${itemId}/alerts/${alertId}`,
      { method: 'DELETE' }
    )
    const json = await res.json()
    if (res.ok && json.ok) {
      setAlerts((prev) => prev.filter((a) => a.id !== alertId))
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="h-full w-full max-w-lg bg-white p-4 shadow-xl">
        <div className="flex items-center justify-between border-b pb-3">
          <h2 className="text-lg font-semibold">Alerts</h2>
          <button onClick={onClose}>Close</button>
        </div>

        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input
              className="border p-2"
              value={form.field}
              onChange={(e) => setForm((f) => ({ ...f, field: e.target.value }))}
              placeholder="field"
            />
            <input
              className="border p-2"
              value={form.operator}
              onChange={(e) => setForm((f) => ({ ...f, operator: e.target.value }))}
              placeholder="operator"
            />
            <input
              className="border p-2 col-span-2"
              value={form.value}
              onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
              placeholder="value"
            />
          </div>

          <button
            className="rounded bg-blue-600 px-3 py-2 text-white"
            onClick={createAlert}
            disabled={creating}
          >
            Add alert
          </button>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between border p-2">
                  <div>
                    <p className="text-sm font-medium">
                      {alert.field} {alert.operator} {String(alert.value)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {alert.alertType} • {alert.isEnabled ? 'enabled' : 'disabled'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => toggleAlert(alert.id, alert.isEnabled)}>
                      {alert.isEnabled ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => deleteAlert(alert.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}