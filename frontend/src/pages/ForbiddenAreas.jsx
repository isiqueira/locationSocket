import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/client'

export default function ForbiddenAreas() {
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  function load() {
    setLoading(true)
    api.get('/forbidden-areas')
      .then(res => setAreas(res.data))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function handleDelete(id) {
    if (!confirm('Remover esta área proibida?')) return
    await api.delete(`/forbidden-areas/${id}`)
    load()
  }

  return (
    <div>
      <div className="page-header">
        <h1>Áreas Proibidas</h1>
        <Link to="/forbidden-areas/new" className="btn btn-primary">+ Nova Área</Link>
      </div>

      <div className="card">
        {loading ? (
          <p className="loading-text">Carregando…</p>
        ) : areas.length === 0 ? (
          <p className="empty-text">Nenhuma área proibida cadastrada.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Cor</th>
                  <th>Tipo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {areas.map(a => (
                  <tr key={a._id}>
                    <td>{a.name || <span style={{ color: '#aaa' }}>sem nome</span>}</td>
                    <td>
                      {a.lineColor
                        ? <><span className="color-swatch" style={{ background: a.lineColor }} />{a.lineColor}</>
                        : '—'}
                    </td>
                    <td>{a.type || '—'}</td>
                    <td>
                      <div className="td-actions">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => navigate(`/forbidden-areas/${a._id}/edit`)}
                        >
                          Editar
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(a._id)}
                        >
                          Remover
                        </button>
                      </div>
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
