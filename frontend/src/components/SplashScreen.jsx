import React, { useEffect, useState } from 'react'
import s from './SplashScreen.module.css'

const BOOT_LINES = [
  'INITIALIZING RULERADAR v1.2.3...',
  'CONNECTING TO REGULATIONS.GOV API...',
  'LOADING SIMILARITY ENGINE...',
  'CALIBRATING DETECTION THRESHOLD: 0.82',
  'LOADING DOCKET REGISTRY...',
  'SYSTEM CHECK: ALL MODULES OPERATIONAL',
  'READY.',
]

export default function SplashScreen({ onDone }) {
  const [lines,    setLines]    = useState([])
  const [barPct,   setBarPct]   = useState(0)
  const [phase,    setPhase]    = useState('boot')  // boot | logo | fade
  const [dotCount, setDotCount] = useState(0)

  // Typing out boot lines
  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      if (i < BOOT_LINES.length) {
        setLines(prev => [...prev, BOOT_LINES[i]])
        setBarPct(Math.round(((i + 1) / BOOT_LINES.length) * 100))
        i++
      } else {
        clearInterval(interval)
        setTimeout(() => setPhase('logo'), 400)
        setTimeout(() => setPhase('fade'), 2200)
        setTimeout(() => onDone(), 2900)
      }
    }, 280)
    return () => clearInterval(interval)
  }, [])

  // Animated dots
  useEffect(() => {
    const t = setInterval(() => setDotCount(d => (d + 1) % 4), 400)
    return () => clearInterval(t)
  }, [])

  return (
    <div className={s.splash + (phase === 'fade' ? ' ' + s.fadeOut : '')}>
      {/* Background law icons */}
      <div className={s.bgIcons}>
        <span className={s.icon} style={{ top: '8%',  left: '6%',  fontSize: '5rem',  animationDelay: '0s'   }}>⚖</span>
        <span className={s.icon} style={{ top: '15%', right: '8%', fontSize: '3.5rem',animationDelay: '0.4s' }}>📜</span>
        <span className={s.icon} style={{ top: '55%', left: '4%',  fontSize: '4rem',  animationDelay: '0.8s' }}>🏛</span>
        <span className={s.icon} style={{ top: '70%', right: '6%', fontSize: '4.5rem',animationDelay: '0.2s' }}>⚖</span>
        <span className={s.icon} style={{ top: '40%', left: '2%',  fontSize: '2.5rem',animationDelay: '1.2s' }}>📋</span>
        <span className={s.icon} style={{ top: '30%', right: '3%', fontSize: '3rem',  animationDelay: '0.6s' }}>🔍</span>
        <span className={s.icon} style={{ bottom:'10%',left: '10%',fontSize: '3.5rem',animationDelay: '1s'   }}>📑</span>
        <span className={s.icon} style={{ bottom:'8%', right:'12%',fontSize: '2.8rem',animationDelay: '1.4s' }}>🏛</span>
      </div>

      {/* Scanning grid lines */}
      <div className={s.grid}/>

      {/* Center content */}
      <div className={s.center}>
        {/* Logo */}
        <div className={s.logoWrap}>
          <svg viewBox="0 0 60 60" width="64" height="64" fill="none" className={s.logoSvg}>
            <circle cx="30" cy="30" r="28" stroke="#00d4ff" strokeWidth="1.5" strokeDasharray="4 3"
              className={s.rotateSlow}/>
            <circle cx="30" cy="30" r="20" stroke="#00d4ff" strokeWidth="1" opacity="0.4"/>
            <line x1="30" y1="6"  x2="30" y2="54" stroke="#00d4ff" strokeWidth="1.2"/>
            <line x1="6"  y1="30" x2="54" y2="30" stroke="#00d4ff" strokeWidth="1.2"/>
            <path d="M30 12 L12 30 H48 Z" fill="#00d4ff" opacity="0.15"/>
            <path d="M30 48 L12 30 H48 Z" fill="#00d4ff" opacity="0.08"/>
            <circle cx="30" cy="30" r="4" fill="#00d4ff" className={s.pulseDot}/>
          </svg>

          <div className={s.logoText}>
            <span className={s.logoTitle}>RULE<span className={s.logoAccent}>RADAR</span></span>
            <span className={s.logoSub}>FEDERAL COMMENT COORDINATION DETECTOR</span>
          </div>
        </div>

        {/* Boot terminal */}
        <div className={s.terminal}>
          {lines.map((line, i) => (
            <div key={i} className={s.termLine}>
              <span className={s.prompt}>&gt;</span>
              <span className={s.termText + (i === lines.length - 1 ? ' ' + s.termActive : '')}>{line}</span>
              {i === lines.length - 1 && phase === 'boot' && (
                <span className={s.cursor}>{'_'.slice(0, dotCount % 2 + 1)}</span>
              )}
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className={s.progressWrap}>
          <div className={s.progressTrack}>
            <div className={s.progressFill} style={{ width: `${barPct}%` }}/>
          </div>
          <span className={s.progressPct}>{barPct}%</span>
        </div>

        {/* Tagline — shows after boot */}
        {phase !== 'boot' && (
          <p className={s.tagline}>
            Every voice has a record. Some voices share one.
          </p>
        )}
      </div>

      {/* Bottom bar */}
      <div className={s.bottomBar}>
        <span>LEXHACK 2026</span>
        <span className={s.dot2}>·</span>
        <span>DIGITAL RIGHTS &amp; POLICY TECH</span>
        <span className={s.dot2}>·</span>
        <span>DATA: REGULATIONS.GOV</span>
      </div>
    </div>
  )
}
