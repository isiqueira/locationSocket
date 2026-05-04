import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'

export default function Cities() {
  const [cities, setCities] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterName, setFilterName] = useState('')
  const [filterState, setFilterState] = useState('')

  useEffect(() => {
    const params = {}
    if (filterName) params.name = filterName
    if (filterState) params.state = filterState
    setLoading(true)
    api.get('/cities', { params })
      .then(res => setCities(res.data))
      .finally(() => setLoading(false))
  }, [filterName, filterState])

  return (
    <div>
      <div className="page-header">
        <h1>Cidades</h1>
      </div>

      <div className="filter-bar">
        <input
          placeholder="Filtrar por nome…"
          value={filterName}
          onChange={e => setFilterName(e.target.value)}
        />
        <input
          placeholder="Filtrar por estado (ex: SP)…"
          value={filterState}
          onChange={e => setFilterState(e.target.value.toUpperCase())}
          style={{ width: 220 }}
        />
      </div>

      <div className="card">
        {loading ? (
          <p className="loading-text">Carregando…</p>
        ) : cities.length === 0 ? (
          <p className="empty-text">Nenhuma cidade encontrada.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Estado</th>
                  <th>ID Externo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cities.map(c => (
                  <tr key={c._id || c.externalId}>
                    <td>{c.name}</td>
                    <td><span className="badge badge-blue">{c.state}</span></td>
                    <td style={{ color: '#aaa', fontSize: '0.8rem' }}>{c.externalId}</td>
                    <td>
                      <Link to={`/cities/${c.externalId}`} className="btn btn-secondary btn-sm">
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
