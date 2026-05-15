import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Circle } from 'react-leaflet'
import L from 'leaflet'
import api from '../api/client'

import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

const defaultIcon = L.icon({ iconUrl, shadowUrl: iconShadow, iconAnchor: [12, 41] })

function allPointsBounds(checkpoints) {
  const pts = checkpoints
    .filter(cp => cp.gpsLocation?.coordinates?.length === 2)
    .map(cp => { const [lng, lat] = cp.gpsLocation.coordinates; return [lat, lng] })
  if (!pts.length) return null
  try {
    const b = L.latLngBounds(pts)
    return b.isValid() ? b : null
  } catch { return null }
}

const FALLBACK_BOUNDS = [[-33, -73], [5, -34]]

export default function Checkpoints() {
  const [checkpoints, setCheckpoints] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  function load() {
    setLoading(true)
    api.get('/checkpoints')
      .then(res => setCheckpoints(res.data))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function handleDelete(id) {
    if (!confirm('Remover este checkpoint?')) return
    await api.delete(`/checkpoints/${id}`)
    load()
  }

  return (
    <div>
      <div className="page-header">
        <h1>Checkpoints</h1>
        <Link to="/checkpoints/new" className="btn btn-primary">+ Novo Checkpoint</Link>
      </div>

      {!loading && checkpoints.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <MapContainer
            key={checkpoints.map(cp => cp._id).join(',')}
            bounds={allPointsBounds(checkpoints) ?? FALLBACK_BOUNDS}
            boundsOptions={{ padding: [48, 48] }}
            style={{ height: 360, width: '100%' }}
            scrollWheelZoom
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="© OpenStreetMap contributors"
            />
            {checkpoints.map(cp => {
              if (!cp.gpsLocation?.coordinates?.length) return null
              const [lng, lat] = cp.gpsLocation.coordinates
              const color = cp.checkedColor || '#e94560'
              return (
                <Circle
                  key={cp._id}
                  center={[lat, lng]}
                  radius={2000}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.12, weight: 2 }}
                />
              )
            })}
            {checkpoints.map(cp => {
              if (!cp.gpsLocation?.coordinates?.length) return null
              const [lng, lat] = cp.gpsLocation.coordinates
              return (
                <Marker key={cp._id} position={[lat, lng]} icon={defaultIcon} />
              )
            })}
          </MapContainer>
        </div>
      )}

      {loading ? (
        <p className="loading-text">Carregando…</p>
      ) : checkpoints.length === 0 ? (
        <div className="card">
          <p className="empty-text">Nenhum checkpoint cadastrado.</p>
        </div>
      ) : (
        <div className="fa-grid">
          {checkpoints.map(cp => {
            const hasLocation = cp.gpsLocation?.coordinates?.length === 2
            const [lng, lat] = hasLocation ? cp.gpsLocation.coordinates : []
            const color = cp.checkedColor || '#e94560'
            return (
              <div className="card fa-card" key={cp._id}>
                <div className="fa-card-map">
                  {hasLocation ? (
                    <MapContainer
                      center={[lat, lng]}
                      zoom={13}
                      style={{ height: '100%', width: '100%' }}
                      zoomControl={false}
                      scrollWheelZoom={false}
                      dragging={false}
                      doubleClickZoom={false}
                      attributionControl={false}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <Circle
                        center={[lat, lng]}
                        radius={2000}
                        pathOptions={{ color, fillColor: color, fillOpacity: 0.15, weight: 2 }}
                      />
                      <Marker position={[lat, lng]} icon={defaultIcon} />
                    </MapContainer>
                  ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', color: '#aaa', fontSize: '0.85rem' }}>
                      Sem localização
                    </div>
                  )}
                </div>
                <div className="fa-card-body">
                  <div className="fa-card-title">
                    {cp.name || <span style={{ color: '#aaa' }}>sem nome</span>}
                  </div>
                  {cp.slug && (
                    <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#888', marginBottom: '0.35rem' }}>
                      {cp.slug}
                    </div>
                  )}
                  {cp.address && (
                    <div style={{ fontSize: '0.82rem', color: '#555', marginBottom: '0.4rem' }}>
                      {cp.address}
                    </div>
                  )}
                  <div className="fa-card-meta">
                    <span className={`badge ${cp.isActive ? 'badge-green' : 'badge-red'}`}>
                      {cp.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                    {cp.isFixedLocation && (
                      <span className="badge badge-blue">Fixo</span>
                    )}
                  </div>
                  <div className="td-actions" style={{ marginTop: '0.75rem' }}>
                    <Link to={`/checkpoints/${cp._id}/live`} className="btn btn-secondary btn-sm">
                      🔴 Live
                    </Link>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => navigate(`/checkpoints/${cp._id}/edit`)}
                    >
                      Editar
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(cp._id)}
                    >
                      Remover
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
