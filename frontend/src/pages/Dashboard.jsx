import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, GeoJSON, Marker } from 'react-leaflet'
import L from 'leaflet'
import api from '../api/client'
import stateNames from '../utils/stateNames'

import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

const defaultIcon = L.icon({ iconUrl, shadowUrl: iconShadow, iconAnchor: [12, 41] })

function cityCenter(geometry) {
  try {
    const b = L.geoJSON(geometry).getBounds()
    if (!b.isValid()) return null
    const c = b.getCenter()
    return [c.lat, c.lng]
  } catch { return null }
}

export default function Dashboard() {
  const [city, setCity] = useState(undefined)
  const [coords, setCoords] = useState(null)
  const [geoError, setGeoError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolocalização não suportada neste navegador.')
      return
    }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords
        setCoords({ latitude, longitude })
        api
          .get(`/where-i-am?lat=${latitude}&lng=${longitude}`)
          .then(res => setCity(res.data))
          .catch(() => setGeoError('Erro ao consultar o servidor.'))
          .finally(() => setLoading(false))
      },
      err => {
        setGeoError(`Permissão de localização negada: ${err.message}`)
        setLoading(false)
      },
      { timeout: 10000 }
    )
  }, [])

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      <div className="card">
        <div className="card-title">Onde estou agora?</div>
        {loading && <p className="loading-text">Obtendo sua localização…</p>}

        {geoError && <div className="alert alert-error">{geoError}</div>}

        {!loading && !geoError && city !== undefined && (
          <div className="where-card">
            <div className="where-map">
              <MapContainer
                center={
                  (city?.geometry ? cityCenter(city.geometry) : null)
                  ?? (coords ? [coords.latitude, coords.longitude] : [-15.77972, -47.92972])
                }
                zoom={city?.geometry ? 9 : coords ? 11 : 4}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
                scrollWheelZoom={false}
                dragging={false}
                doubleClickZoom={false}
                attributionControl={false}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {city?.geometry && (
                  <GeoJSON
                    data={city.geometry}
                    style={{ color: '#e94560', weight: 2, fillColor: '#e94560', fillOpacity: 0.2 }}
                  />
                )}
                {!city && coords && (
                  <Marker position={[coords.latitude, coords.longitude]} icon={defaultIcon} />
                )}
              </MapContainer>
            </div>

            <div className="where-info">
              {city ? (
                <>
                  <h2>{city.name}</h2>
                  <p>Estado: <strong>{stateNames[city.state] ?? city.state}</strong></p>
                  {coords && (
                    <p style={{ marginTop: '0.25rem', color: '#aaa', fontSize: '0.8rem' }}>
                      {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <h2>Localização não identificada</h2>
                  <p>Suas coordenadas não correspondem a nenhuma cidade cadastrada.</p>
                  {coords && (
                    <p style={{ marginTop: '0.25rem', color: '#aaa', fontSize: '0.8rem' }}>
                      {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">Links rápidos</div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <a href="/cities" className="btn btn-secondary">🏙️ Cidades</a>
          <a href="/forbidden-areas" className="btn btn-secondary">🚫 Áreas Proibidas</a>
          <a href="/checkpoints" className="btn btn-secondary">📌 Checkpoints</a>
          <a href="/map" className="btn btn-primary">🗺️ Mapa Global ao Vivo</a>
        </div>
      </div>
    </div>
  )
}
