import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import L from 'leaflet'
import api from '../api/client'
import { useSocket } from '../hooks/useSocket'

import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

const defaultIcon = L.icon({ iconUrl, shadowUrl: iconShadow, iconAnchor: [12, 41] })
L.Marker.prototype.options.icon = defaultIcon

const cpIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: iconShadow,
  iconAnchor: [12, 41],
})

function checkpointsBounds(checkpoints) {
  const pts = checkpoints
    .map(cp => { const [lng, lat] = cp.gpsLocation?.coordinates ?? []; return [lat, lng] })
    .filter(([lat, lng]) => isFinite(lat) && isFinite(lng))
  if (!pts.length) return null
  try {
    const b = L.latLngBounds(pts)
    return b.isValid() ? b : null
  } catch { return null }
}

export default function LiveMap() {
  const [devices, setDevices] = useState({})
  const [checkpoints, setCheckpoints] = useState(null) // null = ainda carregando
  const socketRef = useSocket()

  useEffect(() => {
    api.get('/checkpoints').then(res => setCheckpoints(res.data))
  }, [])

  // Socket.IO — snapshot inicial + updates
  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return

    socket.on('on_connect', (locations) => {
      const map = {}
      locations.forEach(l => { map[l.idDevice] = l })
      setDevices(map)
    })

    socket.on('locations', (location) => {
      setDevices(prev => ({ ...prev, [location.idDevice]: location }))
    })

    return () => {
      socket.off('on_connect')
      socket.off('locations')
    }
  }, [socketRef])

  const deviceList = Object.values(devices)
  const bounds = checkpoints ? checkpointsBounds(checkpoints) : null

  return (
    <div>
      <div className="page-header">
        <h1>Mapa Global ao Vivo</h1>
      </div>

      <div className="live-bar">
        <div className="live-stat">
          <span className="live-stat-label">Dispositivos ativos</span>
          <span className="live-stat-value">{deviceList.length}</span>
        </div>
        <div className="live-stat">
          <span className="live-stat-label">Checkpoints</span>
          <span className="live-stat-value">{checkpoints?.length ?? '—'}</span>
        </div>
        <div className="live-stat" style={{ marginLeft: 'auto' }}>
          <span className="live-stat-label">Status</span>
          <span className="live-stat-value" style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className="live-dot live-dot--green" />
            Ao vivo
          </span>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="map-container-tall">
          {checkpoints === null ? (
            <p className="loading-text">Carregando mapa…</p>
          ) : (
            <MapContainer
              {...(bounds
                ? { bounds, boundsOptions: { padding: [40, 40] } }
                : { center: [-15.77972, -47.92972], zoom: 5 }
              )}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="© OpenStreetMap contributors"
              />
              {checkpoints.map(cp => {
                const [lng, lat] = cp.gpsLocation?.coordinates ?? []
                if (!isFinite(lat) || !isFinite(lng)) return null
                return (
                  <Circle
                    key={cp._id + '-circle'}
                    center={[lat, lng]}
                    radius={2000}
                    pathOptions={{ color: '#e94560', fillColor: '#e94560', fillOpacity: 0.06, weight: 1.5 }}
                  />
                )
              })}
              {checkpoints.map(cp => {
                const [lng, lat] = cp.gpsLocation?.coordinates ?? []
                if (!isFinite(lat) || !isFinite(lng)) return null
                return (
                  <Marker key={cp._id} position={[lat, lng]} icon={cpIcon}>
                    <Popup>
                      <strong>{cp.name || 'Checkpoint'}</strong><br />
                      {cp.address || ''}
                    </Popup>
                  </Marker>
                )
              })}
              {deviceList.map(d => {
                if (!isFinite(d.latitude) || !isFinite(d.longitude)) return null
                return (
                  <Marker key={d.idDevice} position={[d.latitude, d.longitude]}>
                    <Popup>
                      <strong>Dispositivo</strong><br />
                      ID: {d.idDevice}<br />
                      {d.latitude?.toFixed(5)}, {d.longitude?.toFixed(5)}
                    </Popup>
                  </Marker>
                )
              })}
            </MapContainer>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="card-title">Legenda</div>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', fontSize: '0.875rem' }}>
          <span>🔴 Checkpoint (raio 2km)</span>
          <span>🔵 Dispositivo ativo</span>
        </div>
      </div>
    </div>
  )
}
