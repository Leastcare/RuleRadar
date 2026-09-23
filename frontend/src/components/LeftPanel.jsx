import React, { useState } from 'react'
import s from './LeftPanel.module.css'

export default function LeftPanel({ dockets, activeDocket, onSelect, onAddCustom, flaggedCount, cleanCount }) {
  const [search,        setSearch]        = useState('')
  const [showCustom,    setShowCustom]    = useState(false)
  const [customId,      setCustomId]      = useState('')
  const [showThreshold, setShowThreshold] = useState(false)

  const filtered = dockets.filter(d =>
    d.id.toLowerCase().includes(search.toLowerCase()) ||
    d.agency.toLowerCase().includes(search.toLowerCase()) ||
    d.title.toLowerCase().includes(search.toLowerCase())
  )

  function handleAdd(e) {
    e.preventDefault()
    if (!customId.trim()) return
    onAddCustom(customId.trim(), '', '')
    setCustomId('')
    setShowCustom(false)
  }

  return (
    <aside className={s.panel}>
      <div className={s.header}>
        <span className={s.headerTitle}>MONITORED DOCKETS</span>
        <span className={s.count}>({dockets.length})</span>
      </div>

      <div className={s.searchWrap}>
        <span className={s.searchIcon}>⌕</span>
        <input
          className={s.search}
          placeholder="Search dockets..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className={s.list}>
        {filtered.map(d => (
          <button
            key={d.id}
            className={[
              s.item,
              activeDocket?.id === d.id ? s.itemActive : '',
              d.status === 'flagged' ? s.itemFlagged : '',
            ].join(' ')}
            onClick={() => onSelect(d)}
            title={`${d.agency} — ${d.title}. Click to scan.`}
          >
            <span className={s.dot + ' ' + (d.status === 'flagged' ? s.dotFlagged : s.dotClean)}/>
            <span className={s.itemId}>{d.id}</span>
            {d.status === 'flagged'
              ? <span className={s.flagBadge}>⚠ FLAGGED</span>
              : <span className={s.cleanBadge}>Clean</span>
            }
            <span className={s.arrow}>›</span>
          </button>
        ))}
      </div>

      {/* Add custom docket */}
      <div className={s.customSection}>
        <button className={s.customToggle} onClick={() => setShowCustom(v => !v)}>
          {showCustom ? '▲ Cancel' : '+ Add custom docket ID'}
        </button>
        {showCustom && (
          <form className={s.customForm} onSubmit={handleAdd}>
            <input
              className={s.customInput}
              placeholder="e.g. EPA-HQ-OAR-2026-0100"
              value={customId}
              onChange={e => setCustomId(e.target.value)}
              autoFocus
            />
            <button type="submit" className={s.customBtn} disabled={!customId.trim()}>
              ADD →
            </button>
            <p className={s.customHint}>
              Find docket IDs at{' '}
              <a href="https://www.regulations.gov/search" target="_blank" rel="noreferrer">
                regulations.gov
              </a>
            </p>
          </form>
        )}
      </div>

      {/* Threshold tooltip */}
      <div className={s.thresholdSection}>
        <button className={s.thresholdToggle} onClick={() => setShowThreshold(v => !v)}>
          ⚙ Detection settings {showThreshold ? '▲' : '▼'}
        </button>
        {showThreshold && (
          <div className={s.thresholdBox}>
            <div className={s.thresholdRow}>
              <span className={s.thresholdLabel}>Similarity threshold</span>
              <span className={s.thresholdVal}>0.82</span>
            </div>
            <p className={s.thresholdExplain}>
              Two comments are grouped together when their text is at least <strong>82% similar</strong>.
              Higher = stricter (fewer but more certain matches).
              Lower = broader (more matches, more false positives).
            </p>
            <div className={s.thresholdRow} style={{ marginTop: '0.5rem' }}>
              <span className={s.thresholdLabel}>Timing window</span>
              <span className={s.thresholdVal}>5 min</span>
            </div>
            <p className={s.thresholdExplain}>
              If 60%+ of a cluster's comments were submitted within any 5-minute window, the timing signal fires.
              Organic independent writers don't typically all comment within minutes of each other.
            </p>
            <p className={s.thresholdNote}>
              Both signals must agree to flag a cluster — reducing false positives from comments that are merely topically similar.
            </p>
          </div>
        )}
      </div>

      <div className={s.stats}>
        <div className={s.stat}>
          <span className={s.statLabel}>TOTAL DOCKETS MONITORED</span>
          <span className={s.statVal}>{dockets.length}</span>
        </div>
        <div className={s.stat}>
          <span className={s.statLabel}>FLAGGED</span>
          <span className={s.statVal + ' ' + s.statFlagged}>{flaggedCount}</span>
        </div>
        <div className={s.stat}>
          <span className={s.statLabel}>CLEAN</span>
          <span className={s.statVal + ' ' + s.statClean}>{cleanCount}</span>
        </div>
      </div>

      <div className={s.footer}>
        <span className={s.footerDot}/>
        <span className={s.footerText}>SYSTEM OPERATIONAL</span>
        <span className={s.version}>v1.2.3</span>
      </div>
    </aside>
  )
}
