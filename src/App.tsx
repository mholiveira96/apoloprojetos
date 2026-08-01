import { Routes, Route, Navigate } from 'react-router-dom'
import { MarketingPage } from '@/pages/MarketingPage'
import { ApoloWorkspace } from '@/pages/ApoloWorkspace'
import { PublicProjectDrivePage } from '@/pages/PublicProjectDrivePage'
import { PublicPremiseQuestionnairePage } from '@/pages/PublicPremiseQuestionnairePage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MarketingPage />} />
      <Route path="/app/*" element={<ApoloWorkspace />} />
      <Route path="/drive/:token" element={<PublicProjectDrivePage />} />
      <Route path="/questionario-premissas" element={<PublicPremiseQuestionnairePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
