import React, { useState } from 'react'
import s from './App.module.css'
import { analyzeDocket } from './api'
import SplashScreen from './components/SplashScreen'
import IntroScreen  from './components/IntroScreen'
import TopBar       from './components/TopBar'
import LeftPanel    from './components/LeftPanel'
import NetworkGraph from './components/NetworkGraph'
import RightPanel   from './components/RightPanel'
import ScanBar      from './components/ScanBar'

// Only real dockets with known comment activity on Regulations.gov
const REAL_DOCKETS = [
  { id: 'EPA-HQ-OAR-2021-0317', agency: 'Environmental Protection Agency',       title: 'Oil & Gas Methane Rule' },
  { id: 'CFPB-2023-0047',        agency: 'Consumer Financial Protection Bureau', title: 'Medical Debt Credit Reporting' },
  { id: 'FWS-HQ-ES-2018-0007',   agency: 'U.S. Fish & Wildlife Service',         title: 'Endangered Species Listing Policy' },
]

export default function App() {
  const [screen,       setScreen]       = useState('splash') // splash | intro | app
  const [status,       setStatus]       = useState('idle')
  const [result,       setResult]       = useState(null)
  const [error,        setError]        = useState(null)
  const [activeDocket, setActiveDocket] = useState(null)
  const [selCluster,   setSelCluster]   = useState(null)
  const [scanPct,      setScanPct]      = useState(0)
  const [activeNav,    setActiveNav]    = useState('NARRATION') // NARRATION | CLUSTERS | EVIDENCE
  const [dockets,      setDockets]      = useState(
    REAL_DOCKETS.map(d => ({ ...d, status: 'clean' }))
  )

  async function runAnalysis(docketId) {
    const target = dockets.find(d => d.id === docketId)
    if (!target) return
    setActiveDocket(target)
    setStatus('scanning')
    setResult(null)
    setError(null)
    setSelCluster(null)
    setActiveNav('NARRATION')
    setScanPct(0)

    const ticker = setInterval(() => setScanPct(p => Math.min(p + 2, 88)), 400)

    try {
      const data = await analyzeDocket({ docketId, maxComments: 100, threshold: 0.82 })
      clearInterval(ticker)
      setScanPct(100)
      setResult(data)
      setStatus('done')
      if (data.clusters?.length > 0) setSelCluster(data.clusters[0])
      setDockets(prev => prev.map(d =>
        d.id === docketId
          ? { ...d, status: data.flagged_count > 0 ? 'flagged' : 'clean' }
          : d
      ))
    } catch (e) {
      clearInterval(ticker)
      setScanPct(0)
      setError(e.message)
      setStatus('error')
    }
  }

  function addCustomDocket(id, agency, title) {
    const trimmed = id.trim().toUpperCase()
    if (!trimmed || dockets.find(d => d.id === trimmed)) return
    setDockets(prev => [...prev, { id: trimmed, agency: agency || 'Custom', title: title || trimmed, status: 'clean' }])
  }

  function handleNavChange(nav) {
    setActiveNav(nav)
    // EVIDENCE tab auto-selects first cluster if none selected
    if (nav === 'EVIDENCE' && result?.clusters?.length > 0 && !selCluster) {
      setSelCluster(result.clusters[0])
    }
    // CLUSTERS tab auto-selects first cluster too
    if (nav === 'CLUSTERS' && result?.clusters?.length > 0 && !selCluster) {
      setSelCluster(result.clusters[0])
    }
  }

  const flaggedCount = dockets.filter(d => d.status === 'flagged').length
  const cleanCount   = dockets.filter(d => d.status === 'clean').length

  return (
    <div className={s.shell}>
      {screen === 'splash' && <SplashScreen onDone={() => setScreen('intro')} />}
      {screen === 'intro'  && <IntroScreen  onEnter={() => setScreen('app')} />}

      <TopBar
        activeNav={activeNav}
        onNav={handleNavChange}
        onAbout={() => setScreen('intro')}
        hasResult={!!result}
      />

      <div className={s.body}>
        <LeftPanel
          dockets={dockets}
          activeDocket={activeDocket}
          onSelect={d => runAnalysis(d.id)}
          onAddCustom={addCustomDocket}
          flaggedCount={flaggedCount}
          cleanCount={cleanCount}
        />

        <div className={s.center}>
          <NetworkGraph
            status={status}
            result={result}
            selCluster={selCluster}
            onSelectCluster={c => { setSelCluster(c); setActiveNav('EVIDENCE') }}
            activeDocket={activeDocket}
            activeNav={activeNav}
          />
        </div>

        <RightPanel
          result={result}
          status={status}
          error={error}
          activeDocket={activeDocket}
          selCluster={selCluster}
          onSelectCluster={c => { setSelCluster(c); setActiveNav('EVIDENCE') }}
          activeNav={activeNav}
        />
      </div>

      <ScanBar status={status} pct={scanPct} activeDocket={activeDocket} result={result} />
    </div>
  )
}
