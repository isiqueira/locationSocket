import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import L from 'leaflet'
import api from '../api/client'
import { useSocket } from '../hooks/useSocket'

import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

const defaultIcon = L.icon({ iconUrl, shadowUrl: iconShadow, iconAnchor: [12, 41] })

const cpIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: iconShadow,
  iconAnchor: [12, 41],
})

const NEAR_RADIUS = 2000 // metros — mesmo valor do backend ($maxDistance)

export default function CheckpointLive() {
  const { id } = useParams()
  const [checkpoint, setCheckpoint] = useState(null)
  const [nearDevices, setNearDevices] = useState({}) // { idDevice: location }
  const [error, setError] = useState(null)

  // Conecta ao socket com query.checkpoint=<id> → entra na room do backend
  const socketRef = useSocket({ query: { checkpoint: id } })

  // Carrega dados do checkpoint
  useEffect(() => {
    api.get(`/checkpoints/${id}`)
      .then(res => setCheckpoint(res.data))
      .catch(() => setError('Checkpoint não encontrado.'))
  }, [id])

  // Ouve on_connect (snapshot inicial) e trucksnear (updates em tempo real)
  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return

    // Snapshot inicial: filtra apenas dispositivos dentro do raio
    socket.on('on_connect', (locations) => {
      if (!checkpoint) return
      const [cpLng, cpLat] = checkpoint.gpsLocation?.coordinates || []
      if (cpLat == null) return

      const map = {}
      locations.forEach(l => {
        const dist = getDistanceMeters(l.latitude, l.longitude, cpLat, cpLng)
        if (dist <= NEAR_RADIUS) map[l.idDevice] = l
      })
      setNearDevices(map)
    })

    // Recebe apenas dispositivos já dentro do raio do checkpoint
    socket.on('trucksnear', (location) => {
      setNearDevices(prev => ({ ...prev, [location.idDevice]: location }))
    })

    return () => {
      socket.off('on_connect')
      socket.off('trucksnear')
    }
  }, [socketRef, checkpoint])

  const deviceList = Object.values(nearDevices)

  const cpCoords = checkpoint?.gpsLocation?.coordinates?.length === 2
    ? [checkpoint.gpsLocation.coordinates[1], checkpoint.gpsLocation.coordinates[0]]
    : null

  return (
    <div>
      <div className="page-header">
        <h1>
          {checkpoint
            ? <>📌 {checkpoint.name || 'Checkpoint'} — Visão Live</>
            : 'Carregando checkpoint…'}
        </h1>
        <Link to="/checkpoints" className="btn btn-secondary">← Checkpoints</Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {checkpoint && (
        <>
          <div className="live-bar">
            <div className="live-stat">
              <span className="live-stat-label">Dispositivos na região</span>
              <span className="live-stat-value">{deviceList.length}</span>
            </div>
            <div className="live-stat">
              <span className="live-stat-label">Raio de detecção</span>
              <span className="live-stat-value" style={{ fontSize: '1rem' }}>2.000m</span>
            </div>
            {checkpoint.address && (
              <div className="live-stat">
                <span className="live-stat-label">Endereço</span>
                <span className="live-stat-value" style={{ fontSize: '0.9rem' }}>{checkpoint.address}</span>
              </div>
            )}
            <div className="live-stat" style={{ marginLeft: 'auto' }}>
              <span className="live-stat-label">Status</span>
              <span className="live-stat-value" style={{ fontSize: '1rem', color: '#27ae60' }}>🔴 Ao vivo</span>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="map-container-tall">
              {cpCoords && (
                <MapContainer center={cpCoords} zoom={14} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="© OpenStreetMap contributors"
                  />

                  {/* Checkpoint */}
                  <Marker position={cpCoords} icon={cpIcon}>
                    <Popup><strong>{checkpoint.name}</strong><br />{checkpoint.address}</Popup>
                  </Marker>

                  {/* Círculo de 2km */}
                  <Circle
                    center={cpCoords}
                    radius={NEAR_RADIUS}
                    pathOptions={{ color: '#e94560', fillColor: '#e94560', fillOpacity: 0.08, weight: 2 }}
                  />

                  {/* Dispositivos dentro do raio */}
                  {deviceList.map(d => (
                    <Marker key={d.idDevice} position={[d.latitude, d.longitude]} icon={defaultIcon}>
                      <Popup>
                        <strong>Dispositivo</strong><br />
                        ID: {d.idDevice}<br />
                        {d.latitude?.toFixed(5)}, {d.longitude?.toFixed(5)}
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              )}
            </div>
          </div>

          {deviceList.length > 0 && (
            <div className="card" style={{ marginTop: '1rem' }}>
              <div className="card-title">Dispositivos presentes ({deviceList.length})</div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>ID do Dispositivo</th>
                      <th>Latitude</th>
                      <th>Longitude</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deviceList.map(d => (
                      <tr key={d.idDevice}>
                        <td>{d.idDevice}</td>
                        <td>{d.latitude?.toFixed(6)}</td>
                        <td>{d.longitude?.toFixed(6)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Haversine simplificado para filtro do snapshot inicial
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
