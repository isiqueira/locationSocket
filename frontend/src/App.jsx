import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthProvider } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import Navbar from './components/Navbar'

const Login          = lazy(() => import('./pages/Login'))
const Dashboard      = lazy(() => import('./pages/Dashboard'))
const Cities         = lazy(() => import('./pages/Cities'))
const CityDetail     = lazy(() => import('./pages/CityDetail'))
const ForbiddenAreas = lazy(() => import('./pages/ForbiddenAreas'))
const ForbiddenAreaForm = lazy(() => import('./pages/ForbiddenAreaForm'))
const Checkpoints    = lazy(() => import('./pages/Checkpoints'))
const CheckpointForm = lazy(() => import('./pages/CheckpointForm'))
const LiveMap        = lazy(() => import('./pages/LiveMap'))
const CheckpointLive = lazy(() => import('./pages/CheckpointLive'))

function Layout() {
  return (
    <div className="layout">
      <Navbar />
      <main className="main-content">
        <Suspense fallback={<p className="loading-text">Carregando…</p>}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="cities" element={<Cities />} />
            <Route path="cities/:id" element={<CityDetail />} />
            <Route path="forbidden-areas" element={<ForbiddenAreas />} />
            <Route path="forbidden-areas/new" element={<ForbiddenAreaForm />} />
            <Route path="forbidden-areas/:id/edit" element={<ForbiddenAreaForm />} />
            <Route path="checkpoints" element={<Checkpoints />} />
            <Route path="checkpoints/new" element={<CheckpointForm />} />
            <Route path="checkpoints/:id/edit" element={<CheckpointForm />} />
            <Route path="checkpoints/:id/live" element={<CheckpointLive />} />
            <Route path="map" element={<LiveMap />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
