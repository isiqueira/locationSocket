import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import L from 'leaflet'
import api from '../api/client'

function geoBounds(geometry) {
  if (!geometry?.coordinates?.length) return null
  try {
    const b = L.geoJSON(geometry).getBounds()
    return b.isValid() ? b : null
  } catch { return null }
}

function allBounds(areas) {
  try {
    const fc = {
      type: 'FeatureCollection',
      features: areas
        .filter(a => a.area?.coordinates?.length)
        .map(a => ({ type: 'Feature', geometry: a.area, properties: {} }))
    }
    const b = L.geoJSON(fc).getBounds()
    return b.isValid() ? b : null
  } catch { return null }
}

const FALLBACK_BOUNDS = [[-33, -73], [5, -34]]

export default function ForbiddenAreas() {
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  function load() {
    setLoading(true)
    api.get('/forbidden-areas')
      .then(res => setAreas(res.data))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function handleDelete(id) {
    if (!confirm('Remover esta área proibida?')) return
    await api.delete(`/forbidden-areas/${id}`)
    load()
  }

  return (
    <div>
      <div className="page-header">
        <h1>Áreas Proibidas</h1>
        <Link to="/forbidden-areas/new" className="btn btn-primary">+ Nova Área</Link>
      </div>

      {!loading && areas.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <MapContainer
            key={areas.map(a => a._id).join(',')}
            bounds={allBounds(areas) ?? FALLBACK_BOUNDS}
            boundsOptions={{ padding: [24, 24] }}
            style={{ height: 360, width: '100%' }}
            scrollWheelZoom
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="© OpenStreetMap contributors"
            />
            {areas.map(a => a.area?.coordinates?.length ? (
              <GeoJSON
                key={a._id}
                data={a.area}
                style={{
                  color: a.lineColor || '#e94560',
                  weight: 2,
                  fillColor: a.lineColor || '#e94560',
                  fillOpacity: 0.2,
                }}
                onEachFeature={(_f, layer) => {
                  if (a.name) layer.bindTooltip(a.name, { permanent: true, direction: 'center', className: 'polygon-label' })
                }}
              />
            ) : null)}
          </MapContainer>
        </div>
      )}

      {loading ? (
        <p className="loading-text">Carregando…</p>
      ) : areas.length === 0 ? (
        <div className="card">
          <p className="empty-text">Nenhuma área proibida cadastrada.</p>
        </div>
      ) : (
        <div className="fa-grid">
          {areas.map(a => {
            const bounds = geoBounds(a.area)
            const color = a.lineColor || '#e94560'
            return (
              <div className="card fa-card" key={a._id}>
                <div className="fa-card-map">
                  <MapContainer
                    bounds={bounds ?? FALLBACK_BOUNDS}
                    boundsOptions={{ padding: [16, 16] }}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                    scrollWheelZoom={false}
                    dragging={false}
                    doubleClickZoom={false}
                    attributionControl={false}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {a.area?.coordinates?.length && (
                      <GeoJSON
                        data={a.area}
                        style={{ color, weight: 2, fillColor: color, fillOpacity: 0.2 }}
                      />
                    )}
                  </MapContainer>
                </div>
                <div className="fa-card-body">
                  <div className="fa-card-title">
                    {a.name || <span style={{ color: '#aaa' }}>sem nome</span>}
                  </div>
                  <div className="fa-card-meta">
                    {a.lineColor && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span className="color-swatch" style={{ background: a.lineColor }} />
                        {a.lineColor}
                      </span>
                    )}
                    {a.type && <span>{a.type}</span>}
                  </div>
                  <div className="td-actions" style={{ marginTop: '0.75rem' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => navigate(`/forbidden-areas/${a._id}/edit`)}
                    >
                      Editar
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(a._id)}
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
