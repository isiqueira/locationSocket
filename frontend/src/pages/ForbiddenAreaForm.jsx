import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { MapContainer, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'
import '@geoman-io/leaflet-geoman-free'
import api from '../api/client'

// Fix leaflet default icon
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'
L.Marker.prototype.options.icon = L.icon({ iconUrl, shadowUrl: iconShadow, iconAnchor: [12, 41] })

export default function ForbiddenAreaForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const mapRef = useRef(null)
  const drawnLayerRef = useRef(null)

  const [form, setForm] = useState({ name: '', lineColor: '#e94560', type: 'restricted', areaProibida: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [mapReady, setMapReady] = useState(false)

  // Carrega dados no modo edição
  useEffect(() => {
    if (!isEdit) return
    api.get(`/forbidden-areas/${id}`).then(res => {
      const a = res.data
      setForm({
        name: a.name || '',
        lineColor: a.lineColor || '#e94560',
        type: a.type || 'restricted',
        areaProibida: a.areaProibida || '',
      })
    })
  }, [id, isEdit])

  // Inicializa Geoman após mapa estar pronto
  useEffect(() => {
    if (!mapReady) return
    const map = mapRef.current
    if (!map) return

    map.pm.addControls({
      position: 'topleft',
      drawMarker: false,
      drawCircle: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawRectangle: true,
      drawPolygon: true,
      editMode: true,
      dragMode: true,
      cutPolygon: false,
      removalMode: true,
    })

    // No modo criação, centraliza no usuário
    if (!isEdit && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => map.setView([coords.latitude, coords.longitude], 13),
        () => {}
      )
    }

    // Se edição, renderiza polígono existente
    if (isEdit) {
      api.get(`/forbidden-areas/${id}`).then(res => {
        const area = res.data
        if (area?.area?.coordinates?.length) {
          try {
            const coords = area.area.coordinates[0].map(([lng, lat]) => [lat, lng])
            const polygon = L.polygon(coords, { color: area.lineColor || '#e94560' }).addTo(map)
            drawnLayerRef.current = polygon
            map.fitBounds(polygon.getBounds())
          } catch {}
        }
      })
    }

    map.on('pm:create', ({ layer }) => {
      if (drawnLayerRef.current) map.removeLayer(drawnLayerRef.current)
      drawnLayerRef.current = layer
    })

    map.on('pm:remove', () => { drawnLayerRef.current = null })
  }, [mapReady, isEdit, id])

  function getGeoJson() {
    const layer = drawnLayerRef.current
    if (!layer) return null
    const geo = layer.toGeoJSON()
    return geo.geometry
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    const geometry = getGeoJson()
    if (!geometry && !isEdit) {
      setError('Desenhe o polígono da área no mapa antes de salvar.')
      return
    }
    const payload = {
      name: form.name,
      lineColor: form.lineColor,
      type: form.type,
      areaProibida: form.areaProibida,
      ...(geometry ? { area: geometry } : {}),
    }
    setLoading(true)
    try {
      if (isEdit) {
        await api.put(`/forbidden-areas/${id}`, payload)
      } else {
        await api.post('/forbidden-areas', payload)
      }
      navigate('/forbidden-areas')
    } catch {
      setError('Erro ao salvar. Verifique os dados e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>{isEdit ? 'Editar Área Proibida' : 'Nova Área Proibida'}</h1>
        <Link to="/forbidden-areas" className="btn btn-secondary">← Voltar</Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="form-row">
            <div className="form-group">
              <label>Nome</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome da área" />
            </div>
            <div className="form-group">
              <label>Tipo</label>
              <input value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} placeholder="restricted, danger…" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Cor da linha</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input type="color" value={form.lineColor} onChange={e => setForm(f => ({ ...f, lineColor: e.target.value }))} style={{ width: 48, padding: 2 }} />
                <input value={form.lineColor} onChange={e => setForm(f => ({ ...f, lineColor: e.target.value }))} style={{ flex: 1 }} />
              </div>
            </div>
            <div className="form-group">
              <label>Descrição (areaProibida)</label>
              <input value={form.areaProibida} onChange={e => setForm(f => ({ ...f, areaProibida: e.target.value }))} placeholder="Descrição opcional" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            {isEdit ? 'Redesenhe o polígono para alterar (opcional)' : 'Desenhe o polígono da área no mapa'}
          </div>
          <div className="map-container-tall">
            <MapContainer
              center={[-15.77972, -47.92972]}
              zoom={5}
              style={{ height: '100%', width: '100%' }}
              ref={mapRef}
              whenReady={() => setMapReady(true)}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="© OpenStreetMap contributors"
              />
            </MapContainer>
          </div>
        </div>

        <div className="form-actions">
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Criar área'}
          </button>
          <Link to="/forbidden-areas" className="btn btn-secondary">Cancelar</Link>
        </div>
      </form>
    </div>
  )
}
