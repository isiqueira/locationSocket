import { useState, useEffect, useRef } from 'react'
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

const NEAR_RADIUS = 2000
const STALE_MS = 60_000

function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDistance(m) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`
}

function formatAgo(ts, now) {
  const s = Math.floor((now - ts) / 1000)
  if (s < 60) return 'agora'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min atrás`
  return `${Math.floor(m / 60)}h atrás`
}

export default function CheckpointLive() {
  const { id } = useParams()
  const [checkpoint, setCheckpoint] = useState(null)
  const [nearDevices, setNearDevices] = useState({})
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState(null)
  const [now, setNow] = useState(Date.now())

  const checkpointRef = useRef(null)
  const socketRef = useSocket({ query: { checkpoint: id } })

  // Mantém ref sincronizada para usar dentro de closures de socket
  useEffect(() => { checkpointRef.current = checkpoint }, [checkpoint])

  useEffect(() => {
    api.get(`/checkpoints/${id}`)
      .then(res => setCheckpoint(res.data))
      .catch(() => setError('Checkpoint não encontrado.'))
  }, [id])

  // Socket: conexão + eventos de dispositivos
  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return

    setConnected(socket.connected)
    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)

    socket.on('on_connect', (locations) => {
      const cp = checkpointRef.current
      if (!cp?.gpsLocation?.coordinates) return
      const [cpLng, cpLat] = cp.gpsLocation.coordinates
      const ts = Date.now()
      const map = {}
      locations.forEach(l => {
        if (getDistanceMeters(l.latitude, l.longitude, cpLat, cpLng) <= NEAR_RADIUS) {
          map[l.idDevice] = { ...l, arrivedAt: ts, lastSeen: ts }
        }
      })
      setNearDevices(map)
    })

    socket.on('trucksnear', (location) => {
      const ts = Date.now()
      setNearDevices(prev => ({
        ...prev,
        [location.idDevice]: {
          ...location,
          arrivedAt: prev[location.idDevice]?.arrivedAt ?? ts,
          lastSeen: ts,
        },
      }))
    })

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('on_connect')
      socket.off('trucksnear')
    }
  }, [socketRef])

  // Remove devices sem update há mais de 60s
  useEffect(() => {
    const interval = setInterval(() => {
      const cutoff = Date.now() - STALE_MS
      setNearDevices(prev => {
        const next = Object.fromEntries(Object.entries(prev).filter(([, d]) => d.lastSeen > cutoff))
        return Object.keys(next).length !== Object.keys(prev).length ? next : prev
      })
    }, 15_000)
    return () => clearInterval(interval)
  }, [])

  // Tick para atualizar "há X min" na tabela
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  const deviceList = Object.values(nearDevices)

  const cpCoords = (() => {
    const [lng, lat] = checkpoint?.gpsLocation?.coordinates ?? []
    return isFinite(lat) && isFinite(lng) ? [lat, lng] : null
  })()

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h1>{checkpoint ? checkpoint.name || 'Checkpoint' : 'Carregando…'}</h1>
          {checkpoint?.isActive && <span className="badge badge-green">Ativo</span>}
        </div>
        <Link to="/checkpoints" className="btn btn-secondary">← Checkpoints</Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {checkpoint && (
        <>
          <div className="card">
            <div className="cp-live-stats">
              <div className="cp-live-stat">
                <span className="live-stat-label">Dispositivos na área</span>
                <span className="live-stat-value">{deviceList.length}</span>
              </div>
              <div className="cp-live-stat">
                <span className="live-stat-label">Raio de detecção</span>
                <span className="live-stat-value" style={{ fontSize: '1rem' }}>2.000 m</span>
              </div>
              {checkpoint.address && (
                <div className="cp-live-stat">
                  <span className="live-stat-label">Endereço</span>
                  <span className="live-stat-value" style={{ fontSize: '0.85rem' }}>{checkpoint.address}</span>
                </div>
              )}
              <div className="cp-live-stat" style={{ marginLeft: 'auto' }}>
                <span className="live-stat-label">Socket</span>
                <span className="live-stat-value" style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span className={connected ? 'live-dot live-dot--green' : 'live-dot live-dot--red'} />
                  {connected ? 'Ao vivo' : 'Reconectando…'}
                </span>
              </div>
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
                  <Marker position={cpCoords} icon={cpIcon}>
                    <Popup>
                      <strong>{checkpoint.name}</strong>
                      {checkpoint.address && <><br />{checkpoint.address}</>}
                    </Popup>
                  </Marker>
                  <Circle
                    center={cpCoords}
                    radius={NEAR_RADIUS}
                    pathOptions={{ color: '#e94560', fillColor: '#e94560', fillOpacity: 0.08, weight: 2 }}
                  />
                  {deviceList.map(d => (
                    <Marker key={d.idDevice} position={[d.latitude, d.longitude]} icon={defaultIcon}>
                      <Popup>
                        <strong>{d.idDevice}</strong><br />
                        {formatDistance(getDistanceMeters(d.latitude, d.longitude, cpCoords[0], cpCoords[1]))}<br />
                        {d.latitude?.toFixed(5)}, {d.longitude?.toFixed(5)}
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              )}
            </div>
          </div>

          <div className="card" style={{ marginTop: '1rem' }}>
            <div className="card-title">
              Dispositivos presentes
              {deviceList.length > 0 && (
                <span style={{ marginLeft: '0.5rem', background: '#e94560', color: '#fff', borderRadius: '999px', fontSize: '0.75rem', padding: '0.1rem 0.55rem', fontWeight: 700 }}>
                  {deviceList.length}
                </span>
              )}
            </div>

            {deviceList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#aaa' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📡</div>
                <p style={{ fontSize: '0.9rem' }}>Nenhum dispositivo na área no momento.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>ID do Dispositivo</th>
                      <th>Distância</th>
                      <th>Entrou</th>
                      <th>Coordenadas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deviceList
                      .map(d => ({
                        ...d,
                        dist: getDistanceMeters(d.latitude, d.longitude, cpCoords[0], cpCoords[1]),
                      }))
                      .sort((a, b) => a.dist - b.dist)
                      .map(d => (
                        <tr key={d.idDevice}>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{d.idDevice}</td>
                          <td>{formatDistance(d.dist)}</td>
                          <td style={{ color: '#888', fontSize: '0.85rem' }}>{formatAgo(d.arrivedAt, now)}</td>
                          <td style={{ color: '#aaa', fontSize: '0.8rem' }}>
                            {d.latitude?.toFixed(5)}, {d.longitude?.toFixed(5)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
