import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api/client'

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

  return (
    <div>
      <div className="page-header">
        <h1>Detalhe da Cidade</h1>
        <Link to="/cities" className="btn btn-secondary">← Voltar</Link>
      </div>

      {loading && <p className="loading-text">Carregando…</p>}
      {error && <div className="alert alert-error">{error}</div>}
      {city && (
        <div className="card">
          <table style={{ width: 'auto' }}>
            <tbody>
              <tr>
                <th style={{ paddingRight: '2rem' }}>Nome</th>
                <td>{city.name}</td>
              </tr>
              <tr>
                <th>Estado</th>
                <td><span className="badge badge-blue">{city.state}</span></td>
              </tr>
              <tr>
                <th>ID Externo</th>
                <td style={{ color: '#888' }}>{city.externalId}</td>
              </tr>
              <tr>
                <th>Geometry type</th>
                <td>{city.geometry?.type}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
