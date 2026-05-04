import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/client'

export default function Checkpoints() {
  const [checkpoints, setCheckpoints] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  function load() {
    setLoading(true)
    api.get('/checkpoints')
      .then(res => setCheckpoints(res.data))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function handleDelete(id) {
    if (!confirm('Remover este checkpoint?')) return
    await api.delete(`/checkpoints/${id}`)
    load()
  }

  return (
    <div>
      <div className="page-header">
        <h1>Checkpoints</h1>
        <Link to="/checkpoints/new" className="btn btn-primary">+ Novo Checkpoint</Link>
      </div>

      <div className="card">
        {loading ? (
          <p className="loading-text">Carregando…</p>
        ) : checkpoints.length === 0 ? (
          <p className="empty-text">Nenhum checkpoint cadastrado.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Slug</th>
                  <th>Endereço</th>
                  <th>Ativo</th>
                  <th>Localização fixa</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {checkpoints.map(cp => (
                  <tr key={cp._id}>
                    <td>{cp.name || '—'}</td>
                    <td style={{ color: '#888', fontSize: '0.8rem' }}>{cp.slug || '—'}</td>
                    <td>{cp.address || '—'}</td>
                    <td>
                      <span className={`badge ${cp.isActive ? 'badge-green' : 'badge-red'}`}>
                        {cp.isActive ? 'Sim' : 'Não'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${cp.isFixedLocation ? 'badge-blue' : 'badge-gray'}`}>
                        {cp.isFixedLocation ? 'Sim' : 'Não'}
                      </span>
                    </td>
                    <td>
                      <div className="td-actions">
                        <Link to={`/checkpoints/${cp._id}/live`} className="btn btn-secondary btn-sm">
                          🔴 Live
                        </Link>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => navigate(`/checkpoints/${cp._id}/edit`)}
                        >
                          Editar
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(cp._id)}
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
