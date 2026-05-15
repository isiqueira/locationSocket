import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import L from 'leaflet'
import api from '../api/client'
import stateNames from '../utils/stateNames'

const PAGE_SIZE = 12
const FALLBACK_BOUNDS = [[-33, -73], [5, -34]]

function geoBounds(geometry) {
  try {
    const b = L.geoJSON(geometry).getBounds()
    return b.isValid() ? b : null
  } catch { return null }
}

export default function Cities() {
  const [cities, setCities] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterName, setFilterName] = useState('')
  const [filterState, setFilterState] = useState('')
  const [allNames, setAllNames] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const comboRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/cities', { params: { limit: 5000 } }).then(res => {
      const seen = new Set()
      const pairs = []
      for (const c of res.data.data) {
        const key = `${c.name}|${c.state}`
        if (!seen.has(key)) { seen.add(key); pairs.push({ name: c.name, state: c.state }) }
      }
      pairs.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      setAllNames(pairs)
    })
  }, [])

  useEffect(() => {
    const params = { page, limit: PAGE_SIZE }
    if (filterName) params.name = filterName
    if (filterState) params.state = filterState
    setLoading(true)
    api.get('/cities', { params })
      .then(res => {
        setCities(res.data.data)
        setTotalPages(res.data.totalPages)
        setTotal(res.data.total)
      })
      .finally(() => setLoading(false))
  }, [filterName, filterState, page])

  useEffect(() => {
    function handleClickOutside(e) {
      if (comboRef.current && !comboRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const suggestions = inputValue
    ? allNames
        .filter(c => `${c.name} ${c.state}`.toLowerCase().includes(inputValue.toLowerCase()))
        .slice(0, 10)
    : []

  function handleInputChange(e) {
    const val = e.target.value
    setInputValue(val)
    setShowDropdown(true)
    if (!val) { setFilterName(''); setPage(1) }
  }

  function handleSelect(city) {
    setInputValue(`${city.name} - ${city.state}`)
    setFilterName(city.name)
    setPage(1)
    setShowDropdown(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      // strip " - ST" suffix if user selected from dropdown then pressed Enter
      const name = inputValue.replace(/\s*-\s*[A-Z]{2}$/, '').trim()
      setFilterName(name)
      setPage(1)
      setShowDropdown(false)
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Cidades</h1>
      </div>

      <div className="filter-bar">
        <div className="combobox" ref={comboRef}>
          <div className="combobox-input-wrap">
            <input
              placeholder="Filtrar por nome…"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={() => inputValue && setShowDropdown(true)}
              onKeyDown={handleKeyDown}
            />
            {inputValue && (
              <button
                className="combobox-clear"
                type="button"
                onMouseDown={() => { setInputValue(''); setFilterName(''); setPage(1); setShowDropdown(false) }}
              >
                ×
              </button>
            )}
          </div>
          {showDropdown && suggestions.length > 0 && (
            <ul className="combobox-dropdown">
              {suggestions.map(c => (
                <li
                  key={`${c.name}|${c.state}`}
                  className="combobox-option"
                  onMouseDown={() => handleSelect(c)}
                >
                  {c.name} <span style={{ color: '#888', fontSize: '0.8em' }}>— {c.state}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <select
          value={filterState}
          onChange={e => { setFilterState(e.target.value); setPage(1) }}
          style={{ width: 220 }}
        >
          <option value="">Todos os estados</option>
          {Object.entries(stateNames).map(([uf, name]) => (
            <option key={uf} value={uf}>{name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="loading-text">Carregando…</p>
      ) : cities.length === 0 ? (
        <div className="card">
          <p className="empty-text">Nenhuma cidade encontrada.</p>
        </div>
      ) : (
        <>
          <div className="fa-grid">
            {cities.map(c => {
              const bounds = c.geometry ? geoBounds(c.geometry) : null
              return (
                <div
                  className="card fa-card"
                  key={c._id || c.externalId}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/cities/${c.externalId}`)}
                >
                  <div className="fa-card-map">
                    <MapContainer
                      bounds={bounds ?? FALLBACK_BOUNDS}
                      boundsOptions={{ padding: [16, 16] }}
                      style={{ height: '100%', width: '100%' }}
                      zoomControl={false}
                      scrollWheelZoom={false}
                      dragging={false}
                      doubleClickZoom={false}
                      attributionControl={false}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      {c.geometry && bounds && (
                        <GeoJSON
                          key={c.externalId}
                          data={c.geometry}
                          style={{ color: '#e94560', weight: 2, fillColor: '#e94560', fillOpacity: 0.2 }}
                        />
                      )}
                    </MapContainer>
                  </div>
                  <div className="fa-card-body">
                    <div className="fa-card-title">{c.name}</div>
                    <div className="fa-card-meta">
                      <span className="badge badge-blue">{stateNames[c.state] ?? c.state}</span>
                      <span style={{ color: '#bbb', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                        {c.externalId}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="pagination">
            <button
              className="btn btn-secondary btn-sm"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              ← Anterior
            </button>
            <span className="pagination-info">
              Página {page} de {totalPages} · {total} cidade{total !== 1 ? 's' : ''}
            </span>
            <button
              className="btn btn-secondary btn-sm"
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Próxima →
            </button>
          </div>
        </>
      )}
    </div>
  )
}
