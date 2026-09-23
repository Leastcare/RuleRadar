import React, { useState, useEffect } from 'react'
import s from './TopBar.module.css'

const NAV = ['NARRATION', 'CLUSTERS', 'EVIDENCE']

export default function TopBar({ activeNav, onNav, onAbout, hasResult }) {
  const [time, setTime] = useState(getUTC())
  useEffect(() => {
    const t = setInterval(() => setTime(getUTC()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <header className={s.bar}>
      <div className={s.left}>
        <div className={s.logoIcon}>
          <svg viewBox="0 0 28 28" width="24" height="24" fill="none">
            <rect x="1" y="1" width="26" height="26" rx="2" stroke="var(--cyan)" strokeWidth="1.2"/>
            <circle cx="14" cy="14" r="6" stroke="var(--cyan)" strokeWidth="1.2"/>
            <circle cx="14" cy="14" r="2" fill="var(--cyan)"/>
            <line x1="14" y1="1" x2="14" y2="8" stroke="var(--cyan)" strokeWidth="1"/>
            <line x1="14" y1="20" x2="14" y2="27" stroke="var(--cyan)" strokeWidth="1"/>
            <line x1="1" y1="14" x2="8" y2="14" stroke="var(--cyan)" strokeWidth="1"/>
            <line x1="20" y1="14" x2="27" y2="14" stroke="var(--cyan)" strokeWidth="1"/>
          </svg>
        </div>
        <div className={s.logoText}>
          <span className={s.title}>NOTICE &amp; COMMENT AUDIT</span>
          <span className={s.sub}>MONITOR / ANALYZE / DETECT / PROMOTE TRANSPARENCY</span>
        </div>
      </div>

      {/* Nav tabs — only show when there's a result */}
      <nav className={s.nav}>
        {NAV.map(n => (
          <button
            key={n}
            className={[s.navBtn, activeNav === n ? s.navActive : '', !hasResult ? s.navDisabled : ''].join(' ')}
            onClick={() => hasResult && onNav(n)}
            title={!hasResult ? 'Run a scan first' : undefined}
          >
            {n}
          </button>
        ))}
      </nav>

      <div className={s.center}>
        <span className={s.tagline}>PUBLIC INPUT. REAL INSIGHTS.</span>
        <span className={s.tagline2}>A FAIRER TOMORROW.</span>
      </div>

      <div className={s.right}>
        <button className={s.aboutBtn} onClick={onAbout} title="What is RuleRadar?">
          ? ABOUT
        </button>
        <span className={s.clock}>{time} UTC</span>
        <div className={s.live}>
          <span className={s.liveDot}/>
          <span className={s.liveText}>LIVE FEED</span>
        </div>
      </div>
    </header>
  )
}

function getUTC() {
  return new Date().toUTCString().slice(17, 25)
}
