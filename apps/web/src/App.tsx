import { Routes, Route } from 'react-router-dom'
import { ExplorePage } from './pages/ExplorePage'
import { AgentPage } from './pages/AgentPage'
import { AppViewPage } from './pages/AppViewPage'
import { Layout } from './components/Layout'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<ExplorePage />} />
        <Route path="/a/:slug" element={<AgentPage />} />
        <Route path="/a/:slug/apps/:appId" element={<AppViewPage />} />
      </Route>
    </Routes>
  )
}

export default App
