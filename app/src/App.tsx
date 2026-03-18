import { Navigate, Route, Routes } from 'react-router-dom'
import { CatalogProvider } from './context/CatalogContext'
import { AssetDetailPage } from './views/AssetDetailPage'
import { AdminPage } from './views/AdminPage'
import { DashboardPage } from './views/DashboardPage'

function App() {
  return (
    <CatalogProvider>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/asset/:slug" element={<AssetDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </CatalogProvider>
  )
}

export default App
