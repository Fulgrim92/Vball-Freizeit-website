import { useEffect } from 'react'
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, MotionConfig } from 'framer-motion'
import { StoreProvider } from './lib/store'
import AmbientBackground from './components/AmbientBackground'
import { CommandPalette, Footer, Header, MenuSheet, TabBar, Toasts } from './components/Shell'
import Home from './pages/Home'
import Tables from './pages/Tables'
import { TeamDetail, TeamsList } from './pages/Teams'
import { CommunityPage, Infos, Termine } from './pages/Community'
import Login from './pages/Login'
import MyTeam from './pages/MyTeam'
import Live from './pages/Live'
import { LiveProvider } from './live/LiveProvider'
import { ResultProposalBar } from './live/LiveViews'

function Routed() {
  const loc = useLocation()
  // one transition per section, so switching leagues inside /tabellen stays in place
  const section = loc.pathname.split('/')[1] || 'start'
  const key = section === 'mannschaften' ? loc.pathname : section
  // every navigation lands at the top of the new page
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [loc.pathname])
  return (
    <AnimatePresence mode="wait">
      <motion.main
        key={key}
        id="inhalt"
        tabIndex={-1}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
      >
        <Routes location={loc}>
          <Route path="/" element={<Home />} />
          <Route path="/live" element={<Live />} />
          <Route path="/tabellen/:league?" element={<Tables />} />
          <Route path="/mannschaften" element={<TeamsList />} />
          <Route path="/mannschaften/:id" element={<TeamDetail />} />
          <Route path="/termine" element={<Termine />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/infos" element={<Infos />} />
          <Route path="/login" element={<Login />} />
          <Route path="/mein-team" element={<MyTeam />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </motion.main>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <StoreProvider>
        <LiveProvider>
        <HashRouter>
          <a
            href="#inhalt"
            className="skip"
            onClick={(e) => {
              e.preventDefault()
              document.getElementById('inhalt')?.focus()
            }}
          >
            Zum Inhalt springen
          </a>
          <AmbientBackground />
          <Header />
          <Routed />
          <Footer />
          <TabBar />
          <MenuSheet />
          <CommandPalette />
          <ResultProposalBar />
          <Toasts />
        </HashRouter>
        </LiveProvider>
      </StoreProvider>
    </MotionConfig>
  )
}
