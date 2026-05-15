import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import L from 'leaflet'
import api from '../api/client'
import stateNames from '../utils/stateNames'

function geoBounds(geometry) {
  try {
    const b = L.geoJSON(geometry).getBounds()
    return b.isValid() ? b : null
  } catch { return null }
}

function coordCount(geometry) {
  if (!geometry?.coordinates) return 0
  if (geometry.type === 'Polygon') return geometry.coordinates[0]?.length ?? 0
  if (geometry.type === 'MultiPolygon')
    return geometry.coordinates.reduce((s, p) => s + (p[0]?.length ?? 0), 0)
  return 0
}

export default function CityDetail() {
  const { id } = useParams()
  const [city, setCity] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get(`/cities/${id}`)
      .then(res => setCity(res.data))
      .catch(() => setError('Cidade não encontrada.'))
      .finally(() => setLoading(false))
  }, [id])

  const points = city ? coordCount(city.geometry) : 0

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h1>{city ? city.name : 'Detalhe da Cidade'}</h1>
          {city && <span className="badge badge-blue" style={{ fontSize: '0.9rem', padding: '0.25rem 0.65rem' }}>{stateNames[city.state] ?? city.state}</span>}
        </div>
        <Link to="/cities" className="btn btn-secondary">← Voltar</Link>
      </div>

      {loading && <p className="loading-text">Carregando…</p>}
      {error && <div className="alert alert-error">{error}</div>}

      {city && (
        <div className="city-detail-grid">
          <div className="card">
            <div className="card-title">Informações</div>
            <dl className="detail-list">
              <dt>Nome</dt>
              <dd>{city.name}</dd>

              <dt>Estado</dt>
              <dd><span className="badge badge-blue">{stateNames[city.state] ?? city.state}</span></dd>

              <dt>ID Externo</dt>
              <dd style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#666' }}>{city.externalId}</dd>

              <dt>Geometria</dt>
              <dd>{city.geometry?.type ?? '—'}</dd>

              <dt>Pontos</dt>
              <dd>{points.toLocaleString('pt-BR')}</dd>
            </dl>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <MapContainer
              bounds={geoBounds(city.geometry) ?? [[-33, -73], [5, -34]]}
              boundsOptions={{ padding: [24, 24] }}
              style={{ height: 480, width: '100%' }}
              scrollWheelZoom
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="© OpenStreetMap contributors"
              />
              <GeoJSON
                key={city.externalId}
                data={city.geometry}
                style={{ color: '#e94560', weight: 2, fillColor: '#e94560', fillOpacity: 0.15 }}
              />
            </MapContainer>
          </div>
        </div>
      )}
    </div>
  )
}
