import React, { useEffect, useState } from "react"

interface AssetOverviewPanelProps {
  assetId: string
}

interface AssetOverview {
  name: string
  priceUsd: number
  supply: number
  holders: number
  volume24hUsd?: number
  marketCapUsd?: number
  lastUpdated?: string
}

export const AssetOverviewPanel: React.FC<AssetOverviewPanelProps> = ({ assetId }) => {
  const [info, setInfo] = useState<AssetOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    let active = true
    async function fetchInfo() {
      try {
        setLoading(true)
        const res = await fetch(`/api/assets/${assetId}`)
        if (!res.ok) throw new Error(`Failed to load asset: ${res.status}`)
        const json = await res.json()
        if (active) setInfo(json)
      } catch (err: any) {
        if (active) setError(err.message || "Failed to fetch asset data")
      } finally {
        if (active) setLoading(false)
      }
    }
    fetchInfo()
    return () => {
      active = false
    }
  }, [assetId])

  if (loading) return <div className="p-4">Loading asset overview...</div>
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>
  if (!info) return <div className="p-4">No data available</div>

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-2">Asset Overview</h2>
      <p><strong>ID:</strong> {assetId}</p>
      <p><strong>Name:</strong> {info.name}</p>
      <p><strong>Price (USD):</strong> ${info.priceUsd.toFixed(2)}</p>
      <p><strong>Circulating Supply:</strong> {info.supply.toLocaleString()}</p>
      <p><strong>Holders:</strong> {info.holders.toLocaleString()}</p>
      {info.volume24hUsd !== undefined && (
        <p><strong>24h Volume (USD):</strong> {info.volume24hUsd.toLocaleString()}</p>
      )}
      {info.marketCapUsd !== undefined && (
        <p><strong>Market Cap (USD):</strong> {info.marketCapUsd.toLocaleString()}</p>
      )}
      {info.lastUpdated && (
        <p className="text-xs text-gray-500">Last updated: {new Date(info.lastUpdated).toLocaleString()}</p>
      )}
    </div>
  )
}

export default AssetOverviewPanel
