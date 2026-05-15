import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import api from '../api/client'

import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'
L.Marker.prototype.options.icon = L.icon({ iconUrl, shadowUrl: iconShadow, iconAnchor: [12, 41] })

function PinPicker({ position, onChange }) {
  useMapEvents({
    click(e) { onChange([e.latlng.lat, e.latlng.lng]) },
  })
  return position ? <Marker position={position} /> : null
}

function MapController({ flyTo, geolocate }) {
  const map = useMap()

  // Centraliza na posição do usuário ao montar (só no modo criação)
  useEffect(() => {
    if (!geolocate || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => map.setView([coords.latitude, coords.longitude], 13),
      () => {}
    )
  }, []) // eslint-disable-line

  // Voa para coordenada quando geocoding ou edição carregam uma posição
  useEffect(() => {
    if (!flyTo) return
    map.flyTo(flyTo, 15, { duration: 1 })
  }, [flyTo]) // eslint-disable-line

  return null
}

export default function CheckpointForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '', slug: '', address: '', checkedColor: '#4CAF50', isActive: true, isFixedLocation: true,
  })
  const [pinPosition, setPinPosition] = useState(null)
  const [flyTo, setFlyTo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [geocoding, setGeocoding] = useState(false)
  const [geoError, setGeoError] = useState(null)

  useEffect(() => {
    if (!isEdit) return
    api.get(`/checkpoints/${id}`).then(res => {
      const cp = res.data
      setForm({
        name: cp.name || '',
        slug: cp.slug || '',
        address: cp.address || '',
        checkedColor: cp.checkedColor || '#4CAF50',
        isActive: cp.isActive ?? true,
        isFixedLocation: cp.isFixedLocation ?? true,
      })
      if (cp.gpsLocation?.coordinates?.length === 2) {
        const [lng, lat] = cp.gpsLocation.coordinates
        setPinPosition([lat, lng])
        setFlyTo([lat, lng])
      }
    })
  }, [id, isEdit])

  async function handleGeocode() {
    if (!form.address.trim()) return
    setGeocoding(true)
    setGeoError(null)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(form.address)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'pt-BR,pt' } }
      )
      const data = await res.json()
      if (!data.length) { setGeoError('Endereço não encontrado.'); return }
      const lat = parseFloat(data[0].lat)
      const lng = parseFloat(data[0].lon)
      setPinPosition([lat, lng])
      setFlyTo([lat, lng])
    } catch {
      setGeoError('Erro ao buscar endereço.')
    } finally {
      setGeocoding(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!pinPosition) {
      setError('Clique no mapa para definir a localização do checkpoint.')
      return
    }
    const payload = {
      ...form,
      gpsLocation: { type: 'Point', coordinates: [pinPosition[1], pinPosition[0]] },
    }
    setLoading(true)
    try {
      if (isEdit) {
        await api.put(`/checkpoints/${id}`, payload)
      } else {
        await api.post('/checkpoints', payload)
      }
      navigate('/checkpoints')
    } catch {
      setError('Erro ao salvar. Verifique os dados e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }))
  const setCheck = key => e => setForm(f => ({ ...f, [key]: e.target.checked }))

  return (
    <div>
      <div className="page-header">
        <h1>{isEdit ? 'Editar Checkpoint' : 'Novo Checkpoint'}</h1>
        <Link to="/checkpoints" className="btn btn-secondary">← Voltar</Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="form-row">
            <div className="form-group">
              <label>Nome</label>
              <input value={form.name} onChange={set('name')} placeholder="Nome do checkpoint" required />
            </div>
            <div className="form-group">
              <label>Slug</label>
              <input value={form.slug} onChange={set('slug')} placeholder="cp-centro" />
            </div>
          </div>

          <div className="form-group">
            <label>Endereço</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                value={form.address}
                onChange={set('address')}
                placeholder="Rua, número, cidade…"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleGeocode() } }}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleGeocode}
                disabled={geocoding || !form.address.trim()}
              >
                {geocoding ? 'Buscando…' : '🔍 Buscar'}
              </button>
            </div>
            {geoError && (
              <p style={{ color: '#c0392b', fontSize: '0.8rem', marginTop: '0.3rem' }}>{geoError}</p>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Cor de check</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input type="color" value={form.checkedColor} onChange={set('checkedColor')} style={{ width: 48, padding: 2 }} />
                <input value={form.checkedColor} onChange={set('checkedColor')} style={{ flex: 1 }} />
              </div>
            </div>
            <div className="form-group" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.isActive} onChange={setCheck('isActive')} />
                Ativo
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.isFixedLocation} onChange={setCheck('isFixedLocation')} />
                Localização fixa
              </label>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            Clique no mapa para {isEdit ? 'alterar a' : 'definir a'} localização
            {pinPosition && (
              <span style={{ marginLeft: '1rem', fontSize: '0.8rem', color: '#888', fontWeight: 400 }}>
                {pinPosition[0].toFixed(5)}, {pinPosition[1].toFixed(5)}
              </span>
            )}
          </div>
          <div className="map-container">
            <MapContainer
              center={[-15.77972, -47.92972]}
              zoom={5}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="© OpenStreetMap contributors"
              />
              <MapController flyTo={flyTo} geolocate={!isEdit} />
              <PinPicker position={pinPosition} onChange={setPinPosition} />
            </MapContainer>
          </div>
        </div>

        <div className="form-actions">
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Criar checkpoint'}
          </button>
          <Link to="/checkpoints" className="btn btn-secondary">Cancelar</Link>
        </div>
      </form>
    </div>
  )
}
