import React, { useState } from 'react'
import s from './RightPanel.module.css'

export default function RightPanel({ result, status, error, activeDocket, selCluster, onSelectCluster, activeNav }) {
  const [showAllComments, setShowAllComments] = useState(false)

  // Shared derived values
  const details = result ? [
    ['docket',               result.docket_id],
    ['agency',               activeDocket?.agency || '—'],
    ['title',                activeDocket?.title  || '—'],
    ['comments_total',       result.total_fetched],
    ['clusters_found',       result.clusters.length],
    ['largest_cluster',      result.clusters[0]?.size ?? 0],
    ['similarity_threshold', result.threshold_used?.toFixed(2)],
    ['confidence',           result.flagged_count > 0 ? 'HIGH' : 'MEDIUM'],
    ['status',               result.flagged_count > 0
      ? 'pattern flagged –\nnot proof of coordination'
      : 'no coordination pattern\ndetected'],
    ['source',               'regulations.gov [LIVE]'],
    ['last_sync',            `${result.elapsed_seconds}s ago`],
  ] : []

  const inlineMembers  = selCluster?.members?.filter(
    m => m.text?.trim().length > 20 && !m.text.toLowerCase().includes('see attached')
  ) ?? []
  const hasInlineText  = inlineMembers.length > 0
  const sampleText     = selCluster?.template || inlineMembers[0]?.text?.slice(0, 140) || null
  const allTextMembers = selCluster?.members?.filter(m => m.text?.trim().length > 5) ?? []
  const clusterIdx     = result?.clusters?.findIndex(c => c.cluster_id === selCluster?.cluster_id) ?? 0

  // ── Idle / scanning / error — same for all tabs ──
  if (!result) {
    return (
      <aside className={s.panel}>
        <div className={s.section}>
          <div className={s.sectionTitle}>DOCKET DETAILS</div>
          {status === 'idle'     && <p className={s.placeholder}>Select a docket from the left panel to begin scanning.</p>}
          {status === 'scanning' && <div className={s.scanning}>{[0,1,2,3].map(i => <div key={i} className={s.scanLine} style={{ animationDelay: `${i*0.15}s`, width: `${70+i*8}%` }}/>)}</div>}
          {status === 'error'    && <p className={s.errorMsg}>⚠ {error}</p>}
        </div>
      </aside>
    )
  }

  // ────────────────────────────────────────────────
  // NARRATION TAB — plain-English summary
  // ────────────────────────────────────────────────
  if (activeNav === 'NARRATION') {
    const clusteredCount = result.clusters.reduce((s, c) => s + c.size, 0)
    const biggest = result.clusters[0]

    const lines = []
    lines.push(
      `${spell(result.total_fetched)} comment${result.total_fetched !== 1 ? 's' : ''} were submitted to docket ${result.docket_id}. ` +
      `${result.total_analyzed} contained inline text and were analysed.`
    )
    if (result.clusters.length === 0) {
      lines.push('No coordination patterns were detected. The comments in this docket appear to be independently written.')
    } else if (result.flagged_count > 0 && biggest) {
      lines.push(
        `${spell(clusteredCount)} of those comments share a common template — the same core sentences with minor wording variations. ` +
        `The largest group: ${biggest.size} comments with ${(biggest.avg_similarity * 100).toFixed(0)}% average similarity.`
      )
      lines.push(
        `These groups were also submitted in unusually tight bursts — ` +
        `a pattern organic independent commenters don't typically produce.`
      )
      lines.push('Both signals — text similarity AND timing — fired on the same groups. This is a potential coordination signal.')
    } else {
      lines.push(
        `${spell(clusteredCount)} comments share similar language, but their submission timing did not confirm a coordinated burst. ` +
        `This may be an organised form-letter campaign or coincidental topical similarity.`
      )
    }

    return (
      <aside className={s.panel}>
        <div className={s.section}>
          <div className={s.sectionTitle}>DOCKET DETAILS</div>
          {details.map(([k, v]) => (
            <div key={k} className={s.detailRow}>
              <span className={s.detailKey}>&gt; {k}:</span>
              <span className={[
                s.detailVal,
                (k === 'status' || k === 'confidence') && result.flagged_count > 0 ? s.detailFlagged : '',
              ].join(' ')}>{String(v)}</span>
            </div>
          ))}
        </div>

        <div className={s.section}>
          <div className={s.sectionTitle}>NARRATION</div>
          <div className={s.narration}>
            <div className={s.narrationId}>
              I AM DOCKET {result.docket_id}. I FLOW WITH VOICES. I REMEMBER EACH ONE.
            </div>
            {lines.map((line, i) => (
              <p key={i} className={s.narrationLine}>{line}</p>
            ))}
            <span className={s.narrationDash}>—</span>
          </div>
        </div>

        {result.flagged_count > 0 && <DualSignalCallout result={result} s={s} />}

        <Disclaimer s={s} />
      </aside>
    )
  }

  // ────────────────────────────────────────────────
  // CLUSTERS TAB — full cluster breakdown
  // ────────────────────────────────────────────────
  if (activeNav === 'CLUSTERS') {
    return (
      <aside className={s.panel}>
        <div className={s.section}>
          <div className={s.sectionTitle}>
            ALL CLUSTERS — {result.clusters.length} FOUND
          </div>
          {result.clusters.length === 0 ? (
            <p className={s.placeholder}>No coordination clusters detected in this docket.</p>
          ) : (
            result.clusters.map((c, i) => {
              const isSel     = selCluster?.cluster_id === c.cluster_id
              const mins      = c.timing_suspicious ? Math.round(c.timing_score * 9) + ' min' : '—'
              const dual      = c.timing_suspicious
              return (
                <div
                  key={c.cluster_id}
                  className={[s.clusterCard, isSel ? s.clusterCardActive : '', dual ? s.clusterCardFlagged : ''].join(' ')}
                  onClick={() => onSelectCluster(c)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && onSelectCluster(c)}
                >
                  <div className={s.clusterCardHeader}>
                    <span className={s.clusterNum}>CLUSTER {i + 1}</span>
                    {dual && <span className={s.clusterDualBadge}>⚡ DUAL-SIGNAL</span>}
                  </div>
                  <div className={s.clusterCardStats}>
                    <span className={s.clusterStat}><span className={s.clusterStatLabel}>SIZE</span><span className={s.clusterStatVal}>{c.size}</span></span>
                    <span className={s.clusterStat}><span className={s.clusterStatLabel}>SIMILARITY</span><span className={s.clusterStatVal + (isSel ? ' ' + s.tdHl : '')}>{c.avg_similarity.toFixed(2)}</span></span>
                    <span className={s.clusterStat}><span className={s.clusterStatLabel}>WINDOW</span><span className={s.clusterStatVal + (dual ? ' ' + s.tdAmber : '')}>{mins}</span></span>
                  </div>
                  {c.template && (
                    <p className={s.clusterTemplate}>"{c.template.slice(0, 80)}…"</p>
                  )}
                  <span className={s.clusterArrow}>Click to inspect evidence →</span>
                </div>
              )
            })
          )}
        </div>

        {result.flagged_count > 0 && <DualSignalCallout result={result} s={s} />}
        <Disclaimer s={s} />
      </aside>
    )
  }

  // ────────────────────────────────────────────────
  // EVIDENCE TAB — deep dive into selected cluster
  // ────────────────────────────────────────────────
  if (activeNav === 'EVIDENCE') {
    if (!selCluster) {
      return (
        <aside className={s.panel}>
          <div className={s.section}>
            <div className={s.sectionTitle}>EVIDENCE</div>
            <p className={s.placeholder}>
              Click a cluster in the graph or the CLUSTERS tab to inspect its evidence.
            </p>
            {result.clusters.length > 0 && (
              <div className={s.quickPick}>
                <p className={s.quickPickLabel}>QUICK SELECT:</p>
                {result.clusters.slice(0, 3).map((c, i) => (
                  <button key={c.cluster_id} className={s.quickPickBtn} onClick={() => onSelectCluster(c)}>
                    Cluster {i + 1} — {c.size} comments, {(c.avg_similarity * 100).toFixed(0)}% similar
                    {c.timing_suspicious ? ' ⚡' : ''}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Disclaimer s={s} />
        </aside>
      )
    }

    return (
      <aside className={s.panel}>
        {/* Cluster selector */}
        {result.clusters.length > 1 && (
          <div className={s.clusterSwitcher}>
            {result.clusters.map((c, i) => (
              <button
                key={c.cluster_id}
                className={[s.switchBtn, selCluster.cluster_id === c.cluster_id ? s.switchBtnActive : ''].join(' ')}
                onClick={() => onSelectCluster(c)}
              >
                C{i + 1} {c.timing_suspicious ? '⚡' : ''}
              </button>
            ))}
          </div>
        )}

        <div className={s.section}>
          <div className={s.sectionTitle}>
            EVIDENCE — CLUSTER {clusterIdx + 1}
            {selCluster.timing_suspicious && <span className={s.dualBadgeInline}> ⚡ DUAL-SIGNAL</span>}
          </div>

          {/* Signal indicators */}
          <div className={s.evidenceSignals}>
            <div className={s.evidenceSig + ' ' + s.evidenceSigActive}>
              <span className={s.sigDot} style={{ background: 'var(--cyan)' }}/>
              <div>
                <span className={s.sigName}>Text similarity: </span>
                <span className={s.sigValCyan}>{(selCluster.avg_similarity * 100).toFixed(0)}%</span>
                <p className={s.sigNote}>Comments share a common linguistic template</p>
              </div>
            </div>
            <div className={[s.evidenceSig, selCluster.timing_suspicious ? s.evidenceSigFlagged : s.evidenceSigOff].join(' ')}>
              <span className={s.sigDot} style={{ background: selCluster.timing_suspicious ? 'var(--gold)' : 'var(--text4)' }}/>
              <div>
                <span className={s.sigName}>Timing burst: </span>
                <span className={selCluster.timing_suspicious ? s.sigValGold : s.sigValOff}>
                  {selCluster.timing_suspicious
                    ? `${Math.round(selCluster.timing_score * 100)}% in window`
                    : 'not triggered'}
                </span>
                <p className={s.sigNote}>{selCluster.timing_note || (selCluster.timing_suspicious ? 'Submissions in tight burst' : 'Spread across wider timeframe')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Template */}
        {selCluster.template && (
          <div className={s.section}>
            <div className={s.sectionTitle}>COMMON TEMPLATE LANGUAGE</div>
            <div className={s.sampleBox}>
              <p className={s.sampleText}>"{selCluster.template}"</p>
            </div>
          </div>
        )}

        {/* Comments */}
        <div className={s.section}>
          <div className={s.sectionTitle}>
            ORIGINAL COMMENTS ({selCluster.size})
          </div>
          <p className={s.evidenceCaveat}>
            Verify the findings yourself — read the original submissions below.
          </p>

          {!hasInlineText ? (
            <div className={s.attachmentNotice}>
              <span className={s.attachIcon}>📎</span>
              <div>
                <p className={s.attachTitle}>Submitted as file attachments</p>
                <p className={s.attachBody}>
                  {selCluster.size} comments were PDF/Word attachments.
                  View originals at{' '}
                  <a href={`https://www.regulations.gov/docket/${result?.docket_id}`}
                    target="_blank" rel="noreferrer">regulations.gov</a>.
                </p>
              </div>
            </div>
          ) : (
            <>
              <button className={s.viewBtn} onClick={() => setShowAllComments(v => !v)}>
                {showAllComments ? 'HIDE COMMENTS ↑' : `SHOW ALL ${allTextMembers.length} COMMENTS ↓`}
              </button>
              {(showAllComments ? allTextMembers : allTextMembers.slice(0, 3)).map((m, i) => (
                <div key={m.id} className={s.comment}>
                  <span className={s.commentNum}>#{i + 1}</span>
                  <div className={s.commentBody}>
                    {m.authorName?.trim() && <span className={s.commentAuthor}>{m.authorName.trim()}</span>}
                    <span className={s.commentText}>{m.text.slice(0, 200)}{m.text.length > 200 ? '…' : ''}</span>
                    {m.submittedAt && <span className={s.commentDate}>{fmt(m.submittedAt)}</span>}
                  </div>
                </div>
              ))}
              {!showAllComments && allTextMembers.length > 3 && (
                <button className={s.viewBtn} onClick={() => setShowAllComments(true)}>
                  + {allTextMembers.length - 3} more comments →
                </button>
              )}
            </>
          )}
        </div>

        <Disclaimer s={s} />
      </aside>
    )
  }

  return null
}

// ── Shared sub-components ──────────────────────────

function DualSignalCallout({ result, s }) {
  return (
    <div className={s.dualSignal}>
      <div className={s.dualSignalHeader}>
        <span className={s.dualIcon}>⚡</span>
        <span className={s.dualTitle}>DUAL-SIGNAL DETECTION ACTIVE</span>
      </div>
      <p className={s.dualBody}>
        Flagged clusters triggered <strong>both</strong> signals independently:
      </p>
      <div className={s.signals}>
        <div className={s.signal}>
          <span className={s.sigDot} style={{ background: 'var(--cyan)' }}/>
          <div>
            <span className={s.sigName}>Text similarity</span>
            <span className={s.sigNote}> — comments share a template above {result.threshold_used?.toFixed(2)}</span>
          </div>
        </div>
        <div className={s.signal}>
          <span className={s.sigDot} style={{ background: 'var(--gold)' }}/>
          <div>
            <span className={s.sigName}>Timing burst</span>
            <span className={s.sigNote}> — submissions within an unnaturally tight window</span>
          </div>
        </div>
      </div>
      <p className={s.dualNote}>
        Requiring both signals reduces false positives from merely topically similar comments.
      </p>
    </div>
  )
}

function Disclaimer({ s }) {
  return (
    <div className={s.disclaimer}>
      ⚠ Statistical coordination signal only — not evidence of fraud or wrongdoing by any individual or organisation. For research purposes only.
    </div>
  )
}

function spell(n) {
  const w = ['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten']
  return n < w.length ? w[n] : n.toLocaleString()
}

function fmt(iso) {
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return iso }
}
