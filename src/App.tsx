import { Routes, Route, Navigate } from 'react-router-dom'
import { MarketingPage } from '@/pages/MarketingPage'
import { ApoloWorkspace } from '@/pages/ApoloWorkspace'
import { PublicProjectDrivePage } from '@/pages/PublicProjectDrivePage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MarketingPage />} />
      <Route path="/app/*" element={<ApoloWorkspace />} />
      <Route path="/drive/:token" element={<PublicProjectDrivePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
