import React from 'react'
import s from './ScanBar.module.css'

export default function ScanBar({ status, pct, activeDocket, result }) {
  const stats = result ? [
    { label: 'COMMENTS PARSED',   value: `${result.total_fetched} / ${result.total_fetched}`, done: true },
    { label: 'SIMILARITY INDEX',  value: 'COMPLETE', done: true },
    { label: 'CLUSTERING',        value: 'COMPLETE', done: true },
    { label: 'ANOMALY SCAN',      value: 'COMPLETE', done: true },
  ] : [
    { label: 'COMMENTS PARSED',   value: status === 'scanning' ? `${Math.floor(pct * 1.2)} / —` : '— / —', done: false },
    { label: 'SIMILARITY INDEX',  value: status === 'scanning' && pct > 50 ? 'RUNNING' : '—', done: false },
    { label: 'CLUSTERING',        value: status === 'scanning' && pct > 70 ? 'RUNNING' : '—', done: false },
    { label: 'ANOMALY SCAN',      value: status === 'scanning' && pct > 85 ? 'RUNNING' : '—', done: false },
  ]

  return (
    <div className={s.bar}>
      <div className={s.left}>
        <div className={s.progressLabel}>
          <span className={s.scanLabel}>SCAN PROGRESS</span>
          <span className={s.scanPct}>{status === 'done' ? 100 : status === 'scanning' ? pct : 0}%</span>
        </div>
        <div className={s.track}>
          <div
            className={s.fill + (status === 'scanning' ? ' ' + s.fillActive : '') + (status === 'done' ? ' ' + s.fillDone : '')}
            style={{ width: `${status === 'done' ? 100 : status === 'scanning' ? pct : 0}%` }}
          />
        </div>
        <p className={s.scanHint}>
          {status === 'scanning'
            ? `scanning docket for coordinated submission patterns...`
            : status === 'done'
            ? `scan complete — ${result?.flagged_count > 0 ? result.flagged_count + ' coordination signal(s) detected' : 'no coordination patterns detected'}`
            : 'select a docket to begin scanning'}
        </p>
      </div>

      <div className={s.right}>
        {stats.map(st => (
          <div key={st.label} className={s.stat}>
            <span className={s.statLabel}>{st.label}</span>
            <span className={s.statVal + (st.done ? ' ' + s.statDone : '')}>{st.value}</span>
          </div>
        ))}
      </div>

      <div className={s.footer}>
        <span>NOTICE &amp; COMMENT AUDIT</span>
        <span className={s.sep}>|</span>
        <span>OPEN GOVERNMENT. MEASURABLE.</span>
      </div>
    </div>
  )
}
