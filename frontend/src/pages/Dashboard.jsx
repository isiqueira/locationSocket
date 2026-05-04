import { useState, useEffect } from 'react'
import api from '../api/client'

export default function Dashboard() {
  const [city, setCity] = useState(undefined) // undefined = não buscou ainda
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
            <div className="where-icon">📍</div>
            <div className="where-info">
              {city ? (
                <>
                  <h2>{city.name}</h2>
                  <p>Estado: <strong>{city.state}</strong></p>
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
