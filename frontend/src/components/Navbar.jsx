import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar-brand">📍 LocationSocket</NavLink>
      <NavLink to="/" end>Dashboard</NavLink>
      <NavLink to="/cities">Cidades</NavLink>
      <NavLink to="/forbidden-areas">Áreas Proibidas</NavLink>
      <NavLink to="/checkpoints">Checkpoints</NavLink>
      <NavLink to="/map">Mapa Global</NavLink>
      <button className="navbar-logout" onClick={handleLogout}>Sair</button>
    </nav>
  )
}
